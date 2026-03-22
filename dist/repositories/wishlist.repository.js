import prisma from "../lib/prisma.js";
export const wishlistRepository = {
    findByCustomerId: (customerId) => prisma.wishlist.findUnique({
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
    findOrCreate: async (customerId) => {
        let wishlist = await prisma.wishlist.findUnique({ where: { customerId } });
        if (!wishlist) {
            wishlist = await prisma.wishlist.create({ data: { customerId } });
        }
        return wishlist;
    },
    addItem: (data) => prisma.wishlistItem.create({ data }),
    findItemById: (id) => prisma.wishlistItem.findUnique({
        where: { id },
        include: { wishlist: true, product: true, variant: true },
    }),
    findExistingItem: (wishlistId, productId, variantId) => prisma.wishlistItem.findFirst({
        where: { wishlistId, productId, variantId: variantId ?? null },
    }),
    deleteItem: (id) => prisma.wishlistItem.delete({ where: { id } }),
    clearAllItems: (wishlistId) => prisma.wishlistItem.deleteMany({ where: { wishlistId } }),
};
