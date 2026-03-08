import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import ErrorHandler from "../utils/errorHandler.js";
import { sendOTPViaSMS } from "../lib/sms.js";
import {
  sendOTPEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLoginNotification,
} from "../lib/email.js";
import {
  storeOTP,
  verifyOTP,
  deleteOTP,
  storeSession,
  getSession,
  deleteSession,
  storePasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
} from "../lib/redis.js";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// Validation Schemas
const initiatePhoneRegistrationSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});

const verifyPhoneOTPSchema = z.object({
  phoneNumber: z.string(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const completeRegistrationSchema = z.object({
  sessionId: z.string(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginWithPhoneSchema = z.object({
  phoneNumber: z.string(),
  otp: z.string().length(6, "OTP must be 6 digits"),
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
  token: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Helper function to generate JWT token
const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign(
    { id: userId, email, type: "user" },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );
};

// Helper function to generate refresh token
const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

// Helper function to get device and IP info
const getRequestInfo = (req: Request) => {
  const device = req.headers["user-agent"] || "Unknown Device";
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.ip ||
    "Unknown IP";
  return { device, ipAddress };
};

/**
 * Step 1: Initiate phone registration by sending OTP
 * POST /auth/register/initiate-phone
 */
export const initiatePhoneRegistration = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber } = initiatePhoneRegistrationSchema.parse(req.body);

    // Check if phone number is already registered
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
      return;
    }

    // Send OTP
    const result = await sendOTPViaSMS(phoneNumber, "registration");

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone",
        ...(process.env.NODE_ENV === "DEVELOPMENT" && { otp: result.otp }),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in initiatePhoneRegistration:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Step 2: Verify phone OTP and create temporary session
 * POST /auth/register/verify-phone
 */
export const verifyPhoneOTP = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber, otp } = verifyPhoneOTPSchema.parse(req.body);

    // Verify OTP
    const isValid = await verifyOTP(phoneNumber, otp);

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
      return;
    }

    // Delete used OTP
    await deleteOTP(phoneNumber);

    // Create temporary session
    const sessionId = crypto.randomBytes(32).toString("hex");
    await storeSession(
      sessionId,
      { phoneNumber, phoneVerified: true },
      30 * 60, // 30 minutes expiry
    );

    res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      sessionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in verifyPhoneOTP:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Step 3: Complete registration with remaining details
 * POST /auth/register/complete
 */
export const completeRegistration = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = completeRegistrationSchema.parse(req.body);

    // Verify session
    const session = await getSession(data.sessionId);
    if (!session || !session.phoneVerified) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired session",
      });
      return;
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message:
          existingUser.username === data.username
            ? "Username already taken"
            : "Email already registered",
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        passwordHash,
        phoneNumber: session.phoneNumber,
        phoneVerified: true,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    // Delete temporary session
    await deleteSession(data.sessionId);

    // Send welcome email
    await sendWelcomeEmail(user.email, user.firstName);

    // Send email verification
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    await storeOTP(user.email, emailVerificationToken, 24 * 60); // 24 hours
    await sendEmailVerification(
      user.email,
      emailVerificationToken,
      user.firstName,
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();
    const { device, ipAddress } = getRequestInfo(req);

    // Create session in database
    await prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        ipAddress,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in completeRegistration:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Login with phone number and OTP
 * POST /auth/login/phone
 */
export const loginWithPhone = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber, otp } = loginWithPhoneSchema.parse(req.body);

    // Verify OTP
    const isValid = await verifyOTP(phoneNumber, otp);

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
      return;
    }

    // Delete used OTP
    await deleteOTP(phoneNumber);

    // Find user
    const user = await prisma.user.findFirst({
      where: { phoneNumber },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phoneNumber: true,
        status: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Account is not active",
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();
    const { device, ipAddress } = getRequestInfo(req);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        ipAddress,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Send login notification
    await sendLoginNotification(
      user.email,
      user.firstName,
      device,
      ipAddress,
      new Date(),
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in loginWithPhone:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Request OTP for phone login
 * POST /auth/login/request-otp
 */
export const requestLoginOTP = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phoneNumber } = initiatePhoneRegistrationSchema.parse(req.body);

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { phoneNumber },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Send OTP
    const result = await sendOTPViaSMS(phoneNumber, "login");

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        ...(process.env.NODE_ENV === "DEVELOPMENT" && { otp: result.otp }),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in requestLoginOTP:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Login with email and password
 * POST /auth/login
 */
export const loginWithEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password } = loginWithEmailSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Account is not active",
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken();
    const { device, ipAddress } = getRequestInfo(req);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        ipAddress,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Send login notification
    await sendLoginNotification(
      user.email,
      user.firstName,
      device,
      ipAddress,
      new Date(),
    );

    const userResponse = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      status: user.status,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in loginWithEmail:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Logout user by invalidating refresh token
 * POST /auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Find and delete session
    const session = await prisma.userSession.findFirst({
      where: { refreshToken },
    });

    if (session) {
      await prisma.userSession.delete({
        where: { id: session.id },
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in logout:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Refresh access token using refresh token
 * POST /auth/refresh
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Find session
    const session = await prisma.userSession.findFirst({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    // Check if token expired
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({
        where: { id: session.id },
      });
      res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
      return;
    }

    // Check if user is active
    if (session.user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Account is not active",
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      session.user.id,
      session.user.email,
    );

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in refreshAccessToken:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Initiate forgot password process
 * POST /auth/forgot-password
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store token in Redis
    await storePasswordResetToken(email, resetToken, 60); // 60 minutes

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.firstName);

    res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in forgotPassword:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Reset password with token
 * POST /auth/reset-password
 */
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Find user by checking all stored reset tokens
    // This is a simplified approach - in production, you might want to encode email in the token
    const user = await prisma.user.findFirst({
      where: {
        email: {
          not: undefined,
        },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
      return;
    }

    // Verify token
    const isValid = await verifyPasswordResetToken(user.email, token);

    if (!isValid) {
      // Try to find the user by iterating (not ideal for production)
      // In production, encode user ID or email in the token itself
      const allUsers = await prisma.user.findMany({
        select: { email: true },
      });

      let validUser = null;
      for (const u of allUsers) {
        if (await verifyPasswordResetToken(u.email, token)) {
          validUser = u;
          break;
        }
      }

      if (!validUser) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { email: validUser.email },
        data: { passwordHash },
      });

      // Delete reset token
      await deletePasswordResetToken(validUser.email);

      // Invalidate all existing sessions
      await prisma.userSession.deleteMany({
        where: { user: { email: validUser.email } },
      });

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { email: user.email },
      data: { passwordHash },
    });

    // Delete reset token
    await deletePasswordResetToken(user.email);

    // Invalidate all existing sessions
    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    } else {
      console.error("Error in resetPassword:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Get current authenticated user details
 * GET /auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // User is already attached to request by auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    // Fetch full user details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phoneNumber: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
