import Redis from "ioredis";
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
// Helper functions for OTP management
export const storeOTP = async (identifier, otp, expiryMinutes = 10) => {
    const key = `otp:${identifier}`;
    await redis.setex(key, expiryMinutes * 60, otp);
};
export const verifyOTP = async (identifier, otp) => {
    const key = `otp:${identifier}`;
    const storedOTP = await redis.get(key);
    return storedOTP === otp;
};
export const deleteOTP = async (identifier) => {
    const key = `otp:${identifier}`;
    await redis.del(key);
};
// Helper functions for session management
export const storeSession = async (sessionId, data, expirySeconds) => {
    const key = `session:${sessionId}`;
    await redis.setex(key, expirySeconds, JSON.stringify(data));
};
export const getSession = async (sessionId) => {
    const key = `session:${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
};
export const deleteSession = async (sessionId) => {
    const key = `session:${sessionId}`;
    await redis.del(key);
};
// Helper function for password reset tokens
export const storePasswordResetToken = async (email, token, expiryMinutes = 60) => {
    const key = `password_reset:${email}`;
    await redis.setex(key, expiryMinutes * 60, token);
};
export const verifyPasswordResetToken = async (email, token) => {
    const key = `password_reset:${email}`;
    const storedToken = await redis.get(key);
    return storedToken === token;
};
export const deletePasswordResetToken = async (email) => {
    const key = `password_reset:${email}`;
    await redis.del(key);
};
