import rateLimit from "express-rate-limit";
// Rate limiter for authentication endpoints (more restrictive)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: "Too many authentication attempts, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiter for OTP endpoints (very restrictive)
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        success: false,
        message: "Too many OTP requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiter for password reset endpoints
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per windowMs
    message: {
        success: false,
        message: "Too many password reset attempts, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// General API rate limiter (less restrictive)
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Webhook rate limiter (moderate restrictions for legitimate webhooks)
export const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 webhook requests per windowMs
    message: {
        success: false,
        message: "Too many webhook requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for successful webhook verification
    skipSuccessfulRequests: true,
});
// Strict webhook rate limiter for failed verifications
export const webhookFailureLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Very strict limit for failed webhook attempts
    message: {
        success: false,
        message: "Too many failed webhook attempts, please check your configuration",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Apply only to failed requests
    skip: (req) => {
        // This will be evaluated after the webhook verification
        return req.webhookVerified === true;
    },
});
