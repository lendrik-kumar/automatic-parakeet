/**
 * Product Service
 * Business logic for product management (admin) and product browsing (client).
 */
import { productRepository } from "../repositories/product.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { slugify } from "../utils/slugify.js";
// ─── Custom Error ─────────────────────────────────────────────────────────────
export class ProductError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ProductError";
    }
}
// ─── Admin: Products ──────────────────────────────────────────────────────────
export const createProduct = async (adminId, data) => {
    const slug = slugify(data.name);
    const product = await productRepository.create({
        ...data,
        slug,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
    });
    await adminRepository.logActivity(adminId, "CREATE", "Product", product.id);
    return product;
};
export const listProducts = async (query) => {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = {};
    if (query.status)
        where.status = query.status;
    if (query.category)
        where.category = { contains: query.category, mode: "insensitive" };
    if (query.brand)
        where.brand = { contains: query.brand, mode: "insensitive" };
    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: "insensitive" } },
            { brand: { contains: query.search, mode: "insensitive" } },
            { category: { contains: query.search, mode: "insensitive" } },
        ];
    }
    const [products, total] = await productRepository.findMany({
        skip,
        take: limit,
        where,
    });
    return {
        products,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
export const getProduct = async (productId) => {
    const product = await productRepository.findById(productId);
    if (!product)
        throw new ProductError(404, "Product not found");
    return product;
};
export const updateProduct = async (adminId, productId, data) => {
    const existing = await productRepository.findById(productId);
    if (!existing)
        throw new ProductError(404, "Product not found");
    const updateData = { ...data };
    if (data.name)
        updateData.slug = slugify(data.name);
    if (data.releaseDate)
        updateData.releaseDate = new Date(data.releaseDate);
    const product = await productRepository.update(productId, updateData);
    await adminRepository.logActivity(adminId, "UPDATE", "Product", productId);
    return product;
};
export const archiveProduct = async (adminId, productId) => {
    const existing = await productRepository.findById(productId);
    if (!existing)
        throw new ProductError(404, "Product not found");
    const product = await productRepository.updateStatus(productId, "ARCHIVED");
    await adminRepository.logActivity(adminId, "DELETE", "Product", productId);
    return product;
};
export const updateProductStatus = async (adminId, productId, status) => {
    const existing = await productRepository.findById(productId);
    if (!existing)
        throw new ProductError(404, "Product not found");
    const product = await productRepository.updateStatus(productId, status);
    await adminRepository.logActivity(adminId, "UPDATE", "Product", productId);
    return product;
};
// ─── Admin: Variants ──────────────────────────────────────────────────────────
export const createVariant = async (adminId, productId, data) => {
    const product = await productRepository.findById(productId);
    if (!product)
        throw new ProductError(404, "Product not found");
    const variant = await productRepository.createVariant({
        productId,
        ...data,
    });
    // Auto-create inventory record
    await inventoryRepository.create({
        variantId: variant.id,
        stockQuantity: 0,
        reservedStock: 0,
        availableStock: 0,
        reorderThreshold: 10,
    });
    await adminRepository.logActivity(adminId, "CREATE", "ProductVariant", variant.id);
    return variant;
};
export const updateVariant = async (adminId, variantId, data) => {
    const existing = await productRepository.findVariantById(variantId);
    if (!existing)
        throw new ProductError(404, "Variant not found");
    const variant = await productRepository.updateVariant(variantId, data);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductVariant", variantId);
    return variant;
};
export const archiveVariant = async (adminId, variantId) => {
    const existing = await productRepository.findVariantById(variantId);
    if (!existing)
        throw new ProductError(404, "Variant not found");
    const variant = await productRepository.archiveVariant(variantId);
    await adminRepository.logActivity(adminId, "DELETE", "ProductVariant", variantId);
    return variant;
};
// ─── Admin: Images ────────────────────────────────────────────────────────────
export const addProductImages = async (adminId, productId, images) => {
    const product = await productRepository.findById(productId);
    if (!product)
        throw new ProductError(404, "Product not found");
    const imageData = images.map((img) => ({
        productId,
        ...img,
    }));
    await productRepository.createImages(imageData);
    await adminRepository.logActivity(adminId, "CREATE", "ProductImage", productId);
    return { count: images.length };
};
export const deleteProductImage = async (adminId, imageId) => {
    const image = await productRepository.findImageById(imageId);
    if (!image)
        throw new ProductError(404, "Image not found");
    await productRepository.deleteImage(imageId);
    await adminRepository.logActivity(adminId, "DELETE", "ProductImage", imageId);
};
// ─── Admin: Specifications ────────────────────────────────────────────────────
export const updateSpecification = async (adminId, productId, data) => {
    const product = await productRepository.findById(productId);
    if (!product)
        throw new ProductError(404, "Product not found");
    const spec = await productRepository.upsertSpecification(productId, data);
    await adminRepository.logActivity(adminId, "UPDATE", "ShoeSpecification", productId);
    return spec;
};
// ─── Admin: Size Guides ───────────────────────────────────────────────────────
export const createSizeGuide = async (adminId, productId, data) => {
    const product = await productRepository.findById(productId);
    if (!product)
        throw new ProductError(404, "Product not found");
    const guide = await productRepository.createSizeGuide({ productId, ...data });
    await adminRepository.logActivity(adminId, "CREATE", "SizeGuide", guide.id);
    return guide;
};
export const deleteSizeGuide = async (adminId, sizeGuideId) => {
    const guide = await productRepository.findSizeGuideById(sizeGuideId);
    if (!guide)
        throw new ProductError(404, "Size guide not found");
    await productRepository.deleteSizeGuide(sizeGuideId);
    await adminRepository.logActivity(adminId, "DELETE", "SizeGuide", sizeGuideId);
};
// ─── Client: Products ─────────────────────────────────────────────────────────
export const listClientProducts = async (query) => {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = { status: "ACTIVE" };
    if (query.category)
        where.category = { contains: query.category, mode: "insensitive" };
    if (query.brand)
        where.brand = { contains: query.brand, mode: "insensitive" };
    if (query.gender)
        where.gender = query.gender;
    if (query.minPrice || query.maxPrice) {
        where.basePrice = {};
        if (query.minPrice)
            where.basePrice.gte = query.minPrice;
        if (query.maxPrice)
            where.basePrice.lte = query.maxPrice;
    }
    if (query.size || query.color) {
        where.variants = { some: {} };
        if (query.size)
            where.variants.some = {
                ...where.variants.some,
                size: query.size,
            };
        if (query.color)
            where.variants.some = {
                ...where.variants.some,
                color: { contains: query.color, mode: "insensitive" },
            };
    }
    const [products, total] = await productRepository.findMany({
        skip,
        take: limit,
        where,
    });
    return {
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getProductBySlug = async (slug) => {
    const product = await productRepository.findBySlug(slug);
    if (!product)
        throw new ProductError(404, "Product not found");
    return product;
};
export const getFeaturedProducts = async (limit) => {
    return productRepository.findFeatured(limit);
};
export const getNewArrivals = async (limit) => {
    return productRepository.findNewArrivals(limit);
};
export const searchProducts = async (q, page = 1, limit = 20) => {
    if (!q || q.trim().length === 0)
        throw new ProductError(400, "Search query is required");
    const skip = (page - 1) * limit;
    const [products, total] = await productRepository.search(q, skip, limit);
    return {
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
