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
    updateStatus: (id, paymentStatus, extra) => prisma.payment.update({
        where: { id },
        data: { paymentStatus, ...extra },
    }),
};
