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
            where: { productId },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true } },
            },
        }),
        prisma.productReview.count({ where: { productId } }),
    ]),
    averageRating: (productId) => prisma.productReview.aggregate({
        where: { productId },
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
};
