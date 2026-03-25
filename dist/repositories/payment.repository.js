import prisma from "../lib/prisma.js";
export const paymentRepository = {
    findById: (id) => prisma.payment.findUnique({
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
    findByTransactionId: (transactionId) => prisma.payment.findUnique({
        where: { transactionId },
        include: { order: true },
    }),
    findByRazorpayOrderId: (razorpayOrderId) => prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { order: true },
    }),
    findByRazorpayPaymentId: (razorpayPaymentId) => prisma.payment.findUnique({
        where: { razorpayPaymentId },
        include: { order: true },
    }),
    create: (data) => prisma.payment.create({
        data: {
            ...data,
            paymentStatus: "PENDING",
        },
    }),
    updateStatus: (id, paymentStatus, extra) => prisma.payment.update({
        where: { id },
        data: { paymentStatus, ...extra },
    }),
    updateRazorpayDetails: (id, data) => prisma.payment.update({
        where: { id },
        data,
        include: {
            order: true,
        },
    }),
    markAsFailed: (id, failureReason) => prisma.payment.update({
        where: { id },
        data: {
            paymentStatus: "FAILED",
            failureReason,
        },
    }),
    markAsCompleted: (id, data) => prisma.payment.update({
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
