import prisma from "../lib/prisma.js";
export const refundRepository = {
    create: (data) => prisma.refund.create({ data }),
    findById: (id) => prisma.refund.findUnique({
        where: { id },
        include: {
            payment: {
                select: { id: true, transactionId: true, paymentMethod: true },
            },
            order: { select: { id: true, orderNumber: true } },
        },
    }),
    findMany: (skip, take, where) => Promise.all([
        prisma.refund.findMany({
            where: where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                payment: { select: { id: true, transactionId: true } },
                order: { select: { id: true, orderNumber: true } },
            },
        }),
        prisma.refund.count({ where: where }),
    ]),
    updateStatus: (id, refundStatus, extra) => prisma.refund.update({ where: { id }, data: { refundStatus, ...extra } }),
};
