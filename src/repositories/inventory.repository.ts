import prisma from "../lib/prisma.js";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CreateInventoryInput {
  variantId: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
  reorderThreshold: number;
}

// ─── Repository ─────────────────────────────────────────────────────────────────

export const inventoryRepository = {
  create: (data: CreateInventoryInput) => prisma.inventory.create({ data }),

  findByVariantId: (variantId: string) =>
    prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),

  findMany: (skip: number, take: number) =>
    Promise.all([
      prisma.inventory.findMany({
        skip,
        take,
        orderBy: { lastUpdated: "desc" },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      prisma.inventory.count(),
    ]),

  updateStock: (
    variantId: string,
    data: { stockQuantity?: number; reorderThreshold?: number },
  ) => {
    const update: Record<string, unknown> = {};
    if (data.stockQuantity !== undefined) {
      update.stockQuantity = data.stockQuantity;
    }
    if (data.reorderThreshold !== undefined) {
      update.reorderThreshold = data.reorderThreshold;
    }
    return prisma.inventory.update({
      where: { variantId },
      data: update,
    });
  },

  reserveStock: (variantId: string, quantity: number) =>
    prisma.inventory.update({
      where: { variantId },
      data: {
        reservedStock: { increment: quantity },
        availableStock: { decrement: quantity },
      },
    }),

  releaseStock: (variantId: string, quantity: number) =>
    prisma.inventory.update({
      where: { variantId },
      data: {
        reservedStock: { decrement: quantity },
        availableStock: { increment: quantity },
      },
    }),

  confirmStock: (variantId: string, quantity: number) =>
    prisma.inventory.update({
      where: { variantId },
      data: {
        reservedStock: { decrement: quantity },
        stockQuantity: { decrement: quantity },
      },
    }),

  restockItem: (variantId: string, quantity: number) =>
    prisma.inventory.update({
      where: { variantId },
      data: {
        stockQuantity: { increment: quantity },
        availableStock: { increment: quantity },
      },
    }),

  recalculateAvailable: (variantId: string) =>
    prisma.$queryRaw`
      UPDATE "Inventory"
      SET "availableStock" = "stockQuantity" - "reservedStock"
      WHERE "variantId" = ${variantId}
    `,

  findLowStock: (limit = 20) =>
    prisma.$queryRaw`
      SELECT i.*, pv."sku", pv."size", pv."color", p."name" as "productName"
      FROM "Inventory" i
      JOIN "ProductVariant" pv ON pv."id" = i."variantId"
      JOIN "Product" p ON p."id" = pv."productId"
      WHERE i."availableStock" <= i."reorderThreshold"
      ORDER BY i."availableStock" ASC
      LIMIT ${limit}
    `,
};
