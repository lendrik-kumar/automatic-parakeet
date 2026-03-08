import prisma from "../lib/prisma.js";
import { REFRESH_TOKEN_EXPIRY_MS } from "../lib/auth.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateUserSessionInput {
  userId: string;
  device?: string;
  ipAddress?: string;
  refreshToken: string;
  expiresAt?: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const userSessionRepository = {
  /** Create a new session */
  create: (data: CreateUserSessionInput) =>
    prisma.userSession.create({
      data: {
        userId: data.userId,
        device: data.device ?? "Unknown Device",
        ipAddress: data.ipAddress ?? "Unknown IP",
        refreshToken: data.refreshToken,
        expiresAt:
          data.expiresAt ?? new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    }),

  /** Find a session by its refresh token */
  findByRefreshToken: (refreshToken: string) =>
    prisma.userSession.findFirst({
      where: { refreshToken },
      include: { user: true },
    }),

  /** Find a session by id scoped to a user */
  findByIdAndUser: (id: string, userId: string) =>
    prisma.userSession.findFirst({ where: { id, userId } }),

  /** List all sessions for a user */
  listByUser: (userId: string) =>
    prisma.userSession.findMany({
      where: { userId },
      select: {
        id: true,
        device: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

  /** Rotate refresh token (invalidate old, issue new) */
  rotate: async (oldRefreshToken: string, newRefreshToken: string) => {
    const session = await prisma.userSession.findFirst({
      where: { refreshToken: oldRefreshToken },
    });
    if (!session) return null;

    return prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
      include: { user: true },
    });
  },

  /** Delete a single session */
  delete: (id: string) => prisma.userSession.delete({ where: { id } }),

  /** Delete session by refresh token */
  deleteByRefreshToken: async (refreshToken: string) => {
    const session = await prisma.userSession.findFirst({
      where: { refreshToken },
    });
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } });
      return session;
    }
    return null;
  },

  /** Delete all sessions for a user (logout from all devices) */
  deleteAllByUser: (userId: string) =>
    prisma.userSession.deleteMany({ where: { userId } }),
};
