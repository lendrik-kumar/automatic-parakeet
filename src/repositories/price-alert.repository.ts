import prisma from "../lib/prisma.js";

export const priceAlertRepository = {
  listByUserId: (userId: string) =>
    prisma.priceAlert.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.priceAlert.findUnique({
      where: { id },
    }),

  create: (data: {
    userId: string;
    productId: string;
    wishlistItemId?: string | null;
    targetPrice: number;
    currentPrice: number;
    isActive?: boolean;
  }) => prisma.priceAlert.create({ data }),

  update: (
    id: string,
    data: { targetPrice?: number; isActive?: boolean; currentPrice?: number },
  ) =>
    prisma.priceAlert.update({
      where: { id },
      data,
    }),

  delete: (id: string) =>
    prisma.priceAlert.delete({
      where: { id },
    }),
};
