import prisma from "../lib/prisma.js";
// ─── Repository ─────────────────────────────────────────────────────────────────
export const productRepository = {
    // ── Products ──────────────────────────────────────────────────────────────
    create: (data) => prisma.product.create({ data }),
    findById: (id) => prisma.product.findUnique({
        where: { id },
        include: {
            variants: { include: { inventory: true } },
            images: { orderBy: { position: "asc" } },
            shoeSpecification: true,
            sizeGuides: true,
            reviews: {
                include: {
                    customer: { select: { id: true, firstName: true, lastName: true } },
                },
            },
        },
    }),
    findBySlug: (slug) => prisma.product.findUnique({
        where: { slug },
        include: {
            variants: { where: { status: "ACTIVE" }, include: { inventory: true } },
            images: { orderBy: { position: "asc" } },
            shoeSpecification: true,
            sizeGuides: true,
            reviews: {
                include: {
                    customer: { select: { id: true, firstName: true, lastName: true } },
                },
            },
        },
    }),
    findMany: (params) => Promise.all([
        prisma.product.findMany({
            where: params.where,
            skip: params.skip,
            take: params.take,
            orderBy: params.orderBy ?? { createdAt: "desc" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { variants: true, reviews: true } },
            },
        }),
        prisma.product.count({ where: params.where }),
    ]),
    update: (id, data) => prisma.product.update({ where: { id }, data }),
    updateStatus: (id, status) => prisma.product.update({ where: { id }, data: { status } }),
    // ── Featured & New Arrivals ─────────────────────────────────────────────
    findFeatured: (take = 20) => prisma.product.findMany({
        where: { featuredProduct: true, status: "ACTIVE" },
        take,
        orderBy: { createdAt: "desc" },
        include: {
            images: { where: { isThumbnail: true }, take: 1 },
            _count: { select: { reviews: true } },
        },
    }),
    findNewArrivals: (take = 20) => prisma.product.findMany({
        where: { newArrival: true, status: "ACTIVE" },
        take,
        orderBy: { releaseDate: "desc" },
        include: {
            images: { where: { isThumbnail: true }, take: 1 },
            _count: { select: { reviews: true } },
        },
    }),
    search: (query, skip, take) => Promise.all([
        prisma.product.findMany({
            where: {
                status: "ACTIVE",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { brand: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ],
            },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        }),
        prisma.product.count({
            where: {
                status: "ACTIVE",
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { brand: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ],
            },
        }),
    ]),
    // ── Variants ──────────────────────────────────────────────────────────────
    createVariant: (data) => prisma.productVariant.create({ data }),
    findVariantById: (id) => prisma.productVariant.findUnique({
        where: { id },
        include: { inventory: true, product: true },
    }),
    updateVariant: (id, data) => prisma.productVariant.update({ where: { id }, data }),
    archiveVariant: (id) => prisma.productVariant.update({
        where: { id },
        data: { status: "ARCHIVED" },
    }),
    // ── Images ────────────────────────────────────────────────────────────────
    createImage: (data) => prisma.productImage.create({ data }),
    createImages: (data) => prisma.productImage.createMany({ data }),
    deleteImage: (id) => prisma.productImage.delete({ where: { id } }),
    findImageById: (id) => prisma.productImage.findUnique({ where: { id } }),
    // ── Specifications ────────────────────────────────────────────────────────
    upsertSpecification: (productId, data) => prisma.shoeSpecification.upsert({
        where: { productId },
        update: data,
        create: { productId, ...data },
    }),
    // ── Size Guides ───────────────────────────────────────────────────────────
    createSizeGuide: (data) => prisma.sizeGuide.create({ data }),
    deleteSizeGuide: (id) => prisma.sizeGuide.delete({ where: { id } }),
    findSizeGuideById: (id) => prisma.sizeGuide.findUnique({ where: { id } }),
};
