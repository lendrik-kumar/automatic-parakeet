import prisma from "../lib/prisma.js";
import type { ReviewStatus } from "../generated/prisma/enums.js";

export const reviewRepository = {
  create: (data: {
    customerId: string;
    productId: string;
    rating: number;
    reviewTitle: string;
    reviewText?: string;
    images?: string;
    verifiedPurchase?: boolean;
    status?: ReviewStatus;
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

  averageRating: (productId: string) =>
    prisma.productReview.aggregate({
      where: { productId, status: "APPROVED" },
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

  findManyByStatus: (
    skip: number,
    take: number,
    status?: ReviewStatus,
    search?: string,
  ) => {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
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
        where: where as never,
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
      prisma.productReview.count({ where: where as never }),
    ]);
  },

  updateStatus: (
    id: string,
    status: ReviewStatus,
    moderatedBy: string,
    moderationNote?: string,
  ) =>
    prisma.productReview.update({
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

  bulkUpdateStatus: (
    reviewIds: string[],
    status: ReviewStatus,
    moderatedBy: string,
    moderationNote?: string,
  ) =>
    prisma.productReview.updateMany({
      where: { id: { in: reviewIds } },
      data: {
        status,
        moderatedBy,
        moderatedAt: new Date(),
        moderationNote,
      },
    }),

  bulkDelete: (reviewIds: string[]) =>
    prisma.productReview.deleteMany({
      where: { id: { in: reviewIds } },
    }),

  countByStatus: () =>
    prisma.productReview.groupBy({
      by: ["status"],
      _count: true,
    }),
};
