/**
 * Secure Logger Utility
 *
 * Provides safe logging functions that automatically redact sensitive information
 * to prevent accidental exposure of secrets, signatures, tokens, and other sensitive data.
 */
// ─── Configuration ───────────────────────────────────────────────────────────
const SENSITIVE_KEYS = [
    "password",
    "secret",
    "token",
    "key",
    "signature",
    "authorization",
    "api_key",
    "apiKey",
    "auth",
    "credentials",
    "creditCard",
    "cvv",
    "ssn",
    "razorpaySignature",
    "razorpayKeySecret",
    "webhookSecret",
];
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
// ─── Helper Functions ────────────────────────────────────────────────────────
/**
 * Redact sensitive string values
 * Shows first 4 and last 4 characters only
 */
const redactString = (value) => {
    if (!value || value.length <= 8) {
        return "***";
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
};
/**
 * Check if a key name indicates sensitive data
 */
const isSensitiveKey = (key) => {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey));
};
/**
 * Recursively redact sensitive fields in objects
 */
const redactObject = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === "string") {
        return obj; // Don't redact standalone strings
    }
    if (Array.isArray(obj)) {
        return obj.map(redactObject);
    }
    if (typeof obj === "object") {
        const redacted = {};
        for (const [key, value] of Object.entries(obj)) {
            if (isSensitiveKey(key)) {
                redacted[key] = typeof value === "string" ? redactString(value) : "***";
            }
            else if (typeof value === "object" && value !== null) {
                redacted[key] = redactObject(value);
            }
            else {
                redacted[key] = value;
            }
        }
        return redacted;
    }
    return obj;
};
/**
 * Get timestamp for logs
 */
const getTimestamp = () => {
    return new Date().toISOString();
};
/**
 * Format log message with context
 */
const formatLogMessage = (level, context, message, data) => {
    const timestamp = getTimestamp();
    let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
    if (data !== undefined) {
        const redactedData = IS_PRODUCTION ? redactObject(data) : data;
        formattedMessage += ` ${JSON.stringify(redactedData, null, 2)}`;
    }
    return formattedMessage;
};
/**
 * Check if log level should be output
 */
const shouldLog = (level) => {
    const levels = ["debug", "info", "warn", "error"];
    const configLevelIndex = levels.indexOf(LOG_LEVEL);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= configLevelIndex;
};
// ─── Logger Class ────────────────────────────────────────────────────────────
/**
 * Secure logger that automatically redacts sensitive information
 *
 * @example
 * const logger = new SecureLogger('PaymentService');
 * logger.info('Payment created', { paymentId: '123', signature: 'abc123' });
 * // Output: [2024-03-25T10:00:00.000Z] [INFO] [PaymentService] Payment created { paymentId: '123', signature: 'abc1...3' }
 */
export class SecureLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    /**
     * Log debug information (development only)
     */
    debug(message, data) {
        if (shouldLog("debug")) {
            const formatted = formatLogMessage("debug", this.context, message, data);
            console.debug(formatted);
        }
    }
    /**
     * Log informational messages
     */
    info(message, data) {
        if (shouldLog("info")) {
            const formatted = formatLogMessage("info", this.context, message, data);
            console.log(formatted);
        }
    }
    /**
     * Log warnings
     */
    warn(message, data) {
        if (shouldLog("warn")) {
            const formatted = formatLogMessage("warn", this.context, message, data);
            console.warn(formatted);
        }
    }
    /**
     * Log errors
     */
    error(message, error) {
        if (shouldLog("error")) {
            const formatted = formatLogMessage("error", this.context, message, error);
            console.error(formatted);
        }
    }
    /**
     * Log with explicit sensitive data redaction
     */
    secure(level, message, data) {
        if (shouldLog(level)) {
            const redactedData = redactObject(data);
            const formatted = formatLogMessage(level, this.context, message, redactedData);
            switch (level) {
                case "debug":
                    console.debug(formatted);
                    break;
                case "info":
                    console.log(formatted);
                    break;
                case "warn":
                    console.warn(formatted);
                    break;
                case "error":
                    console.error(formatted);
                    break;
            }
        }
    }
}
// ─── Standalone Functions ────────────────────────────────────────────────────
/**
 * Redact sensitive value for logging
 * @param value - Value to redact
 * @returns Redacted value safe for logging
 */
export const redactSensitive = (value) => {
    if (!value)
        return "***";
    return redactString(value);
};
/**
 * Create a secure logger instance
 * @param context - Context/module name for the logger
 * @returns SecureLogger instance
 */
export const createLogger = (context) => {
    return new SecureLogger(context);
};
// ─── Export Default Instance ─────────────────────────────────────────────────
export default SecureLogger;
