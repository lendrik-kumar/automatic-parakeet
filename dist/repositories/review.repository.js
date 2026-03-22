import prisma from "../lib/prisma.js";
export const reviewRepository = {
    create: (data) => prisma.productReview.create({ data }),
    findById: (id) => prisma.productReview.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
        },
    }),
    findByProduct: (productId, skip, take) => Promise.all([
        prisma.productReview.findMany({
            where: { productId, status: "APPROVED" },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true } },
            },
        }),
        prisma.productReview.count({ where: { productId, status: "APPROVED" } }),
    ]),
    averageRating: (productId) => prisma.productReview.aggregate({
        where: { productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: true,
    }),
    delete: (id) => prisma.productReview.delete({ where: { id } }),
    hasReviewed: (customerId, productId) => prisma.productReview.findFirst({
        where: { customerId, productId },
    }),
    hasPurchased: (customerId, productId) => prisma.orderItem.findFirst({
        where: {
            productId,
            order: { customerId, orderStatus: "DELIVERED" },
        },
    }),
    findManyByStatus: (skip, take, status, search) => {
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { reviewTitle: { contains: search, mode: "insensitive" } },
                { reviewText: { contains: search, mode: "insensitive" } },
                { product: { name: { contains: search, mode: "insensitive" } } },
                { customer: { email: { contains: search, mode: "insensitive" } } },
            ];
        }
        return Promise.all([
            prisma.productReview.findMany({
                where: where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
                include: {
                    customer: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    product: { select: { id: true, name: true, slug: true } },
                    moderator: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                },
            }),
            prisma.productReview.count({ where: where }),
        ]);
    },
    updateStatus: (id, status, moderatedBy, moderationNote) => prisma.productReview.update({
        where: { id },
        data: {
            status,
            moderatedBy,
            moderatedAt: new Date(),
            moderationNote,
        },
        include: {
            customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
            product: { select: { id: true, name: true, slug: true } },
            moderator: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
    }),
    bulkUpdateStatus: (reviewIds, status, moderatedBy, moderationNote) => prisma.productReview.updateMany({
        where: { id: { in: reviewIds } },
        data: {
            status,
            moderatedBy,
            moderatedAt: new Date(),
            moderationNote,
        },
    }),
    bulkDelete: (reviewIds) => prisma.productReview.deleteMany({
        where: { id: { in: reviewIds } },
    }),
    countByStatus: () => prisma.productReview.groupBy({
        by: ["status"],
        _count: true,
    }),
    findByCustomerId: (customerId, skip, take) => Promise.all([
        prisma.productReview.findMany({
            where: { customerId },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                product: { select: { id: true, name: true, slug: true } },
            },
        }),
        prisma.productReview.count({ where: { customerId } }),
    ]),
    updateByOwner: (id, customerId, data) => prisma.productReview.updateMany({
        where: { id, customerId },
        data: {
            ...data,
            status: "PENDING",
            moderatedBy: null,
            moderatedAt: null,
        },
    }),
    deleteByOwner: (id, customerId) => prisma.productReview.deleteMany({
        where: { id, customerId },
    }),
    countRatingDistribution: (productId) => prisma.productReview.groupBy({
        by: ["rating"],
        where: { productId, status: "APPROVED" },
        _count: true,
        orderBy: { rating: "desc" },
    }),
};
