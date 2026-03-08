import prisma from "../lib/prisma.js";

// ─── Repository ───────────────────────────────────────────────────────────────

export const adminRepository = {
  /** Find an admin by primary key */
  findById: (id: string) =>
    prisma.admin.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, roleName: true, description: true } },
      },
    }),

  /** Find an admin by email */
  findByEmail: (email: string) =>
    prisma.admin.findUnique({
      where: { email },
      include: {
        role: { select: { id: true, roleName: true, description: true } },
      },
    }),

  /** Stamp last login timestamp */
  touchLastLogin: (id: string) =>
    prisma.admin.update({ where: { id }, data: { lastLogin: new Date() } }),

  /** Fetch profile with active sessions */
  getProfileWithSessions: (id: string) =>
    prisma.admin.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, roleName: true, description: true } },
        sessions: {
          select: {
            id: true,
            device: true,
            ipAddress: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),

  /** Write an activity log entry */
  logActivity: (
    adminId: string,
    action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE",
    entityType: string,
    entityId?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
  ) =>
    prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
      },
    }),

  /** Paginated activity logs for an admin */
  getActivityLogs: (adminId: string, skip: number, take: number) =>
    Promise.all([
      prisma.adminActivityLog.findMany({
        where: { adminId },
        orderBy: { timestamp: "desc" },
        take,
        skip,
      }),
      prisma.adminActivityLog.count({ where: { adminId } }),
    ]),
};
