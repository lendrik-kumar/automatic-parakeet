/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
// ─── Domain-Specific Error Classes ────────────────────────────────────────────
/**
 * Authentication and authorization errors (401, 403)
 */
export class AuthError extends AppError {
    constructor(statusCode, message, code) {
        super(statusCode, message, code);
    }
}
/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
    constructor(statusCode, message, details) {
        super(statusCode, message, "VALIDATION_ERROR", details);
    }
}
/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
    constructor(statusCode, message) {
        super(statusCode, message, "NOT_FOUND");
    }
}
/**
 * Resource conflict errors (409)
 */
export class ConflictError extends AppError {
    constructor(statusCode, message) {
        super(statusCode, message, "CONFLICT");
    }
}
/**
 * Permission/authorization errors (403)
 */
export class ForbiddenError extends AppError {
    constructor(statusCode, message) {
        super(statusCode, message, "FORBIDDEN");
    }
}
/**
 * Bad request errors (400)
 */
export class BadRequestError extends AppError {
    constructor(statusCode, message, details) {
        super(statusCode, message, "BAD_REQUEST", details);
    }
}
/**
 * Internal server errors (500)
 */
export class InternalServerError extends AppError {
    constructor(message = "Internal server error") {
        super(500, message, "INTERNAL_SERVER_ERROR");
    }
}
