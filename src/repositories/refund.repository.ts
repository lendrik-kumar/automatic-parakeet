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

  updateStatus: (
    id: string,
    refundStatus: RefundStatus,
    extra?: { processedAt?: Date },
  ) =>
    prisma.refund.update({ where: { id }, data: { refundStatus, ...extra } }),
};
