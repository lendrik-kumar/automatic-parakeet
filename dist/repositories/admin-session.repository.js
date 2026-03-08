import prisma from "../lib/prisma.js";
import { REFRESH_TOKEN_EXPIRY_MS } from "../lib/auth.js";
// ─── Repository ───────────────────────────────────────────────────────────────
export const adminSessionRepository = {
    /** Create a new admin session */
    create: (data) => prisma.adminSession.create({
        data: {
            adminId: data.adminId,
            device: data.device ?? "Unknown Device",
            ipAddress: data.ipAddress ?? "Unknown IP",
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt ?? new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
        },
    }),
    /** Find a session by its refresh token */
    findByRefreshToken: (refreshToken) => prisma.adminSession.findFirst({
        where: { refreshToken },
        include: {
            admin: {
                include: { role: true },
            },
        },
    }),
    /** Find a session by id scoped to an admin */
    findByIdAndAdmin: (id, adminId) => prisma.adminSession.findFirst({ where: { id, adminId } }),
    /** List all sessions for an admin */
    listByAdmin: (adminId) => prisma.adminSession.findMany({
        where: { adminId },
        select: {
            id: true,
            device: true,
            ipAddress: true,
            createdAt: true,
            expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
    }),
    /** Rotate refresh token */
    rotate: async (oldRefreshToken, newRefreshToken) => {
        const session = await prisma.adminSession.findFirst({
            where: { refreshToken: oldRefreshToken },
        });
        if (!session)
            return null;
        return prisma.adminSession.update({
            where: { id: session.id },
            data: {
                refreshToken: newRefreshToken,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
            },
            include: {
                admin: { include: { role: true } },
            },
        });
    },
    /** Delete a single session by id */
    delete: (id) => prisma.adminSession.delete({ where: { id } }),
    /** Delete session by refresh token */
    deleteByRefreshToken: async (refreshToken) => {
        const session = await prisma.adminSession.findFirst({
            where: { refreshToken },
        });
        if (session) {
            await prisma.adminSession.delete({ where: { id: session.id } });
            return session;
        }
        return null;
    },
    /** Delete all sessions for an admin */
    deleteAllByAdmin: (adminId) => prisma.adminSession.deleteMany({ where: { adminId } }),
};
