import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { envMode } from "../app.js";

/**
 * Global error handling middleware
 * Catches all errors and formats them into consistent responses
 * 
 * Usage: Add this as the LAST middleware in app.ts
 */
export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // Log error for debugging
  console.error("[GlobalErrorHandler]", {
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // 1. Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // 2. Handle custom application errors
  if (error instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      message: error.message,
    };

    if (error.code) {
      response.code = error.code;
    }

    if (error.details) {
      response.details = error.details;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // 3. Handle Prisma errors
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };

    // P2002: Unique constraint violation
    if (prismaError.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "Resource already exists",
        code: "DUPLICATE_RESOURCE",
        field: prismaError.meta?.target,
      });
      return;
    }

    // P2025: Record not found
    if (prismaError.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Resource not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // P2003: Foreign key constraint violation
    if (prismaError.code === "P2003") {
      res.status(400).json({
        success: false,
        message: "Invalid reference to related resource",
        code: "FOREIGN_KEY_VIOLATION",
      });
      return;
    }

    // P2014: Relation violation (required relation missing)
    if (prismaError.code === "P2014") {
      res.status(400).json({
        success: false,
        message: "Required relationship is missing",
        code: "RELATION_VIOLATION",
      });
      return;
    }

    // Generic Prisma error
    res.status(500).json({
      success: false,
      message: "Database operation failed",
      code: "DATABASE_ERROR",
      ...(envMode === "DEVELOPMENT" && { prismaCode: prismaError.code }),
    });
    return;
  }

  // 4. Handle standard Error objects
  if (error instanceof Error) {
    res.status(500).json({
      success: false,
      message: envMode === "DEVELOPMENT" ? error.message : "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      ...(envMode === "DEVELOPMENT" && { stack: error.stack }),
    });
    return;
  }

  // 5. Handle unknown errors
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and pass to next()
 * 
 * Usage:
 * router.get("/path", asyncHandler(async (req, res) => {
 *   // Your async code here
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
