import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import ErrorHandler from "../utils/errorHandler.js";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Helper function to generate JWT token
const generateAccessToken = (
  adminId: string,
  email: string,
  roleId: string,
): string => {
  return jwt.sign(
    { id: adminId, email, roleId, type: "admin" },
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

// Helper function to log admin activity
const logAdminActivity = async (
  adminId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE",
  entityType: string,
  entityId?: string,
  oldData?: any,
  newData?: any,
): Promise<void> => {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
      },
    });
  } catch (error) {
    console.error("Error logging admin activity:", error);
  }
};

/**
 * Admin login with email and password
 * POST /admin/auth/login
 */
export const adminLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            id: true,
            roleName: true,
            description: true,
          },
        },
      },
    });

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Check account status
    if (admin.accountStatus !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: `Account is ${admin.accountStatus.toLowerCase()}`,
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(
      admin.id,
      admin.email,
      admin.roleId,
    );
    const refreshToken = generateRefreshToken();
    const { device, ipAddress } = getRequestInfo(req);

    // Create session
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        device,
        ipAddress,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Log activity
    await logAdminActivity(admin.id, "ACTIVATE", "AdminSession", undefined, {
      device,
      ipAddress,
      timestamp: new Date(),
    });

    const adminResponse = {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      accountStatus: admin.accountStatus,
      lastLogin: admin.lastLogin,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: adminResponse,
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
      console.error("Error in adminLogin:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Admin logout by invalidating refresh token
 * POST /admin/auth/logout
 */
export const adminLogout = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Find and delete session
    const session = await prisma.adminSession.findFirst({
      where: { refreshToken },
    });

    if (session) {
      await prisma.adminSession.delete({
        where: { id: session.id },
      });

      // Log activity
      await logAdminActivity(
        session.adminId,
        "DEACTIVATE",
        "AdminSession",
        session.id,
      );
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
      console.error("Error in adminLogout:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Refresh admin access token using refresh token
 * POST /admin/auth/refresh
 */
export const adminRefreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Find session
    const session = await prisma.adminSession.findFirst({
      where: { refreshToken },
      include: {
        admin: {
          include: {
            role: true,
          },
        },
      },
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
      await prisma.adminSession.delete({
        where: { id: session.id },
      });
      res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
      return;
    }

    // Check if admin account is active
    if (session.admin.accountStatus !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: `Account is ${session.admin.accountStatus.toLowerCase()}`,
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      session.admin.id,
      session.admin.email,
      session.admin.roleId,
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
      console.error("Error in adminRefreshToken:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

/**
 * Get current authenticated admin details
 * GET /admin/auth/me
 */
export const getCurrentAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Admin is already attached to request by auth middleware
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    // Fetch full admin details
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      include: {
        role: {
          select: {
            id: true,
            roleName: true,
            description: true,
          },
        },
        sessions: {
          select: {
            id: true,
            device: true,
            ipAddress: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    const adminResponse = {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      profileImage: admin.profileImage,
      accountStatus: admin.accountStatus,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      activeSessions: admin.sessions,
    };

    res.status(200).json({
      success: true,
      data: { admin: adminResponse },
    });
  } catch (error) {
    console.error("Error in getCurrentAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get admin activity logs
 * GET /admin/auth/activity-logs
 */
export const getAdminActivityLogs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({
        where: { adminId: req.admin.id },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip,
      }),
      prisma.adminActivityLog.count({
        where: { adminId: req.admin.id },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in getAdminActivityLogs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Revoke admin session
 * DELETE /admin/auth/sessions/:sessionId
 */
export const revokeAdminSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    const { sessionId } = req.params;

    // Find session and ensure it belongs to the current admin
    const session = await prisma.adminSession.findFirst({
      where: {
        id: sessionId,
        adminId: req.admin.id,
      },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Session not found",
      });
      return;
    }

    // Delete session
    await prisma.adminSession.delete({
      where: { id: sessionId },
    });

    // Log activity
    await logAdminActivity(req.admin.id, "DELETE", "AdminSession", sessionId);

    res.status(200).json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Error in revokeAdminSession:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
