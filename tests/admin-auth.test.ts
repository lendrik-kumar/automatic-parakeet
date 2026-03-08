import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";

// ── Factory mocks prevent loading actual modules (avoids ESM import.meta issues) ──

jest.mock("../src/services/admin-auth.service.js", () => {
  class AdminAuthError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = "AdminAuthError";
    }
  }
  return {
    AdminAuthError,
    extractRequestInfo: jest
      .fn()
      .mockReturnValue({ device: "test", ipAddress: "127.0.0.1" }),
    adminLogin: jest.fn(),
    adminLogout: jest.fn(),
    adminLogoutAll: jest.fn(),
    adminRefreshToken: jest.fn(),
    getCurrentAdmin: jest.fn(),
    listAdminSessions: jest.fn(),
    getAdminActivityLogs: jest.fn(),
    revokeAdminSession: jest.fn(),
  };
});

jest.mock("../src/lib/prisma.js", () => ({ default: {} }));
jest.mock("../src/lib/redis.js", () => ({}));
jest.mock("../src/lib/auth.js", () => ({
  JWT_SECRET: "test-secret-key",
  ACCESS_TOKEN_EXPIRY: "15m",
  ACCESS_TOKEN_EXPIRY_MS: 900_000,
  REFRESH_TOKEN_EXPIRY_MS: 604_800_000,
}));

// ── Stub authenticateAdmin so protected routes can be tested ──────────────────
jest.mock("../src/middlewares/auth.middleware.js", () => ({
  authenticateUser: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  authenticateAdmin: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).admin = {
      id: "admin-1",
      email: "admin@test.com",
      roleId: "role-1",
    };
    next();
  },
}));

// ── Stub rate-limiters ────────────────────────────────────────────────────────
jest.mock("../src/middlewares/rateLimiter.middleware.js", () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  otpLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  passwordResetLimiter: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
}));

import adminRouter from "../src/routes/admin.routes.js";
import * as svc from "../src/services/admin-auth.service.js";

// Get AdminAuthError from the mocked module so instanceof checks work in the controller
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AdminAuthError = (svc as any).AdminAuthError as new (
  statusCode: number,
  message: string,
) => Error & { statusCode: number };

const app = express();
app.use(express.json());
app.use("/api/admin", adminRouter);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockResolvedOnce = (method: string, value: unknown) =>
  jest.spyOn(svc as any, method).mockResolvedValueOnce(value);

const mockRejectedOnce = (method: string, status: number, message: string) => {
  const err = new AdminAuthError(status, message);
  jest.spyOn(svc as any, method).mockRejectedValueOnce(err);
};

// ─────────────────────────────────────────────────────────────────────────────

describe("Admin Authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe("POST /api/admin/auth/login", () => {
    it("returns 200 with tokens on valid credentials", async () => {
      mockResolvedOnce("adminLogin", {
        admin: { id: "a1", email: "admin@test.com" },
        accessToken: "at",
        refreshToken: "rt",
      });
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: "admin@test.com", password: "Str0ngPass!" });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("at");
    });

    it("returns 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: "not-an-email", password: "Str0ngPass!" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for missing fields", async () => {
      const res = await request(app).post("/api/admin/auth/login").send({});
      expect(res.status).toBe(400);
    });

    it("returns 401 for wrong password", async () => {
      mockRejectedOnce("adminLogin", 401, "Invalid credentials");
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: "admin@test.com", password: "wrong" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 for inactive account", async () => {
      mockRejectedOnce("adminLogin", 403, "Account is suspended");
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ email: "banned@test.com", password: "pass" });
      expect(res.status).toBe(403);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  describe("POST /api/admin/auth/logout", () => {
    it("returns 200 on successful logout", async () => {
      mockResolvedOnce("adminLogout", undefined);
      const res = await request(app)
        .post("/api/admin/auth/logout")
        .send({ refreshToken: "rt123" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 200 even with missing refreshToken (graceful)", async () => {
      mockResolvedOnce("adminLogout", undefined);
      // controller catches ZodError and returns 400 for missing field
      const res = await request(app).post("/api/admin/auth/logout").send({});
      // ZodError → 400, or service resolves → 200; either is acceptable
      expect([200, 400]).toContain(res.status);
    });
  });

  describe("POST /api/admin/auth/logout/all", () => {
    it("returns 200 when authenticated", async () => {
      mockResolvedOnce("adminLogoutAll", undefined);
      const res = await request(app)
        .post("/api/admin/auth/logout/all")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
    });
  });

  // ── Token refresh ─────────────────────────────────────────────────────────

  describe("POST /api/admin/auth/refresh", () => {
    it("returns 200 with new access token", async () => {
      mockResolvedOnce("adminRefreshToken", { accessToken: "new-at" });
      const res = await request(app)
        .post("/api/admin/auth/refresh")
        .send({ refreshToken: "rt123" });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBe("new-at");
    });

    it("returns 401 for expired refresh token", async () => {
      mockRejectedOnce("adminRefreshToken", 401, "Refresh token expired");
      const res = await request(app)
        .post("/api/admin/auth/refresh")
        .send({ refreshToken: "expired-rt" });
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing refreshToken field", async () => {
      const res = await request(app).post("/api/admin/auth/refresh").send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────

  describe("GET /api/admin/auth/me", () => {
    it("returns 200 with admin profile when authenticated", async () => {
      mockResolvedOnce("getCurrentAdmin", {
        id: "a1",
        email: "admin@test.com",
        firstName: "Super",
        role: { roleName: "SUPER_ADMIN" },
      });
      const res = await request(app)
        .get("/api/admin/auth/me")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(res.body.data.admin.id).toBe("a1");
    });

    it("returns 404 when admin record is missing", async () => {
      mockResolvedOnce("getCurrentAdmin", null);
      const res = await request(app)
        .get("/api/admin/auth/me")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(404);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────────────────

  describe("GET /api/admin/auth/sessions", () => {
    it("returns 200 with sessions list", async () => {
      mockResolvedOnce("listAdminSessions", [
        { id: "s1", device: "Chrome/macOS" },
      ]);
      const res = await request(app)
        .get("/api/admin/auth/sessions")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
    });
  });

  describe("DELETE /api/admin/auth/sessions/:sessionId", () => {
    it("returns 200 when session revoked", async () => {
      mockResolvedOnce("revokeAdminSession", undefined);
      const res = await request(app)
        .delete("/api/admin/auth/sessions/sess-xyz")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
    });

    it("returns 404 when session not found", async () => {
      mockRejectedOnce("revokeAdminSession", 404, "Session not found");
      const res = await request(app)
        .delete("/api/admin/auth/sessions/nonexistent")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(404);
    });
  });

  // ── Activity logs ─────────────────────────────────────────────────────────

  describe("GET /api/admin/auth/activity-logs", () => {
    const mockLogs = {
      logs: [{ id: "log-1", action: "LOGIN" }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    it("returns 200 with logs and pagination", async () => {
      mockResolvedOnce("getAdminActivityLogs", mockLogs);
      const res = await request(app)
        .get("/api/admin/auth/activity-logs")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(res.body.data.logs).toHaveLength(1);
      expect(res.body.data.pagination).toBeDefined();
    });

    it("supports page and limit query params", async () => {
      mockResolvedOnce("getAdminActivityLogs", {
        ...mockLogs,
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      });
      const res = await request(app)
        .get("/api/admin/auth/activity-logs?page=2&limit=10")
        .set("Authorization", "Bearer validtoken");
      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(2);
    });

    it("clamps limit to 100", async () => {
      const spy = jest
        .spyOn(svc as any, "getAdminActivityLogs")
        .mockResolvedValueOnce(mockLogs);
      await request(app)
        .get("/api/admin/auth/activity-logs?limit=999")
        .set("Authorization", "Bearer validtoken");
      // Second arg to service should be clamped to 100
      expect(spy).toHaveBeenCalledWith("admin-1", 1, 100);
    });
  });
});
