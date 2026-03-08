import router from "express";
import {
  initiatePhoneRegistration,
  resendPhoneRegistrationOTP,
  verifyPhoneOTP,
  initiateEmailVerification,
  verifyEmailToken,
  resendEmailVerification,
  completeRegistration,
  requestLoginOTP,
  resendLoginOTP,
  loginWithPhone,
  loginWithEmail,
  logout,
  logoutAll,
  refreshAccessToken,
  listSessions,
  revokeSession,
  forgotPassword,
  validatePasswordResetToken,
  resetPassword,
  getCurrentUser,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const userRouter = router.Router();

// ─── Registration ─────────────────────────────────────────────────────────────
userRouter.post(
  "/auth/register/initiate-phone",
  otpLimiter,
  initiatePhoneRegistration,
);
userRouter.post(
  "/auth/register/resend-phone-otp",
  otpLimiter,
  resendPhoneRegistrationOTP,
);
userRouter.post("/auth/register/verify-phone", otpLimiter, verifyPhoneOTP);
userRouter.post(
  "/auth/register/initiate-email",
  otpLimiter,
  initiateEmailVerification,
);
userRouter.post(
  "/auth/register/resend-email",
  otpLimiter,
  resendEmailVerification,
);
userRouter.get("/auth/register/verify-email", verifyEmailToken); // token via query param
userRouter.post("/auth/register/complete", authLimiter, completeRegistration);

// ─── Login ────────────────────────────────────────────────────────────────────
userRouter.post("/auth/login/request-otp", otpLimiter, requestLoginOTP);
userRouter.post("/auth/login/resend-otp", otpLimiter, resendLoginOTP);
userRouter.post("/auth/login/phone", authLimiter, loginWithPhone);
userRouter.post("/auth/login", authLimiter, loginWithEmail);

// ─── Session Management ───────────────────────────────────────────────────────
userRouter.post("/auth/logout", logout);
userRouter.post("/auth/logout/all", authenticateUser, logoutAll);
userRouter.post("/auth/refresh", refreshAccessToken);
userRouter.get("/auth/sessions", authenticateUser, listSessions);
userRouter.delete("/auth/sessions/:sessionId", authenticateUser, revokeSession);

// ─── Password Reset ───────────────────────────────────────────────────────────
userRouter.post("/auth/forgot-password", passwordResetLimiter, forgotPassword);
userRouter.get("/auth/reset-password/validate", validatePasswordResetToken);
userRouter.post("/auth/reset-password", passwordResetLimiter, resetPassword);

// ─── Profile ──────────────────────────────────────────────────────────────────
userRouter.get("/auth/me", authenticateUser, getCurrentUser);
userRouter.put("/auth/me", authenticateUser, updateUserProfile);

export default userRouter;
