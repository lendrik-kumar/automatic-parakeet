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
import {
  storeOTP,
  verifyOTP,
  deleteOTP,
  storeSession,
  getSession,
  deleteSession,
  updateSession,
  reservePhone,
  reserveEmail,
  getPhoneReservation,
  getEmailReservation,
  releasePhoneReservation,
  releaseEmailReservation,
} from "../lib/redis.js";
import { sendOTPViaSMS, sendLoginAlertSMS, generateOTP } from "../lib/sms.js";
import {
  sendOTPEmail,
  sendWelcomeEmail,
  sendLoginNotification,
  sendPasswordResetEmail,
  sendPasswordChangedNotification,
} from "../lib/email.js";
import type { Gender } from "../generated/prisma/enums.js";

import { userRepository } from "../repositories/user.repository.js";
import { userSessionRepository } from "../repositories/user-session.repository.js";

// ─── Token Helpers ────────────────────────────────────────────────────────────

/** Sign a short-lived JWT access token for a user (15 min). */
const signAccessToken = (userId: string, email: string): string =>
  jwt.sign(
    { id: userId, email, type: "user" },
    JWT_SECRET as jwt.Secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions,
  );

/** Generate an opaque, cryptographically random refresh token. */
const newRefreshToken = (): string => crypto.randomBytes(64).toString("hex");

/** Extract device/IP from an Express-like request object. */
export const extractRequestInfo = (req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}) => ({
  device: (req.headers["user-agent"] as string) ?? "Unknown Device",
  ipAddress:
    ((req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip) ||
    "Unknown IP",
});

// ─── Custom Error Class ───────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Registration Flow ────────────────────────────────────────────────────────

/**
 * Step 1 — Validate phone, generate & send OTP via SMS, create session.
 * POST /auth/register/initiate-phone
 */
export const initiatePhoneRegistration = async (data: {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
}): Promise<{ sessionId: string; devOtp?: string }> => {
  const existing = await userRepository.findByPhone(data.phoneNumber);
  if (existing) throw new AuthError(409, "Phone number already in use");

  // Check if phone is reserved by another session
  const reservation = await getPhoneReservation(data.phoneNumber);
  if (reservation) {
    throw new AuthError(409, "Phone number already in use");
  }

  const result = await sendOTPViaSMS(data.phoneNumber, "registration");
  if (!result.success) throw new AuthError(500, "Failed to send OTP");

  // Create registration session with user data
  const sessionId = crypto.randomBytes(32).toString("hex");
  const sessionData = {
    phoneNumber: data.phoneNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    phoneVerified: false,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    expiresIn: 30 * 60, // 30 minutes in seconds
  };

  await storeSession(sessionId, sessionData, 30 * 60); // 30 min TTL
  await reservePhone(data.phoneNumber, sessionId, 30); // 30 min TTL

  return { sessionId, devOtp: result.otp }; // otp only present outside production
};

/**
 * Resend phone OTP (for registration or login).
 * This will generate a NEW OTP and update Redis to prevent security issues.
 * POST /auth/register/resend-phone-otp or /auth/login/resend-otp
 */
export const resendPhoneOTP = async (
  phoneNumber: string,
  purpose: "registration" | "login",
): Promise<{ devOtp?: string }> => {
  // Force new OTP generation on resend for security
  const result = await sendOTPViaSMS(phoneNumber, purpose, 10, true);
  if (!result.success) throw new AuthError(500, "Failed to resend OTP");
  return { devOtp: result.otp };
};

/**
 * Step 2 — Verify phone OTP, update session to mark phone verified.
 * POST /auth/register/verify-phone
 */
export const verifyPhoneOTP = async (
  phoneNumber: string,
  otp: string,
): Promise<{ sessionId: string }> => {
  const valid = await verifyOTP(`phone:${phoneNumber}`, otp);
  if (!valid) throw new AuthError(400, "Invalid or expired OTP");

  await deleteOTP(`phone:${phoneNumber}`);

  // Get the session ID from phone reservation
  const sessionId = await getPhoneReservation(phoneNumber);
  if (!sessionId) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Verify session exists
  const session = await getSession(sessionId);
  if (!session) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Update session to mark phone verified
  await updateSession(sessionId, { phoneVerified: true });

  return { sessionId };
};

/**
 * Step 3 — Initiate email verification with OTP (not URL).
 * POST /auth/register/initiate-email-otp
 */
export const initiateEmailVerificationOTP = async (
  sessionId: string,
  email: string,
  firstName?: string,
): Promise<{ devOtp?: string }> => {
  // Get and validate session
  const session = await getSession(sessionId);
  if (!session || session.phoneVerified !== true) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Check email not already registered
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AuthError(409, "Email address already in use");
  }

  // Check email not reserved by another session
  const reservation = await getEmailReservation(email);
  if (reservation && reservation !== sessionId) {
    throw new AuthError(409, "Email address already in use");
  }

  // Generate OTP
  const otp = generateOTP();
  const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

  // Store OTP in Redis (10 min TTL)
  await storeOTP(`email:${email}`, otp, 10, "email_verification");

  // Send OTP via email
  const sent = await sendOTPEmail(email, otp, firstName);
  if (!sent && IS_PRODUCTION) {
    throw new AuthError(500, "Failed to send verification email");
  }

  // Reserve email and update session
  await reserveEmail(email, sessionId, 30); // 30 min TTL
  await updateSession(sessionId, { email });

  return { devOtp: IS_PRODUCTION ? undefined : otp };
};

/**
 * Step 4 — Verify email OTP.
 * POST /auth/register/verify-email-otp
 */
export const verifyEmailOTP = async (
  sessionId: string,
  email: string,
  otp: string,
): Promise<void> => {
  // Get and validate session
  const session = await getSession(sessionId);
  if (!session || session.phoneVerified !== true || session.email !== email) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Verify OTP
  const valid = await verifyOTP(`email:${email}`, otp);
  if (!valid) {
    throw new AuthError(400, "Invalid or expired OTP");
  }

  await deleteOTP(`email:${email}`);

  // Update session to mark email verified
  await updateSession(sessionId, { emailVerified: true });
};

/**
 * Resend email verification OTP.
 * POST /auth/register/resend-email-otp
 */
export const resendEmailOTP = async (
  sessionId: string,
  email: string,
  firstName?: string,
): Promise<{ devOtp?: string }> => {
  // Get and validate session
  const session = await getSession(sessionId);
  if (!session || session.phoneVerified !== true || session.email !== email) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Generate NEW OTP (force regeneration)
  const otp = generateOTP();
  const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

  // Store OTP in Redis (10 min TTL) - overwrites existing
  await storeOTP(`email:${email}`, otp, 10, "email_verification");

  // Send OTP via email
  const sent = await sendOTPEmail(email, otp, firstName);
  if (!sent && IS_PRODUCTION) {
    throw new AuthError(500, "Failed to send verification email");
  }

  return { devOtp: IS_PRODUCTION ? undefined : otp };
};

/**
 * Step 5 — Hash password, create User, create UserSession, issue tokens.
 * POST /auth/register/complete
 */
export const completeRegistration = async (
  sessionId: string,
  data: {
    email: string;
    password: string;
    dateOfBirth: string; // ISO date string YYYY-MM-DD
  },
  requestInfo: { device: string; ipAddress: string },
) => {
  // Validate the temporary Redis session
  const session = await getSession(sessionId);
  if (!session?.phoneVerified || !session?.emailVerified) {
    throw new AuthError(400, "Phone and email verification required");
  }

  const phoneNumber = session.phoneNumber as string;
  const email = session.email as string;
  const firstName = session.firstName as string;
  const lastName = session.lastName as string;
  const gender = session.gender as Gender;

  // Validate email from session matches provided email
  if (email !== data.email) {
    throw new AuthError(400, "Email does not match verified email");
  }

  // Validate reservations are still held by this session
  const phoneReservation = await getPhoneReservation(phoneNumber);
  const emailReservation = await getEmailReservation(email);

  if (phoneReservation !== sessionId || emailReservation !== sessionId) {
    throw new AuthError(400, "Invalid or expired session");
  }

  // Validate and parse dateOfBirth
  const dateOfBirth = new Date(data.dateOfBirth);
  if (isNaN(dateOfBirth.getTime())) {
    throw new AuthError(400, "Invalid date of birth format");
  }

  // Validate age (must be at least 13 years old)
  const minAge = 13;
  const today = new Date();
  const minBirthDate = new Date(
    today.getFullYear() - minAge,
    today.getMonth(),
    today.getDate(),
  );
  if (dateOfBirth > minBirthDate) {
    throw new AuthError(
      400,
      `You must be at least ${minAge} years old to register`,
    );
  }

  // Double-check phone/email not in DB (race condition protection)
  const phoneExists = await userRepository.findByPhone(phoneNumber);
  if (phoneExists) {
    throw new AuthError(409, "Phone number already in use");
  }

  const emailExists = await userRepository.findByEmail(email);
  if (emailExists) {
    throw new AuthError(409, "Email address already in use");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await userRepository.create({
    firstName,
    lastName,
    email: data.email,
    passwordHash,
    phoneNumber,
    gender,
    dateOfBirth,
    phoneVerified: true,
    emailVerified: true, // Email is verified via OTP
    status: "ACTIVE",
  });

  // Release reservations
  await releasePhoneReservation(phoneNumber);
  await releaseEmailReservation(email);

  // Delete session
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

  // Send welcome email only (fire-and-forget)
  sendWelcomeEmail(user.email, user.firstName).catch(console.error);

  return { user, accessToken, refreshToken };
};

// ─── Login Flows ──────────────────────────────────────────────────────────────

/**
 * Request a phone login OTP via Twilio.
 * POST /auth/login/request-otp
 */
export const requestLoginOTP = async (
  phoneNumber: string,
): Promise<{ devOtp?: string }> => {
  const user = await userRepository.findByPhone(phoneNumber);
  if (!user) throw new AuthError(404, "User not found");
  if (user.status !== "ACTIVE")
    throw new AuthError(403, "Account is not active");

  const result = await sendOTPViaSMS(phoneNumber, "login");
  if (!result.success) throw new AuthError(500, "Failed to send OTP");

  return { devOtp: result.otp };
};

/**
 * Login with phone + OTP.
 * POST /auth/login/phone
 */
export const loginWithPhone = async (
  phoneNumber: string,
  otp: string,
  requestInfo: { device: string; ipAddress: string },
) => {
  const valid = await verifyOTP(`phone:${phoneNumber}`, otp);
  if (!valid) throw new AuthError(400, "Invalid or expired OTP");
  await deleteOTP(`phone:${phoneNumber}`);

  const user = await userRepository.findByPhone(phoneNumber);
  if (!user) throw new AuthError(404, "User not found");
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
  sendLoginNotification(
    user.email,
    user.firstName,
    requestInfo.device,
    requestInfo.ipAddress,
    new Date(),
  ).catch(console.error);
  if (user.phoneNumber) {
    sendLoginAlertSMS(
      user.phoneNumber,
      user.firstName,
      requestInfo.device,
      requestInfo.ipAddress,
    ).catch(console.error);
  }

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
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
export const loginWithEmail = async (
  email: string,
  password: string,
  requestInfo: { device: string; ipAddress: string },
) => {
  // Use findByEmail which returns the full user object including passwordHash
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AuthError(401, "Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError(401, "Invalid credentials");

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
  sendLoginNotification(
    user.email,
    user.firstName,
    requestInfo.device,
    requestInfo.ipAddress,
    new Date(),
  ).catch(console.error);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
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
export const logout = async (refreshToken: string): Promise<void> => {
  await userSessionRepository.deleteByRefreshToken(refreshToken);
};

/**
 * Logout from ALL devices.
 * POST /auth/logout/all
 */
export const logoutAll = async (userId: string): Promise<void> => {
  await userSessionRepository.deleteAllByUser(userId);
};

/**
 * Rotate refresh token and issue a new access token.
 * POST /auth/refresh
 */
export const refreshAccessToken = async (refreshToken: string) => {
  const newRT = newRefreshToken();
  const session = await userSessionRepository.rotate(refreshToken, newRT);

  if (!session) throw new AuthError(401, "Invalid refresh token");

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
export const listSessions = (userId: string) =>
  userSessionRepository.listByUser(userId);

/**
 * Revoke a specific session.
 * DELETE /auth/sessions/:sessionId
 */
export const revokeSession = async (
  sessionId: string,
  userId: string,
): Promise<void> => {
  const session = await userSessionRepository.findByIdAndUser(
    sessionId,
    userId,
  );
  if (!session) throw new AuthError(404, "Session not found");
  await userSessionRepository.delete(sessionId);
};

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Generate a password reset OTP and deliver it via email.
 * POST /auth/forgot-password
 */
export const forgotPassword = async (
  email: string,
): Promise<{ devOtp?: string }> => {
  const user = await userRepository.findByEmail(email);
  if (!user) return {}; // Silently succeed to prevent email enumeration

  const otp = generateOTP();
  const IS_PRODUCTION = process.env.NODE_ENV?.toUpperCase() === "PRODUCTION";

  await storeOTP(`password-reset:${email}`, otp, 10, "password_reset");

  const sent = await sendPasswordResetEmail(email, otp, user.firstName);
  if (!sent && IS_PRODUCTION) {
    throw new AuthError(500, "Failed to send password reset OTP");
  }

  return { devOtp: IS_PRODUCTION ? undefined : otp };
};

/**
 * Reset password using a valid email OTP.
 * POST /auth/reset-password
 */
export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> => {
  const valid = await verifyOTP(`password-reset:${email}`, otp);
  if (!valid) throw new AuthError(400, "Invalid or expired OTP");

  const user = await userRepository.findByEmail(email);
  if (!user) throw new AuthError(400, "Invalid or expired OTP");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userRepository.update(user.id, { passwordHash });
  await deleteOTP(`password-reset:${email}`);

  // Invalidate all existing sessions for security
  await userSessionRepository.deleteAllByUser(user.id);

  // Notifications (fire-and-forget)
  sendPasswordChangedNotification(email, user.firstName).catch(console.error);
};

// ─── Profile ──────────────────────────────────────────────────────────────────

/** Fetch authenticated user's profile. */
export const getCurrentUser = (userId: string) =>
  userRepository.getProfile(userId);

/** Update mutable profile fields. */
export const updateUserProfile = async (
  userId: string,
  fields: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    gender?: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
    dateOfBirth?: string; // ISO date string
  },
) => {
  const updateData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    gender?: Gender;
    dateOfBirth?: Date;
  } = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    phoneNumber: fields.phoneNumber,
    gender: fields.gender,
  };

  // Validate and parse dateOfBirth if provided
  if (fields.dateOfBirth) {
    const dob = new Date(fields.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new AuthError(400, "Invalid date of birth format");
    }
    updateData.dateOfBirth = dob;
  }

  return userRepository.update(userId, updateData);
};
