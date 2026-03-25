/**
 * Webhook Event ID Tracking Service
 *
 * Prevents replay attacks and ensures idempotent webhook processing
 * Uses Redis to track processed webhook event IDs with TTL
 */
import redis from "../lib/redis.js";
import { createLogger } from "./secureLogger.js";
const logger = createLogger("WebhookEventTracker");
// ─── Constants ───────────────────────────────────────────────────────────────
const REDIS_KEY_PREFIX = "webhook:event:";
const EVENT_TTL_SECONDS = 24 * 60 * 60; // 24 hours (Razorpay retry window)
const CONCURRENT_PROCESSING_TTL = 30; // 30 seconds for concurrent request protection
// ─── Helper Functions ────────────────────────────────────────────────────────
/**
 * Generate Redis key for event tracking
 */
const getEventKey = (eventId) => {
    return `${REDIS_KEY_PREFIX}${eventId}`;
};
/**
 * Generate Redis key for processing lock
 */
const getProcessingKey = (eventId) => {
    return `${REDIS_KEY_PREFIX}processing:${eventId}`;
};
/**
 * Generate unique processing lock ID
 */
const generateLockId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
// ─── Event Tracking Functions ────────────────────────────────────────────────
/**
 * Check if webhook event has been processed before
 * @param eventId - Webhook event ID from payload
 * @returns Event tracking result
 */
export const checkEventStatus = async (eventId) => {
    try {
        if (!eventId || typeof eventId !== "string") {
            throw new Error("Invalid event ID provided");
        }
        const eventKey = getEventKey(eventId);
        const processingKey = getProcessingKey(eventId);
        // Check both processed events and currently processing events
        const [processedResult, processingResult] = await Promise.all([
            redis.get(eventKey),
            redis.get(processingKey),
        ]);
        const isProcessed = processedResult !== null;
        const isProcessing = processingResult !== null;
        logger.debug("Event status checked", {
            eventId,
            isProcessed,
            isProcessing,
        });
        return {
            isNewEvent: !isProcessed,
            isProcessing,
            eventId,
        };
    }
    catch (error) {
        logger.error("Error checking event status", { eventId, error });
        // In case of Redis error, assume new event to prevent blocking legitimate requests
        return {
            isNewEvent: true,
            isProcessing: false,
            eventId,
        };
    }
};
/**
 * Acquire processing lock for webhook event
 * Prevents concurrent processing of the same event
 * @param eventId - Webhook event ID
 * @returns Processing lock result
 */
export const acquireProcessingLock = async (eventId) => {
    try {
        const processingKey = getProcessingKey(eventId);
        const lockId = generateLockId();
        // Use SET with NX (only if not exists) and EX (expiration)
        const result = await redis.set(processingKey, lockId, "EX", CONCURRENT_PROCESSING_TTL, "NX");
        const locked = result === "OK";
        if (locked) {
            logger.debug("Processing lock acquired", { eventId, lockId });
        }
        else {
            logger.warn("Failed to acquire processing lock - concurrent processing", {
                eventId,
            });
        }
        return {
            locked,
            lockId: locked ? lockId : "",
        };
    }
    catch (error) {
        logger.error("Error acquiring processing lock", { eventId, error });
        return {
            locked: false,
            lockId: "",
        };
    }
};
/**
 * Release processing lock for webhook event
 * @param eventId - Webhook event ID
 * @param lockId - Lock ID from acquireProcessingLock
 */
export const releaseProcessingLock = async (eventId, lockId) => {
    try {
        if (!lockId) {
            return; // No lock to release
        }
        const processingKey = getProcessingKey(eventId);
        // Lua script to ensure we only delete our own lock
        const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
        const result = await redis.eval(luaScript, 1, processingKey, lockId);
        if (result === 1) {
            logger.debug("Processing lock released", { eventId, lockId });
        }
        else {
            logger.warn("Lock not released - may have expired or been taken by another process", {
                eventId,
                lockId,
            });
        }
    }
    catch (error) {
        logger.error("Error releasing processing lock", { eventId, lockId, error });
    }
};
/**
 * Mark webhook event as processed
 * Stores event ID with timestamp for audit purposes
 * @param eventId - Webhook event ID
 * @param metadata - Additional metadata to store
 */
export const markEventAsProcessed = async (eventId, metadata) => {
    try {
        const eventKey = getEventKey(eventId);
        const data = JSON.stringify({
            ...metadata,
            processedAt: new Date().toISOString(),
        });
        await redis.setex(eventKey, EVENT_TTL_SECONDS, data);
        logger.info("Event marked as processed", {
            eventId,
            event: metadata.event,
            status: metadata.status,
        });
    }
    catch (error) {
        logger.error("Error marking event as processed", { eventId, metadata, error });
    }
};
/**
 * Get event processing history (for debugging)
 * @param eventId - Webhook event ID
 * @returns Event metadata or null if not found
 */
export const getEventHistory = async (eventId) => {
    try {
        const eventKey = getEventKey(eventId);
        const data = await redis.get(eventKey);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    catch (error) {
        logger.error("Error getting event history", { eventId, error });
        return null;
    }
};
/**
 * Clean up expired event tracking keys (maintenance function)
 * Note: Redis automatically handles TTL, this is for manual cleanup if needed
 */
export const cleanupExpiredEvents = async () => {
    try {
        const pattern = `${REDIS_KEY_PREFIX}*`;
        const keys = await redis.keys(pattern);
        if (keys.length === 0) {
            return 0;
        }
        // Check TTL for each key and remove expired ones
        let cleanedCount = 0;
        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl === -1) {
                // Key exists but has no TTL - this shouldn't happen, clean it up
                await redis.del(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger.info("Cleaned up expired event tracking keys", {
                cleanedCount,
                totalKeys: keys.length,
            });
        }
        return cleanedCount;
    }
    catch (error) {
        logger.error("Error during event cleanup", { error });
        return 0;
    }
};
/**
 * Get webhook event processing statistics (for monitoring)
 */
export const getEventStats = async () => {
    try {
        const [trackedKeys, processingKeys] = await Promise.all([
            redis.keys(`${REDIS_KEY_PREFIX}*`),
            redis.keys(`${REDIS_KEY_PREFIX}processing:*`),
        ]);
        return {
            totalTrackedEvents: trackedKeys.length,
            processingEvents: processingKeys.length,
            completedEvents: trackedKeys.length - processingKeys.length,
        };
    }
    catch (error) {
        logger.error("Error getting event stats", { error });
        return {
            totalTrackedEvents: 0,
            processingEvents: 0,
            completedEvents: 0,
        };
    }
};
// ─── Export All Functions ────────────────────────────────────────────────────
export default {
    checkEventStatus,
    acquireProcessingLock,
    releaseProcessingLock,
    markEventAsProcessed,
    getEventHistory,
    cleanupExpiredEvents,
    getEventStats,
};
