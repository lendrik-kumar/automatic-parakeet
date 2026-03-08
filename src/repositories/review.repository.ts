import prisma from "../lib/prisma.js";

export const reviewRepository = {
  create: (data: {
    customerId: string;
    productId: string;
    rating: number;
    reviewTitle: string;
    reviewText?: string;
    images?: string;
    verifiedPurchase?: boolean;
  }) => prisma.productReview.create({ data }),

  findById: (id: string) =>
    prisma.productReview.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),

  findByProduct: (productId: string, skip: number, take: number) =>
    Promise.all([
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

  averageRating: (productId: string) =>
    prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    }),

  delete: (id: string) => prisma.productReview.delete({ where: { id } }),

  hasReviewed: (customerId: string, productId: string) =>
    prisma.productReview.findFirst({
      where: { customerId, productId },
    }),

  hasPurchased: (customerId: string, productId: string) =>
    prisma.orderItem.findFirst({
      where: {
        productId,
        order: { customerId, orderStatus: "DELIVERED" },
      },
    }),
};
