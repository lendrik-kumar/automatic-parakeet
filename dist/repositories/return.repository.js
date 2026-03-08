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
    updateStatus: (id, returnStatus) => prisma.returnRequest.update({ where: { id }, data: { returnStatus } }),
};
