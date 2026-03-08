import prisma from "../lib/prisma.js";
import type { AdminActionType } from "../generated/prisma/enums.js";

export class ActivityLogError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ActivityLogError";
  }
}

export const listActivityLogs = async (query: {
  page?: number;
  limit?: number;
  adminId?: string;
  entityType?: string;
  action?: AdminActionType;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.adminId) where.adminId = query.adminId;
  if (query.entityType) where.entityType = query.entityType;
  if (query.action) where.action = query.action;

  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      where: where as never,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        admin: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.adminActivityLog.count({ where: where as never }),
  ]);

  return {
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
