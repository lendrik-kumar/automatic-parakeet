import prisma from "../lib/prisma.js";
export class ActivityLogError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ActivityLogError";
    }
}
export const listActivityLogs = async (query) => {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {};
    if (query.adminId)
        where.adminId = query.adminId;
    if (query.entityType)
        where.entityType = query.entityType;
    if (query.action)
        where.action = query.action;
    const [logs, total] = await Promise.all([
        prisma.adminActivityLog.findMany({
            where: where,
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
            include: {
                admin: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        }),
        prisma.adminActivityLog.count({ where: where }),
    ]);
    return {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
