import prisma from "../lib/prisma.js";
// ─── Repository ─────────────────────────────────────────────────────────────────
export const inventoryRepository = {
    create: (data) => prisma.inventory.create({ data }),
    findByVariantId: (variantId) => prisma.inventory.findUnique({
        where: { variantId },
        include: {
            variant: {
                include: {
                    product: { select: { id: true, name: true, slug: true } },
                },
            },
        },
    }),
    findMany: (skip, take) => Promise.all([
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
    findManyWithFilters: (skip, take, filters) => {
        const where = {};
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
                where: where,
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
            prisma.inventory.count({ where: where }),
        ]);
    },
    updateStock: (variantId, data) => {
        const update = {};
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
    reserveStock: (variantId, quantity) => prisma.inventory.update({
        where: { variantId },
        data: {
            reservedStock: { increment: quantity },
            availableStock: { decrement: quantity },
        },
    }),
    releaseStock: (variantId, quantity) => prisma.inventory.update({
        where: { variantId },
        data: {
            reservedStock: { decrement: quantity },
            availableStock: { increment: quantity },
        },
    }),
    confirmStock: (variantId, quantity) => prisma.inventory.update({
        where: { variantId },
        data: {
            reservedStock: { decrement: quantity },
            stockQuantity: { decrement: quantity },
        },
    }),
    restockItem: (variantId, quantity) => prisma.inventory.update({
        where: { variantId },
        data: {
            stockQuantity: { increment: quantity },
            availableStock: { increment: quantity },
        },
    }),
    recalculateAvailable: (variantId) => prisma.$queryRaw `
      UPDATE "Inventory"
      SET "availableStock" = "stockQuantity" - "reservedStock"
      WHERE "variantId" = ${variantId}
    `,
    findLowStock: (limit = 20) => prisma.$queryRaw `
      SELECT i.*, pv."sku", pv."size", pv."color", p."name" as "productName"
      FROM "Inventory" i
      JOIN "ProductVariant" pv ON pv."id" = i."variantId"
      JOIN "Product" p ON p."id" = pv."productId"
      WHERE i."availableStock" <= i."reorderThreshold"
      ORDER BY i."availableStock" ASC
      LIMIT ${limit}
    `,
    findOutOfStock: (limit = 50) => prisma.$queryRaw `
      SELECT i.*, pv."sku", pv."size", pv."color", p."name" as "productName"
      FROM "Inventory" i
      JOIN "ProductVariant" pv ON pv."id" = i."variantId"
      JOIN "Product" p ON p."id" = pv."productId"
      WHERE i."availableStock" <= 0
      ORDER BY i."lastUpdated" DESC
      LIMIT ${limit}
    `,
    bulkUpdateStock: (updates) => prisma.$transaction(updates.map((item) => {
        const data = {};
        if (item.stockQuantity !== undefined)
            data.stockQuantity = item.stockQuantity;
        if (item.reorderThreshold !== undefined) {
            data.reorderThreshold = item.reorderThreshold;
        }
        return prisma.inventory.update({
            where: { variantId: item.variantId },
            data,
        });
    })),
    findVariantWithInventory: (variantId) => prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
            inventory: true,
            product: { select: { id: true, name: true, slug: true } },
        },
    }),
    upsertInventoryForVariant: (variantId, data) => prisma.inventory.upsert({
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
        const lowStockSkus = allRows.filter((row) => row.availableStock <= row.reorderThreshold).length;
        return {
            totalSkus,
            lowStockSkus,
            outOfStockSkus,
            healthScore: totalSkus === 0 ? 100 : Math.max(0, 100 - Math.round((lowStockSkus / totalSkus) * 100)),
        };
    },
};
