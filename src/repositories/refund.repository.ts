import prisma from "../lib/prisma.js";
import type { RefundStatus } from "../generated/prisma/enums.js";

export const refundRepository = {
  create: (data: {
    paymentId: string;
    orderId: string;
    refundAmount: number;
    refundReason: string;
  }) => prisma.refund.create({ data }),

  findById: (id: string) =>
    prisma.refund.findUnique({
      where: { id },
      include: {
        payment: {
          select: { id: true, transactionId: true, paymentMethod: true },
        },
        order: { select: { id: true, orderNumber: true } },
      },
    }),

  findMany: (skip: number, take: number, where?: Record<string, unknown>) =>
    Promise.all([
      prisma.refund.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          payment: { select: { id: true, transactionId: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      }),
      prisma.refund.count({ where: where as never }),
    ]),

  findManyAdvanced: (
    skip: number,
    take: number,
    filters?: {
      status?: RefundStatus;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) => {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.refundStatus = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
    if (filters?.search) {
      where.OR = [
        {
          refundReason: { contains: filters.search, mode: "insensitive" },
        },
        { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
        {
          payment: {
            transactionId: { contains: filters.search, mode: "insensitive" },
          },
        },
      ];
    }

    return Promise.all([
      prisma.refund.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              transactionId: true,
              paymentMethod: true,
              paymentStatus: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.refund.count({ where: where as never }),
    ]);
  },

  updateStatus: (
    id: string,
    refundStatus: RefundStatus,
    extra?: { processedAt?: Date },
  ) =>
    prisma.refund.update({ where: { id }, data: { refundStatus, ...extra } }),

  bulkUpdateStatus: (refundIds: string[], refundStatus: RefundStatus) =>
    prisma.refund.updateMany({
      where: { id: { in: refundIds } },
      data: {
        refundStatus,
        processedAt: refundStatus === "COMPLETED" ? new Date() : undefined,
      },
    }),

  aggregateByStatus: () =>
    prisma.refund.groupBy({
      by: ["refundStatus"],
      _count: { _all: true },
      _sum: { refundAmount: true },
    }),

  findForExport: (filters?: {
    status?: RefundStatus;
    startDate?: Date;
    endDate?: Date;
  }) => {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.refundStatus = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
      }
    }

    return prisma.refund.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          select: { id: true, transactionId: true, paymentMethod: true },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  },
};
