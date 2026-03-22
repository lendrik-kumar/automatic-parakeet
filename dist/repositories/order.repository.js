import prisma from "../lib/prisma.js";
export const orderRepository = {
    create: (data) => prisma.order.create({ data }),
    findById: (id) => prisma.order.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: { select: { id: true, name: true, slug: true } },
                    variant: {
                        select: { id: true, sku: true, size: true, color: true },
                    },
                },
            },
            addresses: true,
            payments: true,
            shipments: true,
            returnRequests: { include: { items: true } },
            refunds: true,
            customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
    }),
    findByOrderNumber: (orderNumber) => prisma.order.findUnique({
        where: { orderNumber },
        include: {
            items: true,
            addresses: true,
            payments: true,
            shipments: true,
        },
    }),
    findByCustomer: (customerId, skip, take) => Promise.all([
        prisma.order.findMany({
            where: { customerId },
            skip,
            take,
            orderBy: { placedAt: "desc" },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true } },
                    },
                },
                payments: { select: { paymentStatus: true } },
                shipments: { select: { shippingStatus: true } },
            },
        }),
        prisma.order.count({ where: { customerId } }),
    ]),
    findMany: (params) => Promise.all([
        prisma.order.findMany({
            where: params.where,
            skip: params.skip,
            take: params.take,
            orderBy: { placedAt: "desc" },
            include: {
                customer: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                items: {
                    select: {
                        id: true,
                        productNameSnapshot: true,
                        quantity: true,
                        total: true,
                    },
                },
                payments: { select: { paymentStatus: true, amount: true } },
            },
        }),
        prisma.order.count({ where: params.where }),
    ]),
    findManyAdvanced: (params) => {
        const where = {};
        if (params.status)
            where.orderStatus = params.status;
        if (params.paymentStatus)
            where.paymentStatus = params.paymentStatus;
        if (params.fulfillmentStatus)
            where.fulfillmentStatus = params.fulfillmentStatus;
        if (params.customerId)
            where.customerId = params.customerId;
        if (params.productId) {
            where.items = { some: { productId: params.productId } };
        }
        if (params.startDate || params.endDate) {
            where.placedAt = {};
            if (params.startDate)
                where.placedAt.gte = params.startDate;
            if (params.endDate)
                where.placedAt.lte = params.endDate;
        }
        if (params.search) {
            where.OR = [
                {
                    orderNumber: { contains: params.search, mode: "insensitive" },
                },
                {
                    customer: { email: { contains: params.search, mode: "insensitive" } },
                },
                {
                    customer: {
                        firstName: { contains: params.search, mode: "insensitive" },
                    },
                },
                {
                    customer: {
                        lastName: { contains: params.search, mode: "insensitive" },
                    },
                },
            ];
        }
        return Promise.all([
            prisma.order.findMany({
                where: where,
                skip: params.skip,
                take: params.take,
                orderBy: { placedAt: "desc" },
                include: {
                    customer: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    items: {
                        select: {
                            id: true,
                            productId: true,
                            productNameSnapshot: true,
                            quantity: true,
                            total: true,
                        },
                    },
                    payments: { select: { paymentStatus: true, amount: true } },
                    shipments: { select: { shippingStatus: true } },
                },
            }),
            prisma.order.count({ where: where }),
        ]);
    },
    bulkUpdateStatus: (orderIds, orderStatus) => prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { orderStatus },
    }),
    searchMany: (query, skip, take) => Promise.all([
        prisma.order.findMany({
            where: {
                OR: [
                    { orderNumber: { contains: query, mode: "insensitive" } },
                    { customer: { email: { contains: query, mode: "insensitive" } } },
                    {
                        customer: {
                            firstName: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        customer: {
                            lastName: { contains: query, mode: "insensitive" },
                        },
                    },
                ],
            },
            skip,
            take,
            orderBy: { placedAt: "desc" },
            include: {
                customer: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                items: {
                    select: {
                        id: true,
                        productNameSnapshot: true,
                        quantity: true,
                        total: true,
                    },
                },
                payments: { select: { paymentStatus: true, amount: true } },
            },
        }),
        prisma.order.count({
            where: {
                OR: [
                    { orderNumber: { contains: query, mode: "insensitive" } },
                    { customer: { email: { contains: query, mode: "insensitive" } } },
                    {
                        customer: {
                            firstName: { contains: query, mode: "insensitive" },
                        },
                    },
                    {
                        customer: {
                            lastName: { contains: query, mode: "insensitive" },
                        },
                    },
                ],
            },
        }),
    ]),
    updateStatus: (id, orderStatus) => prisma.order.update({ where: { id }, data: { orderStatus } }),
    updatePaymentStatus: (id, paymentStatus) => prisma.order.update({ where: { id }, data: { paymentStatus } }),
    createOrderItem: (data) => prisma.orderItem.create({ data }),
    createOrderAddress: (data) => prisma.orderAddress.create({ data }),
    // ── Analytics helpers ─────────────────────────────────────────────────────
    countByStatus: (status) => prisma.order.count({ where: { orderStatus: status } }),
    todayOrders: () => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return Promise.all([
            prisma.order.count({ where: { placedAt: { gte: startOfDay } } }),
            prisma.order.aggregate({
                where: { placedAt: { gte: startOfDay }, paymentStatus: "COMPLETED" },
                _sum: { totalAmount: true },
            }),
        ]);
    },
    salesInRange: (startDate, endDate) => prisma.order.aggregate({
        where: {
            placedAt: { gte: startDate, lte: endDate },
            paymentStatus: "COMPLETED",
        },
        _sum: { totalAmount: true },
        _count: true,
    }),
};
