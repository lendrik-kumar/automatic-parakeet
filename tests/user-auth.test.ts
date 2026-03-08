import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";

// ── Factory mocks prevent Jest from loading actual modules (avoids ESM import.meta issues) ──

class _AuthError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}

jest.mock("../src/services/user-auth.service.js", () => ({
  AuthError: _AuthError,
  extractRequestInfo: jest
    .fn()
    .mockReturnValue({ device: "test", ipAddress: "127.0.0.1" }),
  initiatePhoneRegistration: jest.fn(),
  resendPhoneOTP: jest.fn(),
  verifyPhoneOTP: jest.fn(),
  initiateEmailVerification: jest.fn(),
  resendEmailVerification: jest.fn(),
  verifyEmailToken: jest.fn(),
  completeRegistration: jest.fn(),
  requestLoginOTP: jest.fn(),
  resendLoginOTP: jest.fn(),
  loginWithPhone: jest.fn(),
  loginWithEmail: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  refreshAccessToken: jest.fn(),
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  forgotPassword: jest.fn(),
  validatePasswordResetToken: jest.fn(),
  resetPassword: jest.fn(),
  getCurrentUser: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock("../src/lib/prisma.js", () => ({ default: {} }));
jest.mock("../src/lib/redis.js", () => ({}));
jest.mock("../src/lib/sms.js", () => ({}));
jest.mock("../src/lib/email.js", () => ({}));
jest.mock("../src/lib/auth.js", () => ({
  JWT_SECRET: "test-secret-key",
  ACCESS_TOKEN_EXPIRY: "15m",
  ACCESS_TOKEN_EXPIRY_MS: 900_000,
  REFRESH_TOKEN_EXPIRY_MS: 604_800_000,
}));

// ── Stub authenticateUser so protected routes can be tested ──────────────────
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  authenticateUser: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { id: "user-1", email: "user@test.com" };
    next();
  },
  authenticateAdmin: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
}));

// ── Stub rate-limiters so they pass-through in tests ─────────────────────────
jest.mock("../src/middlewares/rateLimiter.middleware.js", () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  otpLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  passwordResetLimiter: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
}));

import userRouter from "../src/routes/user.routes.js";
import * as svc from "../src/services/user-auth.service.js";

const AuthError = _AuthError;

const app = express();
app.use(express.json());
app.use("/api/user", userRouter);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockResolvedOnce = (method: string, value: unknown) =>
  jest.spyOn(svc as any, method).mockResolvedValueOnce(value);

const mockRejectedOnce = (method: string, status: number, message: string) => {
  const err = new AuthError(status, message);
  jest.spyOn(svc as any, method).mockRejectedValueOnce(err);
};

// ─────────────────────────────────────────────────────────────────────────────

describe("User Authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Registration ──────────────────────────────────────────────────────────

  describe("POST /api/user/auth/register/initiate-phone", () => {
    it("returns 200 when phone is new and OTP is sent", async () => {
      mockResolvedOnce("initiatePhoneRegistration", {
        message: "OTP sent successfully",
      });
      const res = await request(app)
        .post("/api/user/auth/register/initiate-phone")
        .send({ phoneNumber: "+12025551234" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 for invalid phone format", async () => {
      const res = await request(app)
        .post("/api/user/auth/register/initiate-phone")
        .send({ phoneNumber: "not-a-phone" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 409 when phone is already registered", async () => {
      mockRejectedOnce(
        "initiatePhoneRegistration",
        409,
        "Phone already registered",
      );
      const res = await request(app)
        .post("/api/user/auth/register/initiate-phone")
        .send({ phoneNumber: "+12025551234" });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/user/auth/register/resend-phone-otp", () => {
    it("returns 200 on success", async () => {
      mockResolvedOnce("resendPhoneOTP", { message: "OTP resent" });
      const res = await request(app)
        .post("/api/user/auth/register/resend-phone-otp")
        .send({ phoneNumber: "+12025551234" });
      expect(res.status).toBe(200);
    });

    it("returns 400 for missing phone", async () => {
      const res = await request(app)
        .post("/api/user/auth/register/resend-phone-otp")
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/user/auth/register/verify-phone", () => {
    it("returns 200 when OTP is valid", async () => {
      mockResolvedOnce("verifyPhoneOTP", { sessionId: "sess-123" });
      const res = await request(app)
        .post("/api/user/auth/register/verify-phone")
        .send({ phoneNumber: "+12025551234", otp: "123456" });
      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe("sess-123");
    });

    it("returns 400 for missing otp field", async () => {
      const res = await request(app)
        .post("/api/user/auth/register/verify-phone")
        .send({ phoneNumber: "+12025551234" });
      expect(res.status).toBe(400);
    });

    it("returns 401 when OTP is wrong", async () => {
      mockRejectedOnce("verifyPhoneOTP", 401, "Invalid OTP");
      const res = await request(app)
        .post("/api/user/auth/register/verify-phone")
        .send({ phoneNumber: "+12025551234", otp: "000000" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/auth/register/initiate-email", () => {
    it("returns 200 when email is new", async () => {
      mockResolvedOnce("initiateEmailVerification", {
        message: "Verification email sent",
      });
      const res = await request(app)
        .post("/api/user/auth/register/initiate-email")
        .send({ email: "new@example.com", firstName: "Jane" });
      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/user/auth/register/initiate-email")
        .send({ email: "bad-email", firstName: "Jane" });
      expect(res.status).toBe(400);
    });

    it("returns 409 when email is taken", async () => {
      mockRejectedOnce(
        "initiateEmailVerification",
        409,
        "Email already in use",
      );
      const res = await request(app)
        .post("/api/user/auth/register/initiate-email")
        .send({ email: "taken@example.com", firstName: "Jane" });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/user/auth/register/verify-email", () => {
    it("returns 200 with valid token query param", async () => {
      mockResolvedOnce("verifyEmailToken", { message: "Email verified" });
      const res = await request(app).get(
        "/api/user/auth/register/verify-email?token=valid.token.here",
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when token query param is missing", async () => {
      const res = await request(app).get(
        "/api/user/auth/register/verify-email",
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 for expired token", async () => {
      mockRejectedOnce("verifyEmailToken", 401, "Token expired or invalid");
      const res = await request(app).get(
        "/api/user/auth/register/verify-email?token=expired.token",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/auth/register/complete", () => {
    const validBody = {
      sessionId: "sess-123",
      email: "new@example.com",
      password: "StrongP@ss1",
      firstName: "Jane",
      lastName: "Doe",
      username: "janedoe",
    };

    it("returns 201 on successful registration", async () => {
      mockResolvedOnce("completeRegistration", {
        user: { id: "u1", email: "new@example.com" },
        accessToken: "at",
        refreshToken: "rt",
      });
      const res = await request(app)
        .post("/api/user/auth/register/complete")
        .send(validBody);
      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBe("at");
    });

    it("returns 400 when required field is missing", async () => {
      const { password: _, ...incomplete } = validBody;
      const res = await request(app)
        .post("/api/user/auth/register/complete")
        .send(incomplete);
      expect(res.status).toBe(400);
    });

    it("returns 400 for weak password", async () => {
      const res = await request(app)
        .post("/api/user/auth/register/complete")
        .send({ ...validBody, password: "weak" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when session is expired", async () => {
      mockRejectedOnce("completeRegistration", 400, "Session expired");
      const res = await request(app)
        .post("/api/user/auth/register/complete")
        .send(validBody);
      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe("POST /api/user/auth/login/request-otp", () => {
    it("returns 200 and sends OTP", async () => {
      mockResolvedOnce("requestLoginOTP", { message: "OTP sent" });
      const res = await request(app)
        .post("/api/user/auth/login/request-otp")
        .send({ phoneNumber: "+12025551234" });
      expect(res.status).toBe(200);
    });

    it("returns 400 for missing phoneNumber", async () => {
      const res = await request(app)
        .post("/api/user/auth/login/request-otp")
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 when phone is not registered", async () => {
      mockRejectedOnce("requestLoginOTP", 404, "Phone number not registered");
      const res = await request(app)
        .post("/api/user/auth/login/request-otp")
        .send({ phoneNumber: "+10000000000" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/user/auth/login/phone", () => {
    it("returns 200 with tokens on valid OTP", async () => {
      mockResolvedOnce("loginWithPhone", {
        user: { id: "u1" },
        accessToken: "at",
        refreshToken: "rt",
      });
      const res = await request(app)
        .post("/api/user/auth/login/phone")
        .send({ phoneNumber: "+12025551234", otp: "123456" });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("at");
    });

    it("returns 401 for wrong OTP", async () => {
      mockRejectedOnce("loginWithPhone", 401, "Invalid OTP");
      const res = await request(app)
        .post("/api/user/auth/login/phone")
        .send({ phoneNumber: "+12025551234", otp: "000000" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/auth/login", () => {
    it("returns 200 with tokens on valid credentials", async () => {
      mockResolvedOnce("loginWithEmail", {
        user: { id: "u1" },
        accessToken: "at",
        refreshToken: "rt",
      });
      const res = await request(app)
        .post("/api/user/auth/login")
        .send({ email: "user@example.com", password: "P@ssw0rd" });
      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/user/auth/login")
        .send({ email: "bad", password: "P@ssw0rd" });
      expect(res.status).toBe(400);
    });

    it("returns 401 for wrong password", async () => {
      mockRejectedOnce("loginWithEmail", 401, "Invalid credentials");
      const res = await request(app)
        .post("/api/user/auth/login")
        .send({ email: "user@example.com", password: "wrong" });
      expect(res.status).toBe(401);
    });

    it("returns 403 for inactive account", async () => {
      mockRejectedOnce("loginWithEmail", 403, "Account is suspended");
      const res = await request(app)
        .post("/api/user/auth/login")
        .send({ email: "banned@example.com", password: "P@ssw0rd" });
      expect(res.status).toBe(403);
    });
  });

  // ── Session management ────────────────────────────────────────────────────

  describe("POST /api/user/auth/logout", () => {
    it("returns 200 on successful logout", async () => {
      mockResolvedOnce("logout", undefined);
      const res = await request(app)
        .post("/api/user/auth/logout")
        .send({ refreshToken: "rt123" });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/user/auth/logout/all", () => {
    it("returns 200 when authenticated", async () => {
      mockResolvedOnce("logoutAll", undefined);
      const res = await request(app)
        .post("/api/user/auth/logout/all")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/user/auth/refresh", () => {
    it("returns 200 with new access token", async () => {
      mockResolvedOnce("refreshAccessToken", { accessToken: "new-at" });
      const res = await request(app)
        .post("/api/user/auth/refresh")
        .send({ refreshToken: "rt123" });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("new-at");
    });

    it("returns 401 for invalid refresh token", async () => {
      mockRejectedOnce("refreshAccessToken", 401, "Invalid refresh token");
      const res = await request(app)
        .post("/api/user/auth/refresh")
        .send({ refreshToken: "bad" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/user/auth/sessions", () => {
    it("returns 200 with session list when authenticated", async () => {
      mockResolvedOnce("listSessions", [{ id: "s1", device: "Chrome" }]);
      const res = await request(app)
        .get("/api/user/auth/sessions")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
    });
  });

  describe("DELETE /api/user/auth/sessions/:sessionId", () => {
    it("returns 200 on successful revocation", async () => {
      mockResolvedOnce("revokeSession", undefined);
      const res = await request(app)
        .delete("/api/user/auth/sessions/session-abc")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
    });

    it("returns 404 when session not found", async () => {
      mockRejectedOnce("revokeSession", 404, "Session not found");
      const res = await request(app)
        .delete("/api/user/auth/sessions/nonexistent")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(404);
    });
  });

  // ── Password reset ────────────────────────────────────────────────────────

  describe("POST /api/user/auth/forgot-password", () => {
    it("returns 200 whether or not email exists (security)", async () => {
      mockResolvedOnce("forgotPassword", {
        message: "If that email exists, a link was sent",
      });
      const res = await request(app)
        .post("/api/user/auth/forgot-password")
        .send({ email: "user@example.com" });
      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid email", async () => {
      const res = await request(app)
        .post("/api/user/auth/forgot-password")
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/user/auth/reset-password/validate", () => {
    it("returns 200 for valid token", async () => {
      mockResolvedOnce("validatePasswordResetToken", {
        email: "user@example.com",
      });
      const res = await request(app).get(
        "/api/user/auth/reset-password/validate?token=valid.base64.token",
      );
      expect(res.status).toBe(200);
    });

    it("returns 400 when token is missing", async () => {
      const res = await request(app).get(
        "/api/user/auth/reset-password/validate",
      );
      expect(res.status).toBe(400);
    });

    it("returns 401 for expired token", async () => {
      mockRejectedOnce("validatePasswordResetToken", 401, "Token expired");
      const res = await request(app).get(
        "/api/user/auth/reset-password/validate?token=expired",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/auth/reset-password", () => {
    it("returns 200 on successful password reset", async () => {
      mockResolvedOnce("resetPassword", { message: "Password reset" });
      const res = await request(app)
        .post("/api/user/auth/reset-password")
        .send({
          token: "valid.base64.token",
          newPassword: "NewStr0ng@Pass",
        });
      expect(res.status).toBe(200);
    });

    it("returns 400 for weak password", async () => {
      const res = await request(app)
        .post("/api/user/auth/reset-password")
        .send({
          token: "valid.token",
          newPassword: "weak",
        });
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid token", async () => {
      mockRejectedOnce("resetPassword", 401, "Invalid or expired token");
      const res = await request(app)
        .post("/api/user/auth/reset-password")
        .send({
          token: "bad.token",
          newPassword: "NewStr0ng@Pass",
        });
      expect(res.status).toBe(401);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────

  describe("GET /api/user/auth/me", () => {
    it("returns 200 with current user when authenticated", async () => {
      mockResolvedOnce("getCurrentUser", {
        id: "u1",
        email: "user@test.com",
        firstName: "Jane",
      });
      const res = await request(app)
        .get("/api/user/auth/me")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe("u1");
    });
  });

  describe("PUT /api/user/auth/me", () => {
    it("returns 200 when profile updated", async () => {
      mockResolvedOnce("updateUserProfile", {
        id: "u1",
        firstName: "Updated",
      });
      const res = await request(app)
        .put("/api/user/auth/me")
        .set("Authorization", "Bearer validtoken")
        .send({ firstName: "Updated" });
      expect(res.status).toBe(200);
    });

    it("returns 409 when username is taken", async () => {
      mockRejectedOnce("updateUserProfile", 409, "Username already taken");
      const res = await request(app)
        .put("/api/user/auth/me")
        .set("Authorization", "Bearer validtoken")
        .send({ username: "taken" });
      expect(res.status).toBe(409);
    });
  });
});
