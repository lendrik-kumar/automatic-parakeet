import prisma from "../lib/prisma.js";
import type { PaymentStatus, PaymentMethod, PaymentProvider } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

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

  findByRazorpayOrderId: (razorpayOrderId: string) =>
    prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { order: true },
    }),

  findByRazorpayPaymentId: (razorpayPaymentId: string) =>
    prisma.payment.findUnique({
      where: { razorpayPaymentId },
      include: { order: true },
    }),

  create: (data: {
    orderId: string;
    paymentMethod: PaymentMethod;
    paymentProvider: PaymentProvider;
    amount: number;
    currency: string;
    razorpayOrderId?: string;
  }) =>
    prisma.payment.create({
      data: {
        ...data,
        paymentStatus: "PENDING",
      },
    }),

  updateStatus: (
    id: string,
    paymentStatus: PaymentStatus,
    extra?: {
      transactionId?: string;
      paidAt?: Date;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      failureReason?: string;
    },
  ) =>
    prisma.payment.update({
      where: { id },
      data: { paymentStatus, ...extra },
    }),

  updateRazorpayDetails: (
    id: string,
    data: Prisma.PaymentUpdateInput,
  ) =>
    prisma.payment.update({
      where: { id },
      data,
      include: {
        order: true,
      },
    }),

  markAsFailed: (id: string, failureReason: string) =>
    prisma.payment.update({
      where: { id },
      data: {
        paymentStatus: "FAILED",
        failureReason,
      },
    }),

  markAsCompleted: (
    id: string,
    data: {
      razorpayPaymentId: string;
      razorpaySignature: string;
      transactionId?: string;
    },
  ) =>
    prisma.payment.update({
      where: { id },
      data: {
        paymentStatus: "COMPLETED",
        paidAt: new Date(),
        ...data,
      },
      include: {
        order: true,
      },
    }),
};
