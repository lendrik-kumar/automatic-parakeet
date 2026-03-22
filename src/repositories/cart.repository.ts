import prisma from "../lib/prisma.js";

// ─── Repository ─────────────────────────────────────────────────────────────────

export const cartRepository = {
  findByCustomerId: (customerId: string) =>
    prisma.cart.findUnique({
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

  findOrCreate: async (customerId: string) => {
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

  addItem: (data: {
    cartId: string;
    productId: string;
    variantId: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }) => prisma.cartItem.create({ data }),

  findItemById: (id: string) =>
    prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true, variant: { include: { inventory: true } } },
    }),

  findItemsByIds: (cartId: string, itemIds: string[]) =>
    prisma.cartItem.findMany({
      where: { cartId, id: { in: itemIds } },
      include: { variant: { include: { inventory: true } } },
    }),

  findExistingItem: (
    cartId: string,
    variantId: string,
    size: string,
    color: string,
  ) =>
    prisma.cartItem.findFirst({
      where: { cartId, variantId, size, color },
    }),

  updateItemQuantity: (id: string, quantity: number, totalPrice: number) =>
    prisma.cartItem.update({
      where: { id },
      data: { quantity, totalPrice },
    }),

  deleteItem: (id: string) => prisma.cartItem.delete({ where: { id } }),

  clearCart: (cartId: string) =>
    prisma.cartItem.deleteMany({ where: { cartId } }),

  bulkDeleteItems: (itemIds: string[]) =>
    prisma.cartItem.deleteMany({ where: { id: { in: itemIds } } }),

  bulkUpdateItems: (
    updates: { id: string; quantity: number; totalPrice: number }[],
  ) =>
    prisma.$transaction(
      updates.map((item) =>
        prisma.cartItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity, totalPrice: item.totalPrice },
        }),
      ),
    ),

  applyCoupon: (cartId: string, couponId: string, discount: number) =>
    prisma.cart.update({
      where: { id: cartId },
      data: {
        appliedCouponId: couponId,
        appliedDiscount: discount,
      },
    }),

  removeCoupon: (cartId: string) =>
    prisma.cart.update({
      where: { id: cartId },
      data: {
        appliedCouponId: null,
        appliedDiscount: 0,
      },
    }),

  updateCartTotals: async (cartId: string) => {
    const items = await prisma.cartItem.findMany({ where: { cartId } });
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return prisma.cart.update({
      where: { id: cartId },
      data: { totalItems, totalPrice },
    });
  },

  getCartWithItems: (cartId: string) =>
    prisma.cart.findUnique({
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

  findBySessionId: (sessionId: string) =>
    prisma.cart.findUnique({
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

  setSessionId: (cartId: string, sessionId: string) =>
    prisma.cart.update({
      where: { id: cartId },
      data: { sessionId },
    }),
};
