import prisma from "../lib/prisma.js";
// ─── Repository ─────────────────────────────────────────────────────────────────
export const cartRepository = {
    findByCustomerId: (customerId) => prisma.cart.findUnique({
        where: { customerId },
        include: {
            appliedCoupon: true,
            items: {
                include: {
                    product: {
                        select: { id: true, name: true, slug: true, status: true },
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
                    },
                },
                orderBy: { createdAt: "desc" },
            },
        },
    }),
    findOrCreate: async (customerId) => {
        let cart = await prisma.cart.findUnique({ where: { customerId } });
        if (!cart) {
            cart = await prisma.cart.create({
                data: {
                    customerId,
                    totalItems: 0,
                    totalPrice: 0,
                    appliedDiscount: 0,
                },
            });
        }
        return cart;
    },
    addItem: (data) => prisma.cartItem.create({ data }),
    findItemById: (id) => prisma.cartItem.findUnique({
        where: { id },
        include: { cart: true, variant: { include: { inventory: true } } },
    }),
    findItemsByIds: (cartId, itemIds) => prisma.cartItem.findMany({
        where: { cartId, id: { in: itemIds } },
        include: { variant: { include: { inventory: true } } },
    }),
    findExistingItem: (cartId, variantId, size, color) => prisma.cartItem.findFirst({
        where: { cartId, variantId, size, color },
    }),
    updateItemQuantity: (id, quantity, totalPrice) => prisma.cartItem.update({
        where: { id },
        data: { quantity, totalPrice },
    }),
    deleteItem: (id) => prisma.cartItem.delete({ where: { id } }),
    clearCart: (cartId) => prisma.cartItem.deleteMany({ where: { cartId } }),
    bulkDeleteItems: (itemIds) => prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } }),
    bulkUpdateItems: (updates) => prisma.$transaction(updates.map((item) => prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: item.quantity, totalPrice: item.totalPrice },
    }))),
    applyCoupon: (cartId, couponId, discount) => prisma.cart.update({
        where: { id: cartId },
        data: {
            appliedCouponId: couponId,
            appliedDiscount: discount,
        },
    }),
    removeCoupon: (cartId) => prisma.cart.update({
        where: { id: cartId },
        data: {
            appliedCouponId: null,
            appliedDiscount: 0,
        },
    }),
    updateCartTotals: async (cartId) => {
        const items = await prisma.cartItem.findMany({ where: { cartId } });
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
        return prisma.cart.update({
            where: { id: cartId },
            data: { totalItems, totalPrice },
        });
    },
    getCartWithItems: (cartId) => prisma.cart.findUnique({
        where: { id: cartId },
        include: {
            appliedCoupon: true,
            items: {
                include: {
                    product: {
                        select: { id: true, name: true, slug: true, status: true },
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
            },
        },
    }),
    findBySessionId: (sessionId) => prisma.cart.findUnique({
        where: { sessionId },
        include: {
            appliedCoupon: true,
            items: {
                include: {
                    product: {
                        select: { id: true, name: true, slug: true, status: true },
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
                orderBy: { createdAt: "desc" },
            },
        },
    }),
    setSessionId: (cartId, sessionId) => prisma.cart.update({
        where: { id: cartId },
        data: { sessionId },
    }),
};
