import { z } from "zod";
import * as svc from "../services/user-auth.service.js";
import { AuthError, extractRequestInfo, } from "../services/user-auth.service.js";
// ─── Zod Validation Schemas ───────────────────────────────────────────────────────────
const initiatePhoneSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
});
const phoneSchema = z.object({
    phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});
const verifyPhoneSchema = z.object({
    phoneNumber: z.string(),
    otp: z.string().length(6, "OTP must be 6 digits"),
});
const completeRegistrationSchema = z.object({
    sessionId: z.string(),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});
const loginWithEmailSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});
const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});
const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
});
const resetPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
const updateProfileSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional(),
    gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).optional(),
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional(),
});
const initiateEmailOTPSchema = z.object({
    sessionId: z.string().min(1, "Session ID is required"),
    email: z.string().email("Invalid email format"),
    firstName: z.string().min(2).optional(),
});
const verifyEmailOTPSchema = z.object({
    sessionId: z.string().min(1, "Session ID is required"),
    email: z.string().email("Invalid email format"),
    otp: z.string().length(6, "OTP must be 6 digits"),
});
// ─── Error Handler Helper ────────────────────────────────────────────────────────────────
const handleError = (res, error) => {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            success: false,
            message: "Validation error",
            errors: error.issues,
        });
        return;
    }
    if (error instanceof AuthError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[UserController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
// ─── Registration Handlers ──────────────────────────────────────────────────────────
/** POST /auth/register/initiate-phone */
export const initiatePhoneRegistration = async (req, res) => {
    try {
        const data = initiatePhoneSchema.parse(req.body);
        const result = await svc.initiatePhoneRegistration(data);
        res.status(200).json({
            success: true,
            message: "OTP sent successfully to your phone",
            sessionId: result.sessionId,
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/resend-phone-otp */
export const resendPhoneRegistrationOTP = async (req, res) => {
    try {
        const { phoneNumber } = phoneSchema.parse(req.body);
        const result = await svc.resendPhoneOTP(phoneNumber, "registration");
        res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/verify-phone */
export const verifyPhoneOTP = async (req, res) => {
    try {
        const { phoneNumber, otp } = verifyPhoneSchema.parse(req.body);
        const { sessionId } = await svc.verifyPhoneOTP(phoneNumber, otp);
        res.status(200).json({
            success: true,
            message: "Phone verified successfully",
            sessionId,
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/initiate-email-otp */
export const initiateEmailVerificationOTP = async (req, res) => {
    try {
        const { sessionId, email, firstName } = initiateEmailOTPSchema.parse(req.body);
        const result = await svc.initiateEmailVerificationOTP(sessionId, email, firstName);
        res.status(200).json({
            success: true,
            message: "OTP sent to your email",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/verify-email-otp */
export const verifyEmailOTPHandler = async (req, res) => {
    try {
        const { sessionId, email, otp } = verifyEmailOTPSchema.parse(req.body);
        await svc.verifyEmailOTP(sessionId, email, otp);
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/resend-email-otp */
export const resendEmailOTPHandler = async (req, res) => {
    try {
        const { sessionId, email, firstName } = initiateEmailOTPSchema.parse(req.body);
        const result = await svc.resendEmailOTP(sessionId, email, firstName);
        res.status(200).json({
            success: true,
            message: "OTP resent to your email",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/register/complete */
export const completeRegistration = async (req, res) => {
    try {
        const data = completeRegistrationSchema.parse(req.body);
        const info = extractRequestInfo(req);
        const result = await svc.completeRegistration(data.sessionId, data, info);
        res.status(201).json({
            success: true,
            message: "Registration completed successfully",
            data: result,
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/login/phone */
export const loginWithPhone = async (req, res) => {
    try {
        const { phoneNumber, otp } = verifyPhoneSchema.parse(req.body);
        const info = extractRequestInfo(req);
        const result = await svc.loginWithPhone(phoneNumber, otp, info);
        res
            .status(200)
            .json({ success: true, message: "Login successful", data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── Login Handlers ────────────────────────────────────────────────────────────────
/** POST /auth/login/request-otp */
export const requestLoginOTP = async (req, res) => {
    try {
        const { phoneNumber } = phoneSchema.parse(req.body);
        const result = await svc.requestLoginOTP(phoneNumber);
        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/login/resend-otp */
export const resendLoginOTP = async (req, res) => {
    try {
        const { phoneNumber } = phoneSchema.parse(req.body);
        const result = await svc.resendPhoneOTP(phoneNumber, "login");
        res.status(200).json({
            success: true,
            message: "OTP resent successfully",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/login */
export const loginWithEmail = async (req, res) => {
    try {
        const { email, password } = loginWithEmailSchema.parse(req.body);
        const info = extractRequestInfo(req);
        const result = await svc.loginWithEmail(email, password, info);
        res
            .status(200)
            .json({ success: true, message: "Login successful", data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── Session Handlers ────────────────────────────────────────────────────────────────
/** POST /auth/logout */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        await svc.logout(refreshToken);
        res.status(200).json({ success: true, message: "Logged out successfully" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/logout/all */
export const logoutAll = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        await svc.logoutAll(req.user.id);
        res
            .status(200)
            .json({ success: true, message: "Logged out from all devices" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/refresh */
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        const result = await svc.refreshAccessToken(refreshToken);
        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: result,
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /auth/sessions */
export const listSessions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const sessions = await svc.listSessions(req.user.id);
        res.status(200).json({ success: true, data: { sessions } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /auth/sessions/:sessionId */
export const revokeSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        await svc.revokeSession(req.params.sessionId, req.user.id);
        res
            .status(200)
            .json({ success: true, message: "Session revoked successfully" });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── Password Handlers ────────────────────────────────────────────────────────────────
/** POST /auth/forgot-password */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        const result = await svc.forgotPassword(email);
        res.status(200).json({
            success: true,
            message: "If that email exists, a password reset OTP has been sent",
            ...(result.devOtp && { otp: result.devOtp }),
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /auth/reset-password */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
        await svc.resetPassword(email, otp, newPassword);
        res
            .status(200)
            .json({ success: true, message: "Password reset successfully" });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── Profile Handlers ────────────────────────────────────────────────────────────────
/** GET /auth/me */
export const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const user = await svc.getCurrentUser(req.user.id);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, data: { user } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PUT /auth/me */
export const updateUserProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const fields = updateProfileSchema.parse(req.body);
        const user = await svc.updateUserProfile(req.user.id, fields);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { user },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
