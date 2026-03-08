/**
 * Admin Authentication Service
 *
 * All admin-facing authentication business logic lives here.
 * Admin auth is intentionally kept separate from user auth for clear
 * separation of concerns (different session tables, activity logging,
 * role-based access considerations).
 *
 * Token strategy mirrors the user auth service:
 *   • Access token  — short-lived JWT (15 min), type: "admin"
 *   • Refresh token — opaque 64-byte hex string, rotated on every use
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { JWT_SECRET, ACCESS_TOKEN_EXPIRY } from "../lib/auth.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { adminSessionRepository } from "../repositories/admin-session.repository.js";

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class AdminAuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

/** Sign a 15-minute JWT access token for an admin. */
const signAdminAccessToken = (
  adminId: string,
  email: string,
  roleId: string,
): string =>
  jwt.sign(
    { id: adminId, email, roleId, type: "admin" },
    JWT_SECRET as jwt.Secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions,
  );

/** Generate an opaque, cryptographically random refresh token. */
const newRefreshToken = (): string => crypto.randomBytes(64).toString("hex");

/** Extract device/IP from an Express-like request object. */
export const extractRequestInfo = (req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}) => ({
  device: (req.headers["user-agent"] as string) ?? "Unknown Device",
  ipAddress:
    ((req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip) ||
    "Unknown IP",
});

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Admin login with email + password.
 * POST /api/admin/auth/login
 */
export const adminLogin = async (
  email: string,
  password: string,
  requestInfo: { device: string; ipAddress: string },
) => {
  const admin = await adminRepository.findByEmail(email);
  if (!admin) throw new AdminAuthError(401, "Invalid credentials");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AdminAuthError(401, "Invalid credentials");

  if (admin.accountStatus !== "ACTIVE") {
    throw new AdminAuthError(
      403,
      `Account is ${admin.accountStatus.toLowerCase()}`,
    );
  }

  const refreshToken = newRefreshToken();
  const session = await adminSessionRepository.create({
    adminId: admin.id,
    device: requestInfo.device,
    ipAddress: requestInfo.ipAddress,
    refreshToken,
  });

  await adminRepository.touchLastLogin(admin.id);

  // Activity log
  await adminRepository.logActivity(
    admin.id,
    "ACTIVATE",
    "AdminSession",
    session.id,
    undefined,
    {
      device: requestInfo.device,
      ipAddress: requestInfo.ipAddress,
      timestamp: new Date(),
    },
  );

  const accessToken = signAdminAccessToken(admin.id, admin.email, admin.roleId);

  return {
    admin: {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      accountStatus: admin.accountStatus,
      lastLogin: admin.lastLogin,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Admin logout: invalidate the given refresh token.
 * POST /api/admin/auth/logout
 */
export const adminLogout = async (
  adminId: string | undefined,
  refreshToken: string,
): Promise<void> => {
  const session =
    await adminSessionRepository.deleteByRefreshToken(refreshToken);
  if (session && adminId) {
    await adminRepository.logActivity(
      adminId,
      "DEACTIVATE",
      "AdminSession",
      session.id,
    );
  }
};

/**
 * Logout from ALL devices (destroy every session for this admin).
 * POST /api/admin/auth/logout/all
 */
export const adminLogoutAll = async (adminId: string): Promise<void> => {
  await adminSessionRepository.deleteAllByAdmin(adminId);
  await adminRepository.logActivity(
    adminId,
    "DEACTIVATE",
    "AdminSession",
    undefined,
    undefined,
    {
      note: "Logged out from all devices",
    },
  );
};

/**
 * Rotate refresh token and issue a new access token.
 * POST /api/admin/auth/refresh
 */
export const adminRefreshToken = async (refreshToken: string) => {
  const newRT = newRefreshToken();
  const session = await adminSessionRepository.rotate(refreshToken, newRT);

  if (!session) throw new AdminAuthError(401, "Invalid refresh token");

  if (session.expiresAt < new Date()) {
    await adminSessionRepository.delete(session.id);
    throw new AdminAuthError(401, "Refresh token expired");
  }

  if (session.admin.accountStatus !== "ACTIVE") {
    throw new AdminAuthError(403, "Account is not active");
  }

  const accessToken = signAdminAccessToken(
    session.admin.id,
    session.admin.email,
    session.admin.roleId,
  );

  return { accessToken, refreshToken: newRT };
};

// ─── Profile & Session Management ────────────────────────────────────────────

/** Get authenticated admin's profile with active sessions. */
export const getCurrentAdmin = (adminId: string) =>
  adminRepository.getProfileWithSessions(adminId);

/** List all active sessions for an admin. */
export const listAdminSessions = (adminId: string) =>
  adminSessionRepository.listByAdmin(adminId);

/**
 * Revoke a specific admin session.
 * DELETE /api/admin/auth/sessions/:sessionId
 */
export const revokeAdminSession = async (
  sessionId: string,
  adminId: string,
): Promise<void> => {
  const session = await adminSessionRepository.findByIdAndAdmin(
    sessionId,
    adminId,
  );
  if (!session) throw new AdminAuthError(404, "Session not found");

  await adminSessionRepository.delete(sessionId);
  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "AdminSession",
    sessionId,
  );
};

// ─── Activity Logs ────────────────────────────────────────────────────────────

/** Paginated activity logs. */
export const getAdminActivityLogs = async (
  adminId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await adminRepository.getActivityLogs(
    adminId,
    skip,
    limit,
  );
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
