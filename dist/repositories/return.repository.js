import prisma from "../lib/prisma.js";
export const returnRepository = {
    create: (data) => prisma.returnRequest.create({ data }),
    createItem: (data) => prisma.returnItem.create({ data }),
    findById: (id) => prisma.returnRequest.findUnique({
        where: { id },
        include: {
            items: true,
            order: {
                select: { id: true, orderNumber: true, orderStatus: true },
                include: { items: true },
            },
            customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
    }),
    findByCustomer: (customerId, skip, take) => Promise.all([
        prisma.returnRequest.findMany({
            where: { customerId },
            skip,
            take,
            orderBy: { requestedAt: "desc" },
            include: {
                order: { select: { id: true, orderNumber: true } },
                items: true,
            },
        }),
        prisma.returnRequest.count({ where: { customerId } }),
    ]),
    findMany: (skip, take, where) => Promise.all([
        prisma.returnRequest.findMany({
            where: where,
            skip,
            take,
            orderBy: { requestedAt: "desc" },
            include: {
                customer: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                order: { select: { id: true, orderNumber: true } },
                items: true,
            },
        }),
        prisma.returnRequest.count({ where: where }),
    ]),
    findManyAdvanced: (skip, take, filters) => {
        const where = {};
        if (filters?.status)
            where.returnStatus = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.requestedAt = {};
            if (filters.startDate) {
                where.requestedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.requestedAt.lte = filters.endDate;
            }
        }
        if (filters?.search) {
            where.OR = [
                { reason: { contains: filters.search, mode: "insensitive" } },
                { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
                { customer: { email: { contains: filters.search, mode: "insensitive" } } },
            ];
        }
        return Promise.all([
            prisma.returnRequest.findMany({
                where: where,
                skip,
                take,
                orderBy: { requestedAt: "desc" },
                include: {
                    customer: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    order: { select: { id: true, orderNumber: true } },
                    items: true,
                },
            }),
            prisma.returnRequest.count({ where: where }),
        ]);
    },
    updateStatus: (id, returnStatus) => prisma.returnRequest.update({ where: { id }, data: { returnStatus } }),
    bulkUpdateStatus: (returnIds, returnStatus) => prisma.returnRequest.updateMany({
        where: { id: { in: returnIds } },
        data: { returnStatus },
    }),
    aggregateByStatus: () => prisma.returnRequest.groupBy({
        by: ["returnStatus"],
        _count: { _all: true },
    }),
    findForExport: (filters) => {
        const where = {};
        if (filters?.status)
            where.returnStatus = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.requestedAt = {};
            if (filters.startDate) {
                where.requestedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.requestedAt.lte = filters.endDate;
            }
        }
        return prisma.returnRequest.findMany({
            where: where,
            orderBy: { requestedAt: "desc" },
            include: {
                customer: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                order: { select: { id: true, orderNumber: true } },
                items: true,
            },
        });
    },
};
