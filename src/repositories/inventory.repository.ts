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

  findManyWithFilters: (
    skip: number,
    take: number,
    filters?: {
      lowStock?: boolean;
      outOfStock?: boolean;
      search?: string;
    },
  ) => {
    const where: Record<string, unknown> = {};

    if (filters?.outOfStock) {
      where.availableStock = { lte: 0 };
    }

    if (filters?.search) {
      where.OR = [
        {
          variant: {
            sku: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          variant: {
            product: { name: { contains: filters.search, mode: "insensitive" } },
          },
        },
      ];
    }

    return Promise.all([
      prisma.inventory.findMany({
        where: where as never,
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
      prisma.inventory.count({ where: where as never }),
    ]);
  },

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

  findOutOfStock: (limit = 50) =>
    prisma.$queryRaw`
      SELECT i.*, pv."sku", pv."size", pv."color", p."name" as "productName"
      FROM "Inventory" i
      JOIN "ProductVariant" pv ON pv."id" = i."variantId"
      JOIN "Product" p ON p."id" = pv."productId"
      WHERE i."availableStock" <= 0
      ORDER BY i."lastUpdated" DESC
      LIMIT ${limit}
    `,

  bulkUpdateStock: (
    updates: {
      variantId: string;
      stockQuantity?: number;
      reorderThreshold?: number;
    }[],
  ) =>
    prisma.$transaction(
      updates.map((item) => {
        const data: Record<string, unknown> = {};
        if (item.stockQuantity !== undefined) data.stockQuantity = item.stockQuantity;
        if (item.reorderThreshold !== undefined) {
          data.reorderThreshold = item.reorderThreshold;
        }
        return prisma.inventory.update({
          where: { variantId: item.variantId },
          data,
        });
      }),
    ),

  findVariantWithInventory: (variantId: string) =>
    prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    }),

  upsertInventoryForVariant: (
    variantId: string,
    data: { stockQuantity: number; reorderThreshold: number },
  ) =>
    prisma.inventory.upsert({
      where: { variantId },
      create: {
        variantId,
        stockQuantity: data.stockQuantity,
        reservedStock: 0,
        availableStock: data.stockQuantity,
        reorderThreshold: data.reorderThreshold,
      },
      update: {
        stockQuantity: data.stockQuantity,
        reorderThreshold: data.reorderThreshold,
        availableStock: data.stockQuantity,
      },
    }),

  getInventoryForecast: async () => {
    const [totalSkus, outOfStockSkus, allRows] = await Promise.all([
      prisma.inventory.count(),
      prisma.inventory.count({ where: { availableStock: { lte: 0 } } }),
      prisma.inventory.findMany({
        select: { availableStock: true, reorderThreshold: true },
      }),
    ]);

    const lowStockSkus = allRows.filter(
      (row) => row.availableStock <= row.reorderThreshold,
    ).length;

    return {
      totalSkus,
      lowStockSkus,
      outOfStockSkus,
      healthScore:
        totalSkus === 0 ? 100 : Math.max(0, 100 - Math.round((lowStockSkus / totalSkus) * 100)),
    };
  },
};
