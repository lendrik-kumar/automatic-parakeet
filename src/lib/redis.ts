import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redis;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OTPData {
  otp: string;
  purpose: "registration" | "login" | "email_verification" | "password_reset";
  attempts: number;
}

interface PasswordResetData {
  token: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_OTP_ATTEMPTS = 5;

// ─── OTP Helpers ──────────────────────────────────────────────────────────────

/**
 * Get existing OTP data from Redis without consuming it.
 * Returns null if OTP doesn't exist or has expired.
 */
export const getOTP = async (identifier: string): Promise<OTPData | null> => {
  try {
    const key = `otp:${identifier}`;
    const raw = await redis.get(key);

    if (!raw) {
      return null;
    }

    const data: OTPData = JSON.parse(raw) as OTPData;

    // Check if attempts have been exceeded
    if (data.attempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[REDIS] Failed to get OTP:", error);
    return null;
  }
};

/**
 * Store an OTP in Redis with the structured JSON format.
 *
 * Key format:
 *   otp:phone:<phoneNumber>   (identifier = "phone:+91...")
 *   otp:email:<email>         (identifier = "email:user@...")
 */
export const storeOTP = async (
  identifier: string,
  otp: string,
  ttlMinutes: number = 5,
  purpose?: OTPData["purpose"],
): Promise<void> => {
  try {
    const key = `otp:${identifier}`;
    const determinedPurpose: OTPData["purpose"] =
      purpose ||
      (identifier.startsWith("email:")
        ? "email_verification"
        : identifier.startsWith("phone:")
          ? "registration"
          : "login");
    const data: OTPData = { otp, purpose: determinedPurpose, attempts: 0 };
    await redis.set(key, JSON.stringify(data), "EX", ttlMinutes * 60);
    console.log(
      `[REDIS] OTP stored for ${identifier} (purpose: ${determinedPurpose})`,
    );
  } catch (error) {
    console.error("[REDIS] Failed to store OTP:", error);
    throw error;
  }
};

/**
 * Verify an OTP. Increments attempt counter on failure.
 * Deletes the key when attempts exceed MAX_OTP_ATTEMPTS or OTP matches.
 */
export const verifyOTP = async (
  identifier: string,
  otp: string,
): Promise<boolean> => {
  try {
    const key = `otp:${identifier}`;
    const raw = await redis.get(key);

    if (!raw) {
      console.log(`[REDIS] OTP expired or not found for ${identifier}`);
      return false;
    }

    const data: OTPData = JSON.parse(raw) as OTPData;

    if (data.attempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(key);
      console.log(
        `[REDIS] OTP expired (max attempts reached) for ${identifier}`,
      );
      return false;
    }

    if (data.otp !== otp) {
      data.attempts += 1;

      if (data.attempts >= MAX_OTP_ATTEMPTS) {
        await redis.del(key);
        console.log(
          `[REDIS] OTP deleted — max attempts exceeded for ${identifier}`,
        );
      } else {
        // Preserve remaining TTL when updating attempt count
        const remainingTtl = await redis.ttl(key);
        const ttl = remainingTtl > 0 ? remainingTtl : 300;
        await redis.set(key, JSON.stringify(data), "EX", ttl);
      }
      return false;
    }

    // Correct OTP — consume it
    await redis.del(key);
    console.log(`[REDIS] OTP verified for ${identifier}`);
    return true;
  } catch (error) {
    console.error("[REDIS] Failed to verify OTP:", error);
    return false;
  }
};

/** Delete an OTP entry unconditionally (e.g. after successful verification). */
export const deleteOTP = async (identifier: string): Promise<void> => {
  try {
    const key = `otp:${identifier}`;
    await redis.del(key);
  } catch (error) {
    console.error("[REDIS] Failed to delete OTP:", error);
  }
};

// ─── Temporary Registration Session Helpers ───────────────────────────────────

/**
 * Store a temporary registration session.
 * Key format: session:registration:<sessionId>
 */
export const storeSession = async (
  sessionId: string,
  data: object,
  ttlSeconds: number,
): Promise<void> => {
  try {
    const key = `session:registration:${sessionId}`;
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    console.log(`[REDIS] Session created: ${sessionId}`);
  } catch (error) {
    console.error("[REDIS] Failed to store session:", error);
    throw error;
  }
};

/** Fetch a registration session by sessionId. Returns null if missing / expired. */
export const getSession = async (
  sessionId: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const key = `session:registration:${sessionId}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    console.log(`[REDIS] Session fetched: ${sessionId}`);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    console.error("[REDIS] Failed to get session:", error);
    return null;
  }
};

/** Update a registration session with partial data (merge updates). */
export const updateSession = async (
  sessionId: string,
  updates: Record<string, unknown>,
): Promise<void> => {
  try {
    const key = `session:registration:${sessionId}`;
    const raw = await redis.get(key);

    if (!raw) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const existingData = JSON.parse(raw) as Record<string, unknown>;
    const updatedData = { ...existingData, ...updates };

    // Preserve remaining TTL
    const remainingTtl = await redis.ttl(key);
    const ttl = remainingTtl > 0 ? remainingTtl : 1800; // Default 30 min if not set

    await redis.set(key, JSON.stringify(updatedData), "EX", ttl);
    console.log(`[REDIS] Session updated: ${sessionId}`);
  } catch (error) {
    console.error("[REDIS] Failed to update session:", error);
    throw error;
  }
};

/** Delete a registration session after use. */
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    const key = `session:registration:${sessionId}`;
    await redis.del(key);
  } catch (error) {
    console.error("[REDIS] Failed to delete session:", error);
  }
};

// ─── Identifier Reservation Helpers ───────────────────────────────────────

/**
 * Reserve a phone number for a registration session.
 * Key format: reserved:phone:<phoneNumber> → sessionId
 */
export const reservePhone = async (
  phoneNumber: string,
  sessionId: string,
  ttlMinutes: number = 30,
): Promise<void> => {
  try {
    const key = `reserved:phone:${phoneNumber}`;
    await redis.set(key, sessionId, "EX", ttlMinutes * 60);
    console.log(`[REDIS] Phone reserved for session: ${sessionId}`);
  } catch (error) {
    console.error("[REDIS] Failed to reserve phone:", error);
    throw error;
  }
};

/**
 * Reserve an email for a registration session.
 * Key format: reserved:email:<email> → sessionId
 */
export const reserveEmail = async (
  email: string,
  sessionId: string,
  ttlMinutes: number = 30,
): Promise<void> => {
  try {
    const key = `reserved:email:${email}`;
    await redis.set(key, sessionId, "EX", ttlMinutes * 60);
    console.log(`[REDIS] Email reserved for session: ${sessionId}`);
  } catch (error) {
    console.error("[REDIS] Failed to reserve email:", error);
    throw error;
  }
};

/**
 * Get phone reservation sessionId if reserved, null if available.
 */
export const getPhoneReservation = async (
  phoneNumber: string,
): Promise<string | null> => {
  try {
    const key = `reserved:phone:${phoneNumber}`;
    const sessionId = await redis.get(key);
    return sessionId;
  } catch (error) {
    console.error("[REDIS] Failed to get phone reservation:", error);
    return null;
  }
};

/**
 * Get email reservation sessionId if reserved, null if available.
 */
export const getEmailReservation = async (
  email: string,
): Promise<string | null> => {
  try {
    const key = `reserved:email:${email}`;
    const sessionId = await redis.get(key);
    return sessionId;
  } catch (error) {
    console.error("[REDIS] Failed to get email reservation:", error);
    return null;
  }
};

/**
 * Release phone reservation (delete the key).
 */
export const releasePhoneReservation = async (
  phoneNumber: string,
): Promise<void> => {
  try {
    const key = `reserved:phone:${phoneNumber}`;
    await redis.del(key);
    console.log(`[REDIS] Phone reservation released: ${phoneNumber}`);
  } catch (error) {
    console.error("[REDIS] Failed to release phone reservation:", error);
  }
};

/**
 * Release email reservation (delete the key).
 */
export const releaseEmailReservation = async (email: string): Promise<void> => {
  try {
    const key = `reserved:email:${email}`;
    await redis.del(key);
    console.log(`[REDIS] Email reservation released: ${email}`);
  } catch (error) {
    console.error("[REDIS] Failed to release email reservation:", error);
  }
};

// ─── Password Reset Token Helpers ─────────────────────────────────────────────

/**
 * Store a password reset token.
 * Key format: password-reset:<email>
 */
export const storePasswordResetToken = async (
  email: string,
  token: string,
  ttlMinutes: number = 60,
): Promise<void> => {
  try {
    const key = `password-reset:${email}`;
    const data: PasswordResetData = { token };
    await redis.set(key, JSON.stringify(data), "EX", ttlMinutes * 60);
    console.log(`[REDIS] Password reset token stored for ${email}`);
  } catch (error) {
    console.error("[REDIS] Failed to store password reset token:", error);
    throw error;
  }
};

/**
 * Verify a password reset token. Returns true only if it matches the stored token.
 */
export const verifyPasswordResetToken = async (
  email: string,
  token: string,
): Promise<boolean> => {
  try {
    const key = `password-reset:${email}`;
    const raw = await redis.get(key);
    if (!raw) return false;
    const data: PasswordResetData = JSON.parse(raw) as PasswordResetData;
    return data.token === token;
  } catch (error) {
    console.error("[REDIS] Failed to verify password reset token:", error);
    return false;
  }
};

/** Delete a password reset token after use. */
export const deletePasswordResetToken = async (
  email: string,
): Promise<void> => {
  try {
    const key = `password-reset:${email}`;
    await redis.del(key);
  } catch (error) {
    console.error("[REDIS] Failed to delete password reset token:", error);
  }
};
