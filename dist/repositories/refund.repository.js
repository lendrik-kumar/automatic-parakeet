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
    findManyAdvanced: (skip, take, filters) => {
        const where = {};
        if (filters?.status)
            where.refundStatus = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters.endDate)
                where.createdAt.lte = filters.endDate;
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
                where: where,
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
            prisma.refund.count({ where: where }),
        ]);
    },
    updateStatus: (id, refundStatus, extra) => prisma.refund.update({ where: { id }, data: { refundStatus, ...extra } }),
    bulkUpdateStatus: (refundIds, refundStatus) => prisma.refund.updateMany({
        where: { id: { in: refundIds } },
        data: {
            refundStatus,
            processedAt: refundStatus === "COMPLETED" ? new Date() : undefined,
        },
    }),
    aggregateByStatus: () => prisma.refund.groupBy({
        by: ["refundStatus"],
        _count: { _all: true },
        _sum: { refundAmount: true },
    }),
    findForExport: (filters) => {
        const where = {};
        if (filters?.status)
            where.refundStatus = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.createdAt.lte = filters.endDate;
            }
        }
        return prisma.refund.findMany({
            where: where,
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
