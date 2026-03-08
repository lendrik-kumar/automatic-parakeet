import router from "express";
import {
  initiatePhoneRegistration,
  verifyPhoneOTP,
  completeRegistration,
  loginWithPhone,
  requestLoginOTP,
  loginWithEmail,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from "../controllers/user.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const userRouter = router.Router();

// Registration routes - Multi-step registration with phone verification
userRouter.post(
  "/auth/register/initiate-phone",
  otpLimiter,
  initiatePhoneRegistration,
);
userRouter.post("/auth/register/verify-phone", otpLimiter, verifyPhoneOTP);
userRouter.post("/auth/register/complete", authLimiter, completeRegistration);

// Login routes
// Login with phone number and OTP
userRouter.post("/auth/login/request-otp", otpLimiter, requestLoginOTP);
userRouter.post("/auth/login/phone", authLimiter, loginWithPhone);

// Alternative login with email and password
userRouter.post("/auth/login", authLimiter, loginWithEmail);

// Logout route
userRouter.post("/auth/logout", logout);

// Token refresh route
userRouter.post("/auth/refresh", refreshAccessToken);

// Password reset routes
userRouter.post("/auth/forgot-password", passwordResetLimiter, forgotPassword);
userRouter.post("/auth/reset-password", passwordResetLimiter, resetPassword);

// Get authenticated user details (protected route)
userRouter.get("/auth/me", authenticateUser, getCurrentUser);

export default userRouter;
