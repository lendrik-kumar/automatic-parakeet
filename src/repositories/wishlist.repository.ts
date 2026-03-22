import prisma from "../lib/prisma.js";

export const wishlistRepository = {
  findByCustomerId: (customerId: string) =>
    prisma.wishlist.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
                status: true,
              },
              include: { images: { where: { isThumbnail: true }, take: 1 } },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                price: true,
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    }),

  findOrCreate: async (customerId: string) => {
    let wishlist = await prisma.wishlist.findUnique({ where: { customerId } });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { customerId } });
    }
    return wishlist;
  },

  addItem: (data: {
    wishlistId: string;
    productId: string;
    variantId?: string;
  }) => prisma.wishlistItem.create({ data }),

  findItemById: (id: string) =>
    prisma.wishlistItem.findUnique({
      where: { id },
      include: { wishlist: true, product: true, variant: true },
    }),

  findExistingItem: (
    wishlistId: string,
    productId: string,
    variantId?: string,
  ) =>
    prisma.wishlistItem.findFirst({
      where: { wishlistId, productId, variantId: variantId ?? null },
    }),

  deleteItem: (id: string) => prisma.wishlistItem.delete({ where: { id } }),

  clearAllItems: (wishlistId: string) =>
    prisma.wishlistItem.deleteMany({ where: { wishlistId } }),
};
