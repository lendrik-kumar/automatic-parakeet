import prisma from "../lib/prisma.js";
import type { PaymentStatus } from "../generated/prisma/enums.js";

export const paymentRepository = {
  findById: (id: string) =>
    prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerId: true,
            orderStatus: true,
          },
        },
        refunds: true,
      },
    }),

  findByTransactionId: (transactionId: string) =>
    prisma.payment.findUnique({
      where: { transactionId },
      include: { order: true },
    }),

  updateStatus: (
    id: string,
    paymentStatus: PaymentStatus,
    extra?: { transactionId?: string; paidAt?: Date },
  ) =>
    prisma.payment.update({
      where: { id },
      data: { paymentStatus, ...extra },
    }),
};
