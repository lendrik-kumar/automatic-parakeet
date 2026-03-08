import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import ErrorHandler from "../utils/errorHandler.js";

// Extend Express Request type to include user/admin
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
      admin?: {
        id: string;
        email: string;
        roleId: string;
      };
    }
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to authenticate user JWT tokens
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ErrorHandler(401, "No token provided");
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      type: string;
    };

    if (decoded.type !== "user") {
      throw new ErrorHandler(403, "Invalid token type");
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, status: true },
    });

    if (!user) {
      throw new ErrorHandler(401, "User not found");
    }

    if (user.status !== "ACTIVE") {
      throw new ErrorHandler(403, "Account is not active");
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else if (error instanceof ErrorHandler) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Authentication failed",
      });
    }
  }
};

// Middleware to authenticate admin JWT tokens
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ErrorHandler(401, "No token provided");
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      roleId: string;
      type: string;
    };

    if (decoded.type !== "admin") {
      throw new ErrorHandler(403, "Invalid token type");
    }

    // Verify admin exists and is active
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, roleId: true, accountStatus: true },
    });

    if (!admin) {
      throw new ErrorHandler(401, "Admin not found");
    }

    if (admin.accountStatus !== "ACTIVE") {
      throw new ErrorHandler(403, "Account is not active");
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      roleId: admin.roleId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else if (error instanceof ErrorHandler) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Authentication failed",
      });
    }
  }
};
