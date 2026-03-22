/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Domain-Specific Error Classes ────────────────────────────────────────────

/**
 * Authentication and authorization errors (401, 403)
 */
export class AuthError extends AppError {
  constructor(statusCode: number, message: string, code?: string) {
    super(statusCode, message, code);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, "VALIDATION_ERROR", details);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(statusCode: number, message: string) {
    super(statusCode, message, "NOT_FOUND");
  }
}

/**
 * Resource conflict errors (409)
 */
export class ConflictError extends AppError {
  constructor(statusCode: number, message: string) {
    super(statusCode, message, "CONFLICT");
  }
}

/**
 * Permission/authorization errors (403)
 */
export class ForbiddenError extends AppError {
  constructor(statusCode: number, message: string) {
    super(statusCode, message, "FORBIDDEN");
  }
}

/**
 * Bad request errors (400)
 */
export class BadRequestError extends AppError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, "BAD_REQUEST", details);
  }
}

/**
 * Internal server errors (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, message, "INTERNAL_SERVER_ERROR");
  }
}
