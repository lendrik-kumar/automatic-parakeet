import prisma from "../lib/prisma.js";
export const collectionRepository = {
    findAll: (params) => {
        const { skip = 0, take = 20, status, search } = params;
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        return prisma.collection.findMany({
            where: where,
            skip,
            take,
            orderBy: { displayOrder: "asc" },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
    },
    count: (params) => {
        const { status, search } = params;
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        return prisma.collection.count({ where: where });
    },
    findById: (id) => prisma.collection.findUnique({
        where: { id },
        include: {
            _count: {
                select: { products: true },
            },
        },
    }),
    findBySlug: (slug) => prisma.collection.findUnique({
        where: { slug },
        include: {
            _count: {
                select: { products: true },
            },
        },
    }),
    findByName: (name) => prisma.collection.findUnique({
        where: { name },
    }),
    create: (data) => prisma.collection.create({
        data,
        include: {
            _count: {
                select: { products: true },
            },
        },
    }),
    update: (id, data) => prisma.collection.update({
        where: { id },
        data,
        include: {
            _count: {
                select: { products: true },
            },
        },
    }),
    delete: (id) => prisma.collection.update({
        where: { id },
        data: { status: "ARCHIVED" },
    }),
    hardDelete: (id) => prisma.collection.delete({
        where: { id },
    }),
    updateStatus: (id, status) => prisma.collection.update({
        where: { id },
        data: { status },
    }),
    reorder: async (orderMap) => {
        // Use transaction to update all display orders atomically
        await prisma.$transaction(orderMap.map((item) => prisma.collection.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
        })));
    },
    countProducts: (collectionId) => prisma.product.count({
        where: { collectionId },
    }),
    getProducts: (collectionId, skip = 0, take = 20) => prisma.product.findMany({
        where: { collectionId },
        skip,
        take,
        include: {
            images: {
                where: { isThumbnail: true },
                take: 1,
            },
            _count: {
                select: { variants: true },
            },
        },
    }),
    getStats: async (collectionId) => {
        const [productCount, totalRevenue] = await Promise.all([
            prisma.product.count({ where: { collectionId } }),
            prisma.orderItem.aggregate({
                where: {
                    product: { collectionId },
                    order: { paymentStatus: "COMPLETED" },
                },
                _sum: { total: true },
            }),
        ]);
        return {
            productCount,
            totalRevenue: totalRevenue._sum.total || 0,
        };
    },
};
