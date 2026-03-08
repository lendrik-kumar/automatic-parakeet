/**
 * User Authentication Service
 *
 * All user-facing authentication business logic lives here.  Controllers call
 * these methods and map their return values into HTTP responses; they never
 * touch Prisma, Redis, Twilio, or SendGrid directly.
 *
 * Token strategy (Better Auth + jwt plugin pattern):
 *   • Access token  — short-lived JWT (15 min), signed with JWT_SECRET
 *   • Refresh token — opaque 64-byte hex string stored in UserSession table
 *     and rotated on every use (refresh token rotation prevents replay attacks)
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { JWT_SECRET, ACCESS_TOKEN_EXPIRY } from "../lib/auth.js";
import { storeOTP, verifyOTP, deleteOTP, storeSession, getSession, deleteSession, storePasswordResetToken, verifyPasswordResetToken, deletePasswordResetToken, } from "../lib/redis.js";
import { sendOTPViaSMS, sendLoginAlertSMS } from "../lib/sms.js";
import { sendEmailVerification, sendWelcomeEmail, sendLoginNotification, sendPasswordResetEmail, sendPasswordChangedNotification, } from "../lib/email.js";
import { userRepository } from "../repositories/user.repository.js";
import { userSessionRepository } from "../repositories/user-session.repository.js";
// ─── Token Helpers ────────────────────────────────────────────────────────────
/** Sign a short-lived JWT access token for a user (15 min). */
const signAccessToken = (userId, email) => jwt.sign({ id: userId, email, type: "user" }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
/** Generate an opaque, cryptographically random refresh token. */
const newRefreshToken = () => crypto.randomBytes(64).toString("hex");
/** Extract device/IP from an Express-like request object. */
export const extractRequestInfo = (req) => ({
    device: req.headers["user-agent"] ?? "Unknown Device",
    ipAddress: (req.headers["x-forwarded-for"]?.split(",")[0] ?? req.ip) ||
        "Unknown IP",
});
// ─── Custom Error Class ───────────────────────────────────────────────────────
export class AuthError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AuthError";
    }
}
// ─── Registration Flow ────────────────────────────────────────────────────────
/**
 * Step 1 — Validate phone, generate & send OTP via Twilio.
 * POST /auth/register/initiate-phone
 */
export const initiatePhoneRegistration = async (phoneNumber) => {
    const existing = await userRepository.findByPhone(phoneNumber);
    if (existing)
        throw new AuthError(409, "Phone number already registered");
    const result = await sendOTPViaSMS(phoneNumber, "registration");
    if (!result.success)
        throw new AuthError(500, "Failed to send OTP");
    return { devOtp: result.otp }; // otp only present outside production
};
/**
 * Resend phone OTP (for registration or login).
 * POST /auth/register/resend-phone-otp or /auth/login/resend-otp
 */
export const resendPhoneOTP = async (phoneNumber, purpose) => {
    const result = await sendOTPViaSMS(phoneNumber, purpose);
    if (!result.success)
        throw new AuthError(500, "Failed to resend OTP");
    return { devOtp: result.otp };
};
/**
 * Step 2a — Verify phone OTP, create a short-lived Redis session that
 * carries the phone number to the next step.
 * POST /auth/register/verify-phone
 */
export const verifyPhoneOTP = async (phoneNumber, otp) => {
    const valid = await verifyOTP(phoneNumber, otp);
    if (!valid)
        throw new AuthError(400, "Invalid or expired OTP");
    await deleteOTP(phoneNumber);
    const sessionId = crypto.randomBytes(32).toString("hex");
    await storeSession(sessionId, { phoneNumber, phoneVerified: true }, 30 * 60); // 30 min
    return { sessionId };
};
/**
 * Step 2b — Send email verification link via SendGrid.
 * POST /auth/register/initiate-email
 */
export const initiateEmailVerification = async (email, firstName) => {
    const token = crypto.randomBytes(32).toString("hex");
    // Encode email inside token using base64 so we can look up the user at verify time
    const encodedToken = Buffer.from(JSON.stringify({ email, token })).toString("base64url");
    await storeOTP(`email:${email}`, token, 24 * 60); // 24 h
    await sendEmailVerification(email, encodedToken, firstName);
};
/**
 * Resend the email verification link.
 * POST /auth/register/resend-email
 */
export const resendEmailVerification = async (email, firstName) => initiateEmailVerification(email, firstName);
/**
 * Step 2c — Verify email token/OTP.
 * POST /auth/register/verify-email
 */
export const verifyEmailToken = async (encodedToken) => {
    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedToken, "base64url").toString());
    }
    catch {
        throw new AuthError(400, "Invalid verification token");
    }
    const valid = await verifyOTP(`email:${payload.email}`, payload.token);
    if (!valid)
        throw new AuthError(400, "Invalid or expired email verification token");
    await deleteOTP(`email:${payload.email}`);
    return { email: payload.email };
};
/**
 * Step 3 — Hash password, create User, create UserSession, issue tokens.
 * POST /auth/register/complete
 */
export const completeRegistration = async (sessionId, data, requestInfo) => {
    // Validate the temporary Redis session
    const session = await getSession(sessionId);
    if (!session?.phoneVerified) {
        throw new AuthError(400, "Invalid or expired registration session");
    }
    const phoneNumber = session.phoneNumber;
    // Uniqueness checks
    const conflict = await userRepository.findByUsernameOrEmail(data.username, data.email);
    if (conflict) {
        throw new AuthError(409, conflict.username === data.username
            ? "Username already taken"
            : "Email already registered");
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        passwordHash,
        phoneNumber,
        phoneVerified: true,
        status: "ACTIVE",
    });
    await deleteSession(sessionId);
    // Create DB session
    const refreshToken = newRefreshToken();
    await userSessionRepository.create({
        userId: user.id,
        device: requestInfo.device,
        ipAddress: requestInfo.ipAddress,
        refreshToken,
    });
    const accessToken = signAccessToken(user.id, user.email);
    // Fire-and-forget post-registration emails
    sendWelcomeEmail(user.email, user.firstName).catch(console.error);
    initiateEmailVerification(user.email, user.firstName).catch(console.error);
    return { user, accessToken, refreshToken };
};
// ─── Login Flows ──────────────────────────────────────────────────────────────
/**
 * Request a phone login OTP via Twilio.
 * POST /auth/login/request-otp
 */
export const requestLoginOTP = async (phoneNumber) => {
    const user = await userRepository.findByPhone(phoneNumber);
    if (!user)
        throw new AuthError(404, "User not found");
    if (user.status !== "ACTIVE")
        throw new AuthError(403, "Account is not active");
    const result = await sendOTPViaSMS(phoneNumber, "login");
    if (!result.success)
        throw new AuthError(500, "Failed to send OTP");
    return { devOtp: result.otp };
};
/**
 * Login with phone + OTP.
 * POST /auth/login/phone
 */
export const loginWithPhone = async (phoneNumber, otp, requestInfo) => {
    const valid = await verifyOTP(phoneNumber, otp);
    if (!valid)
        throw new AuthError(400, "Invalid or expired OTP");
    await deleteOTP(phoneNumber);
    const user = await userRepository.findByPhone(phoneNumber);
    if (!user)
        throw new AuthError(404, "User not found");
    if (user.status !== "ACTIVE")
        throw new AuthError(403, "Account is not active");
    const refreshToken = newRefreshToken();
    await userSessionRepository.create({
        userId: user.id,
        device: requestInfo.device,
        ipAddress: requestInfo.ipAddress,
        refreshToken,
    });
    await userRepository.touchLastLogin(user.id);
    const accessToken = signAccessToken(user.id, user.email);
    // Security notifications (fire-and-forget)
    sendLoginNotification(user.email, user.firstName, requestInfo.device, requestInfo.ipAddress, new Date()).catch(console.error);
    if (user.phoneNumber) {
        sendLoginAlertSMS(user.phoneNumber, user.firstName, requestInfo.device, requestInfo.ipAddress).catch(console.error);
    }
    return {
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: user.status,
        },
        accessToken,
        refreshToken,
    };
};
/**
 * Login with email + password.
 * POST /auth/login
 */
export const loginWithEmail = async (email, password, requestInfo) => {
    // Use findByEmail which returns the full user object including passwordHash
    const user = await userRepository.findByEmail(email);
    if (!user)
        throw new AuthError(401, "Invalid credentials");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
        throw new AuthError(401, "Invalid credentials");
    if (user.status !== "ACTIVE")
        throw new AuthError(403, `Account is ${user.status.toLowerCase()}`);
    const refreshToken = newRefreshToken();
    await userSessionRepository.create({
        userId: user.id,
        device: requestInfo.device,
        ipAddress: requestInfo.ipAddress,
        refreshToken,
    });
    await userRepository.touchLastLogin(user.id);
    const accessToken = signAccessToken(user.id, user.email);
    // Security notifications (fire-and-forget)
    sendLoginNotification(user.email, user.firstName, requestInfo.device, requestInfo.ipAddress, new Date()).catch(console.error);
    return {
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: user.status,
        },
        accessToken,
        refreshToken,
    };
};
// ─── Session Management ───────────────────────────────────────────────────────
/**
 * Logout from the current device (invalidate refresh token).
 * POST /auth/logout
 */
export const logout = async (refreshToken) => {
    await userSessionRepository.deleteByRefreshToken(refreshToken);
};
/**
 * Logout from ALL devices.
 * POST /auth/logout/all
 */
export const logoutAll = async (userId) => {
    await userSessionRepository.deleteAllByUser(userId);
};
/**
 * Rotate refresh token and issue a new access token.
 * POST /auth/refresh
 */
export const refreshAccessToken = async (refreshToken) => {
    const newRT = newRefreshToken();
    const session = await userSessionRepository.rotate(refreshToken, newRT);
    if (!session)
        throw new AuthError(401, "Invalid refresh token");
    if (session.expiresAt < new Date()) {
        await userSessionRepository.delete(session.id);
        throw new AuthError(401, "Refresh token expired");
    }
    if (session.user.status !== "ACTIVE") {
        throw new AuthError(403, "Account is not active");
    }
    const accessToken = signAccessToken(session.user.id, session.user.email);
    return { accessToken, refreshToken: newRT };
};
/**
 * List all active sessions for a user.
 * GET /auth/sessions
 */
export const listSessions = (userId) => userSessionRepository.listByUser(userId);
/**
 * Revoke a specific session.
 * DELETE /auth/sessions/:sessionId
 */
export const revokeSession = async (sessionId, userId) => {
    const session = await userSessionRepository.findByIdAndUser(sessionId, userId);
    if (!session)
        throw new AuthError(404, "Session not found");
    await userSessionRepository.delete(sessionId);
};
// ─── Password Reset ───────────────────────────────────────────────────────────
/**
 * Generate a password reset token and deliver it via SendGrid.
 * POST /auth/forgot-password
 */
export const forgotPassword = async (email) => {
    const user = await userRepository.findByEmail(email);
    if (!user)
        return; // Silently succeed to prevent email enumeration
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Encode email in the token so we can look up the user at reset time
    const encodedToken = Buffer.from(JSON.stringify({ email, token: rawToken })).toString("base64url");
    await storePasswordResetToken(email, rawToken, 60); // 60 min
    await sendPasswordResetEmail(email, encodedToken, user.firstName);
};
/**
 * Validate a password reset token without consuming it.
 * GET /auth/reset-password/validate?token=...
 */
export const validatePasswordResetToken = async (encodedToken) => {
    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedToken, "base64url").toString());
    }
    catch {
        throw new AuthError(400, "Invalid reset token");
    }
    const valid = await verifyPasswordResetToken(payload.email, payload.token);
    if (!valid)
        throw new AuthError(400, "Invalid or expired reset token");
    return { email: payload.email };
};
/**
 * Reset password using a valid token.
 * POST /auth/reset-password
 */
export const resetPassword = async (encodedToken, newPassword) => {
    const { email } = await validatePasswordResetToken(encodedToken);
    const user = await userRepository.findByEmail(email);
    if (!user)
        throw new AuthError(400, "Invalid reset token");
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.update(user.id, { passwordHash });
    await deletePasswordResetToken(email);
    // Invalidate all existing sessions for security
    await userSessionRepository.deleteAllByUser(user.id);
    // Notifications (fire-and-forget)
    sendPasswordChangedNotification(email, user.firstName).catch(console.error);
};
// ─── Profile ──────────────────────────────────────────────────────────────────
/** Fetch authenticated user's profile. */
export const getCurrentUser = (userId) => userRepository.getProfile(userId);
/** Update mutable profile fields. */
export const updateUserProfile = async (userId, fields) => {
    if (fields.username) {
        const taken = await userRepository.findByUsername(fields.username);
        if (taken && taken.id !== userId) {
            throw new AuthError(409, "Username already taken");
        }
    }
    return userRepository.update(userId, fields);
};
