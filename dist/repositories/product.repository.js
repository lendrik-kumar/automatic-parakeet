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
    bulkUpdateStatus: (productIds, status) => prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { status },
    }),
    bulkToggleFeatured: (productIds, featuredProduct) => prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { featuredProduct },
    }),
    bulkToggleNewArrival: (productIds, newArrival) => prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { newArrival },
    }),
    bulkUpdatePrices: (updates) => prisma.$transaction(updates.map((item) => prisma.product.update({
        where: { id: item.productId },
        data: { basePrice: item.basePrice },
    }))),
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
    findBestSellers: async (skip, take) => {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const grouped = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: { placedAt: { gte: since } },
                product: { status: "ACTIVE" },
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            skip,
            take,
        });
        const productIds = grouped.map((item) => item.productId);
        const total = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: { placedAt: { gte: since } },
                product: { status: "ACTIVE" },
            },
        });
        if (productIds.length === 0) {
            return [[], total.length];
        }
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, status: "ACTIVE" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        });
        const sortedProducts = productIds
            .map((id) => products.find((product) => product.id === id))
            .filter((product) => Boolean(product));
        return [sortedProducts, total.length];
    },
    findTrendingProducts: async (skip, take) => {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const grouped = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: { placedAt: { gte: since } },
                product: { status: "ACTIVE" },
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            skip,
            take,
        });
        const productIds = grouped.map((item) => item.productId);
        if (productIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, status: "ACTIVE" },
                include: {
                    images: { where: { isThumbnail: true }, take: 1 },
                    _count: { select: { reviews: true } },
                },
            });
            const sortedProducts = productIds
                .map((id) => products.find((product) => product.id === id))
                .filter((product) => Boolean(product));
            const total = await prisma.orderItem.groupBy({
                by: ["productId"],
                where: {
                    order: { placedAt: { gte: since } },
                    product: { status: "ACTIVE" },
                },
            });
            return [sortedProducts, total.length];
        }
        const fallback = await prisma.product.findMany({
            where: { status: "ACTIVE" },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        });
        const total = await prisma.product.count({ where: { status: "ACTIVE" } });
        return [fallback, total];
    },
    findCategories: async () => {
        const categories = await prisma.product.findMany({
            where: { status: "ACTIVE" },
            distinct: ["category"],
            select: { category: true },
            orderBy: { category: "asc" },
        });
        return Promise.all(categories.map(async (item) => ({
            category: item.category,
            count: await prisma.product.count({
                where: { status: "ACTIVE", category: item.category },
            }),
        })));
    },
    findCollections: async () => {
        const collections = await prisma.product.findMany({
            where: { status: "ACTIVE" },
            distinct: ["brand"],
            select: { brand: true },
            orderBy: { brand: "asc" },
        });
        return Promise.all(collections
            .filter((item) => item.brand)
            .map(async (item) => ({
            collection: item.brand,
            count: await prisma.product.count({
                where: { status: "ACTIVE", brand: item.brand },
            }),
        })));
    },
    findProductsByFilters: (params) => {
        const where = { status: "ACTIVE" };
        if (params.filters.category) {
            where.category = {
                contains: params.filters.category,
                mode: "insensitive",
            };
        }
        if (params.filters.collection) {
            where.brand = {
                contains: params.filters.collection,
                mode: "insensitive",
            };
        }
        if (params.filters.subCategory) {
            where.shoeType = {
                contains: params.filters.subCategory,
                mode: "insensitive",
            };
        }
        if (params.filters.gender) {
            where.gender = params.filters.gender;
        }
        if (params.filters.shoeType) {
            where.shoeType = {
                contains: params.filters.shoeType,
                mode: "insensitive",
            };
        }
        if (params.filters.minPrice || params.filters.maxPrice) {
            where.basePrice = {};
            if (params.filters.minPrice) {
                where.basePrice.gte = params.filters.minPrice;
            }
            if (params.filters.maxPrice) {
                where.basePrice.lte = params.filters.maxPrice;
            }
        }
        if (params.filters.size || params.filters.color) {
            const some = { status: "ACTIVE" };
            if (params.filters.size) {
                some.size = params.filters.size;
            }
            if (params.filters.color) {
                some.color = { contains: params.filters.color, mode: "insensitive" };
            }
            where.variants = { some };
        }
        if (params.filters.search) {
            where.OR = [
                { name: { contains: params.filters.search, mode: "insensitive" } },
                { category: { contains: params.filters.search, mode: "insensitive" } },
                { shoeType: { contains: params.filters.search, mode: "insensitive" } },
                { brand: { contains: params.filters.search, mode: "insensitive" } },
            ];
        }
        return Promise.all([
            prisma.product.findMany({
                where: where,
                skip: params.skip,
                take: params.take,
                orderBy: params.orderBy ?? { createdAt: "desc" },
                include: {
                    images: { where: { isThumbnail: true }, take: 1 },
                    _count: { select: { reviews: true } },
                },
            }),
            prisma.product.count({ where: where }),
        ]);
    },
    findProductVariants: (productId) => prisma.productVariant.findMany({
        where: { productId, status: "ACTIVE" },
        orderBy: [{ color: "asc" }, { size: "asc" }],
        include: { inventory: true, images: { orderBy: { position: "asc" } } },
    }),
    findVariantDetails: (variantId) => prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
            inventory: true,
            images: { orderBy: { position: "asc" } },
            product: {
                include: {
                    images: { where: { isThumbnail: true }, take: 1 },
                    shoeSpecification: true,
                },
            },
        },
    }),
    findRelatedProducts: async (productId, limit) => {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, category: true, gender: true },
        });
        if (!product)
            return [];
        return prisma.product.findMany({
            where: {
                id: { not: product.id },
                status: "ACTIVE",
                category: product.category,
                gender: product.gender,
            },
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        });
    },
    findSimilarProducts: async (productId, limit) => {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, category: true, shoeType: true, basePrice: true },
        });
        if (!product)
            return [];
        return prisma.product.findMany({
            where: {
                id: { not: product.id },
                status: "ACTIVE",
                category: product.category,
                shoeType: product.shoeType,
                basePrice: {
                    gte: Math.max(0, product.basePrice * 0.8),
                    lte: product.basePrice * 1.2,
                },
            },
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        });
    },
    findPersonalizedProducts: async (customerId, limit) => {
        const [orders, wishlistItems, cartItems] = await Promise.all([
            prisma.orderItem.findMany({
                where: { order: { customerId } },
                select: { productId: true },
                take: 100,
            }),
            prisma.wishlistItem.findMany({
                where: { wishlist: { customerId } },
                select: { productId: true },
                take: 100,
            }),
            prisma.cartItem.findMany({
                where: { cart: { customerId } },
                select: { productId: true },
                take: 100,
            }),
        ]);
        const seedProductIds = [
            ...orders.map((item) => item.productId),
            ...wishlistItems.map((item) => item.productId),
            ...cartItems.map((item) => item.productId),
        ];
        const uniqueSeedProductIds = [...new Set(seedProductIds)];
        if (uniqueSeedProductIds.length === 0) {
            return prisma.product.findMany({
                where: { status: "ACTIVE" },
                take: limit,
                orderBy: [{ featuredProduct: "desc" }, { createdAt: "desc" }],
                include: {
                    images: { where: { isThumbnail: true }, take: 1 },
                    _count: { select: { reviews: true } },
                },
            });
        }
        const seedProducts = await prisma.product.findMany({
            where: { id: { in: uniqueSeedProductIds } },
            select: { category: true, shoeType: true, gender: true },
        });
        const categories = [...new Set(seedProducts.map((item) => item.category))];
        const shoeTypes = [...new Set(seedProducts.map((item) => item.shoeType))];
        const genders = [...new Set(seedProducts.map((item) => item.gender))];
        return prisma.product.findMany({
            where: {
                status: "ACTIVE",
                id: { notIn: uniqueSeedProductIds },
                OR: [
                    { category: { in: categories } },
                    { shoeType: { in: shoeTypes } },
                    { gender: { in: genders } },
                ],
            },
            take: limit,
            orderBy: [{ featuredProduct: "desc" }, { createdAt: "desc" }],
            include: {
                images: { where: { isThumbnail: true }, take: 1 },
                _count: { select: { reviews: true } },
            },
        });
    },
    getFilterOptions: async () => {
        const [categoryValues, collectionValues, shoeTypeValues, variantValues, prices] = await Promise.all([
            prisma.product.findMany({
                where: { status: "ACTIVE" },
                distinct: ["category"],
                select: { category: true },
                orderBy: { category: "asc" },
            }),
            prisma.product.findMany({
                where: { status: "ACTIVE" },
                distinct: ["brand"],
                select: { brand: true },
                orderBy: { brand: "asc" },
            }),
            prisma.product.findMany({
                where: { status: "ACTIVE" },
                distinct: ["shoeType"],
                select: { shoeType: true },
                orderBy: { shoeType: "asc" },
            }),
            prisma.productVariant.findMany({
                where: { status: "ACTIVE", product: { status: "ACTIVE" } },
                distinct: ["size", "color"],
                select: { size: true, color: true },
                orderBy: [{ size: "asc" }, { color: "asc" }],
            }),
            prisma.product.aggregate({
                where: { status: "ACTIVE" },
                _min: { basePrice: true },
                _max: { basePrice: true },
            }),
        ]);
        const categories = categoryValues.map((item) => item.category);
        const collections = collectionValues
            .map((item) => item.brand)
            .filter((item) => Boolean(item));
        const shoeTypes = shoeTypeValues.map((item) => item.shoeType);
        const sizeSet = new Set();
        const colorSet = new Set();
        variantValues.forEach((item) => {
            sizeSet.add(item.size);
            colorSet.add(item.color);
        });
        return {
            categories,
            collections,
            genders: ["MEN", "WOMEN", "UNISEX", "KIDS"],
            shoeTypes,
            sizes: [...sizeSet].sort((a, b) => a.localeCompare(b)),
            colors: [...colorSet].sort((a, b) => a.localeCompare(b)),
            priceRange: {
                min: prices._min.basePrice ?? 0,
                max: prices._max.basePrice ?? 0,
            },
        };
    },
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
