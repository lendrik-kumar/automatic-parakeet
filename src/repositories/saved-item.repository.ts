import prisma from "../lib/prisma.js";

export const savedItemRepository = {
  findByCustomerId: (customerId: string) =>
    prisma.savedItem.findMany({
      where: { customerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            price: true,
            status: true,
          },
          include: { inventory: true },
        },
      },
      orderBy: { savedAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.savedItem.findUnique({
      where: { id },
      include: {
        product: true,
        variant: { include: { inventory: true, product: true } },
      },
    }),

  create: (data: {
    customerId: string;
    productId: string;
    variantId: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
  }) => prisma.savedItem.create({ data }),

  delete: (id: string) => prisma.savedItem.delete({ where: { id } }),

  deleteAllByCustomer: (customerId: string) =>
    prisma.savedItem.deleteMany({ where: { customerId } }),

  countByCustomer: (customerId: string) =>
    prisma.savedItem.count({ where: { customerId } }),
};
