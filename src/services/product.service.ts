/**
 * Product Service
 * Business logic for product management (admin) and product browsing (client).
 */

import { productRepository } from "../repositories/product.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { slugify } from "../utils/slugify.js";
import type {
  Gender,
  ProductStatus,
  SizeSystem,
} from "../generated/prisma/enums.js";

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class ProductError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ProductError";
  }
}

// ─── Admin: Products ──────────────────────────────────────────────────────────

export const createProduct = async (
  adminId: string,
  data: {
    name: string;
    brand: string;
    description?: string;
    shortDescription?: string;
    gender: Gender;
    shoeType: string;
    category: string;
    basePrice: number;
    releaseDate?: string;
    featuredProduct?: boolean;
    newArrival?: boolean;
  },
) => {
  const slug = slugify(data.name);
  const product = await productRepository.create({
    ...data,
    slug,
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
  });

  await adminRepository.logActivity(adminId, "CREATE", "Product", product.id);
  return product;
};

export const listProducts = async (query: {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  search?: string;
  category?: string;
  brand?: string;
  collectionId?: string;
  categoryId?: string;
  gender?: Gender;
  shoeType?: string;
  minPrice?: number;
  maxPrice?: number;
  featuredProduct?: boolean;
  newArrival?: boolean;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.category)
    where.category = { contains: query.category, mode: "insensitive" };
  if (query.brand) where.brand = { contains: query.brand, mode: "insensitive" };
  if (query.collectionId) where.collectionId = query.collectionId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.gender) where.gender = query.gender;
  if (query.shoeType) {
    where.shoeType = { contains: query.shoeType, mode: "insensitive" };
  }
  if (query.minPrice || query.maxPrice) {
    where.basePrice = {};
    if (query.minPrice !== undefined) {
      (where.basePrice as Record<string, unknown>).gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      (where.basePrice as Record<string, unknown>).lte = query.maxPrice;
    }
  }
  if (query.featuredProduct !== undefined) {
    where.featuredProduct = query.featuredProduct;
  }
  if (query.newArrival !== undefined) {
    where.newArrival = query.newArrival;
  }
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

export const bulkUpdateProductStatus = async (
  adminId: string,
  productIds: string[],
  status: ProductStatus,
) => {
  if (!productIds.length) throw new ProductError(400, "Product IDs are required");

  const result = await productRepository.bulkUpdateStatus(productIds, status);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Product",
    "bulk-status",
  );
  return result;
};

export const bulkToggleFeaturedProducts = async (
  adminId: string,
  productIds: string[],
  featuredProduct: boolean,
) => {
  if (!productIds.length) throw new ProductError(400, "Product IDs are required");

  const result = await productRepository.bulkToggleFeatured(
    productIds,
    featuredProduct,
  );
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Product",
    "bulk-featured",
  );
  return result;
};

export const bulkToggleNewArrivalProducts = async (
  adminId: string,
  productIds: string[],
  newArrival: boolean,
) => {
  if (!productIds.length) throw new ProductError(400, "Product IDs are required");

  const result = await productRepository.bulkToggleNewArrival(productIds, newArrival);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Product",
    "bulk-new-arrival",
  );
  return result;
};

export const bulkUpdateProductPrices = async (
  adminId: string,
  updates: { productId: string; basePrice: number }[],
) => {
  if (!updates.length) throw new ProductError(400, "Price updates are required");
  if (updates.some((item) => item.basePrice <= 0)) {
    throw new ProductError(400, "All prices must be positive values");
  }

  const result = await productRepository.bulkUpdatePrices(updates);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Product",
    "bulk-price",
  );
  return result;
};

export const getAdminProductAnalytics = async () => {
  const [bestSellers, trending, lowStock] = await Promise.all([
    productRepository.findBestSellers(0, 10),
    productRepository.findTrendingProducts(0, 10),
    inventoryRepository.findLowStock(20),
  ]);

  return {
    bestSellers: bestSellers[0],
    trendingProducts: trending[0],
    lowStock,
  };
};

export const getProduct = async (productId: string) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");
  return product;
};

export const updateProduct = async (
  adminId: string,
  productId: string,
  data: {
    name?: string;
    brand?: string;
    description?: string;
    shortDescription?: string;
    gender?: Gender;
    shoeType?: string;
    category?: string;
    basePrice?: number;
    releaseDate?: string;
    featuredProduct?: boolean;
    newArrival?: boolean;
  },
) => {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new ProductError(404, "Product not found");

  const updateData: Record<string, unknown> = { ...data };
  if (data.name) updateData.slug = slugify(data.name);
  if (data.releaseDate) updateData.releaseDate = new Date(data.releaseDate);

  const product = await productRepository.update(
    productId,
    updateData as never,
  );
  await adminRepository.logActivity(adminId, "UPDATE", "Product", productId);
  return product;
};

export const archiveProduct = async (adminId: string, productId: string) => {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new ProductError(404, "Product not found");

  const product = await productRepository.updateStatus(productId, "ARCHIVED");
  await adminRepository.logActivity(adminId, "DELETE", "Product", productId);
  return product;
};

export const updateProductStatus = async (
  adminId: string,
  productId: string,
  status: ProductStatus,
) => {
  const existing = await productRepository.findById(productId);
  if (!existing) throw new ProductError(404, "Product not found");

  const product = await productRepository.updateStatus(productId, status);
  await adminRepository.logActivity(adminId, "UPDATE", "Product", productId);
  return product;
};

// ─── Admin: Variants ──────────────────────────────────────────────────────────

export const createVariant = async (
  adminId: string,
  productId: string,
  data: {
    sku: string;
    size: string;
    color: string;
    material?: string;
    width?: string;
    price: number;
    comparePrice?: number;
    weight?: number;
    barcode?: string;
  },
) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");

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

  await adminRepository.logActivity(
    adminId,
    "CREATE",
    "ProductVariant",
    variant.id,
  );
  return variant;
};

export const updateVariant = async (
  adminId: string,
  variantId: string,
  data: {
    sku?: string;
    size?: string;
    color?: string;
    material?: string;
    width?: string;
    price?: number;
    comparePrice?: number;
    weight?: number;
    barcode?: string;
  },
) => {
  const existing = await productRepository.findVariantById(variantId);
  if (!existing) throw new ProductError(404, "Variant not found");

  const variant = await productRepository.updateVariant(variantId, data);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ProductVariant",
    variantId,
  );
  return variant;
};

export const archiveVariant = async (adminId: string, variantId: string) => {
  const existing = await productRepository.findVariantById(variantId);
  if (!existing) throw new ProductError(404, "Variant not found");

  const variant = await productRepository.archiveVariant(variantId);
  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "ProductVariant",
    variantId,
  );
  return variant;
};

// ─── Admin: Images ────────────────────────────────────────────────────────────

export const addProductImages = async (
  adminId: string,
  productId: string,
  images: {
    imageUrl: string;
    altText?: string;
    position?: number;
    isThumbnail?: boolean;
    variantId?: string;
  }[],
) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");

  const imageData = images.map((img) => ({
    productId,
    ...img,
  }));

  await productRepository.createImages(imageData);
  await adminRepository.logActivity(
    adminId,
    "CREATE",
    "ProductImage",
    productId,
  );
  return { count: images.length };
};

export const deleteProductImage = async (adminId: string, imageId: string) => {
  const image = await productRepository.findImageById(imageId);
  if (!image) throw new ProductError(404, "Image not found");

  await productRepository.deleteImage(imageId);
  await adminRepository.logActivity(adminId, "DELETE", "ProductImage", imageId);
};

// ─── Admin: Specifications ────────────────────────────────────────────────────

export const updateSpecification = async (
  adminId: string,
  productId: string,
  data: {
    material?: string;
    soleMaterial?: string;
    upperMaterial?: string;
    cushioningType?: string;
    heelHeight?: number;
    closureType?: string;
    waterproof?: boolean;
    breathable?: boolean;
    weight?: number;
  },
) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");

  const spec = await productRepository.upsertSpecification(productId, data);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ShoeSpecification",
    productId,
  );
  return spec;
};

// ─── Admin: Size Guides ───────────────────────────────────────────────────────

export const createSizeGuide = async (
  adminId: string,
  productId: string,
  data: { sizeSystem: SizeSystem; sizeValue: string; footLength?: number },
) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");

  const guide = await productRepository.createSizeGuide({ productId, ...data });
  await adminRepository.logActivity(adminId, "CREATE", "SizeGuide", guide.id);
  return guide;
};

export const deleteSizeGuide = async (adminId: string, sizeGuideId: string) => {
  const guide = await productRepository.findSizeGuideById(sizeGuideId);
  if (!guide) throw new ProductError(404, "Size guide not found");

  await productRepository.deleteSizeGuide(sizeGuideId);
  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "SizeGuide",
    sizeGuideId,
  );
};

// ─── Client: Products ─────────────────────────────────────────────────────────

export const listClientProducts = async (query: {
  page?: number;
  limit?: number;
  category?: string;
  collection?: string;
  subCategory?: string;
  gender?: Gender;
  shoeType?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  search?: string;
  sortBy?: "price" | "newest" | "popular" | "name";
  order?: "asc" | "desc";
}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const orderDirection = query.order ?? "desc";
  let orderBy: Record<string, string> = { createdAt: orderDirection };

  if (query.sortBy === "price") {
    orderBy = { basePrice: orderDirection };
  } else if (query.sortBy === "name") {
    orderBy = { name: orderDirection };
  } else if (query.sortBy === "popular") {
    orderBy = { createdAt: orderDirection };
  }

  const [products, total] = await productRepository.findProductsByFilters({
    skip,
    take: limit,
    filters: {
      category: query.category,
      collection: query.collection,
      subCategory: query.subCategory,
      gender: query.gender,
      shoeType: query.shoeType,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      size: query.size,
      color: query.color,
      search: query.search,
    },
    orderBy,
  });

  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getProductBySlug = async (slug: string) => {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw new ProductError(404, "Product not found");

  return product;
};

export const getFeaturedProducts = async (limit?: number) => {
  return productRepository.findFeatured(limit);
};

export const getNewArrivals = async (limit?: number) => {
  return productRepository.findNewArrivals(limit);
};

export const searchProducts = async (q: string, page = 1, limit = 20) => {
  if (!q || q.trim().length === 0)
    throw new ProductError(400, "Search query is required");
  const skip = (page - 1) * limit;
  const [products, total] = await productRepository.search(q, skip, limit);
  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getBestSellers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [products, total] = await productRepository.findBestSellers(skip, limit);
  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getTrendingProducts = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [products, total] = await productRepository.findTrendingProducts(skip, limit);
  return {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getFilterOptions = async () => {
  return productRepository.getFilterOptions();
};

export const getAllCategories = async () => {
  return productRepository.findCategories();
};

export const getProductsByCategory = async (
  category: string,
  query: {
    page?: number;
    limit?: number;
    collection?: string;
    gender?: Gender;
    shoeType?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    sortBy?: "price" | "newest" | "popular" | "name";
    order?: "asc" | "desc";
  },
) => {
  return listClientProducts({
    ...query,
    category,
  });
};

export const getSubCategoryProducts = async (
  category: string,
  subCategory: string,
  query: {
    page?: number;
    limit?: number;
    collection?: string;
    gender?: Gender;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    sortBy?: "price" | "newest" | "popular" | "name";
    order?: "asc" | "desc";
  },
) => {
  return listClientProducts({
    ...query,
    category,
    subCategory,
  });
};

export const getCollections = async () => {
  return productRepository.findCollections();
};

export const getProductsByCollection = async (
  collection: string,
  query: {
    page?: number;
    limit?: number;
    category?: string;
    subCategory?: string;
    gender?: Gender;
    shoeType?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    sortBy?: "price" | "newest" | "popular" | "name";
    order?: "asc" | "desc";
  },
) => {
  return listClientProducts({
    ...query,
    collection,
  });
};

export const getProductVariants = async (productId: string) => {
  const product = await productRepository.findById(productId);
  if (!product) throw new ProductError(404, "Product not found");

  return productRepository.findProductVariants(productId);
};

export const getVariantDetails = async (variantId: string) => {
  const variant = await productRepository.findVariantDetails(variantId);
  if (!variant || variant.status !== "ACTIVE") {
    throw new ProductError(404, "Variant not found");
  }

  return variant;
};

export const getRelatedProducts = async (productId: string, limit = 8) => {
  const products = await productRepository.findRelatedProducts(productId, limit);
  return { products };
};

export const getSimilarProducts = async (productId: string, limit = 8) => {
  const products = await productRepository.findSimilarProducts(productId, limit);
  return { products };
};

export const getPersonalizedProducts = async (customerId: string, limit = 20) => {
  const products = await productRepository.findPersonalizedProducts(customerId, limit);
  return { products };
};
