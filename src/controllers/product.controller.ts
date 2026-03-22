import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/product.service.js";
import { ProductError } from "../services/product.service.js";

// ─── Error Handler ────────────────────────────────────────────────────────────

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof z.ZodError) {
    res
      .status(400)
      .json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    return;
  }
  if (error instanceof ProductError) {
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
    return;
  }
  console.error("[ProductController]", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  collectionId: z.string().uuid().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
  shoeType: z.string().min(1),
  category: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().positive(),
  releaseDate: z.string().optional(),
  featuredProduct: z.boolean().optional(),
  newArrival: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

const statusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "DISCONTINUED"]),
});

const bulkStatusSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "DISCONTINUED"]),
});

const bulkFeatureSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  featuredProduct: z.boolean(),
});

const bulkNewArrivalSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  newArrival: z.boolean(),
});

const bulkPriceSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().uuid(),
        basePrice: z.number().positive(),
      }),
    )
    .min(1),
});

const createVariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  material: z.string().optional(),
  width: z.string().optional(),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  barcode: z.string().optional(),
});

const updateVariantSchema = createVariantSchema.partial();

const createImageSchema = z.object({
  images: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        altText: z.string().optional(),
        position: z.number().int().optional(),
        isThumbnail: z.boolean().optional(),
        variantId: z.string().uuid().optional(),
      }),
    )
    .min(1),
});

const specificationSchema = z.object({
  material: z.string().optional(),
  soleMaterial: z.string().optional(),
  upperMaterial: z.string().optional(),
  cushioningType: z.string().optional(),
  heelHeight: z.number().optional(),
  closureType: z.string().optional(),
  waterproof: z.boolean().optional(),
  breathable: z.boolean().optional(),
  weight: z.number().optional(),
});

const sizeGuideSchema = z.object({
  sizeSystem: z.enum(["US", "EU", "UK"]),
  sizeValue: z.string().min(1),
  footLength: z.number().positive().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /admin/products */
export const adminCreateProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await svc.createProduct(req.admin!.id, data);
    res
      .status(201)
      .json({ success: true, message: "Product created", data: { product } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /admin/products */
export const adminListProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listProducts({
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
      status: req.query.status as never,
      search: req.query.search as string,
      category: req.query.category as string,
      brand: req.query.brand as string,
      collectionId: req.query.collectionId as string,
      categoryId: req.query.categoryId as string,
      gender: req.query.gender as never,
      shoeType: req.query.shoeType as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      featuredProduct:
        req.query.featuredProduct !== undefined
          ? req.query.featuredProduct === "true"
          : undefined,
      newArrival:
        req.query.newArrival !== undefined
          ? req.query.newArrival === "true"
          : undefined,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /admin/products/:productId */
export const adminGetProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product = await svc.getProduct(req.params.productId);
    res.status(200).json({ success: true, data: { product } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/products/:productId */
export const adminUpdateProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await svc.updateProduct(
      req.admin!.id,
      req.params.productId,
      data,
    );
    res
      .status(200)
      .json({ success: true, message: "Product updated", data: { product } });
  } catch (e) {
    handleError(res, e);
  }
};

/** DELETE /admin/products/:productId */
export const adminDeleteProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await svc.archiveProduct(req.admin!.id, req.params.productId);
    res.status(200).json({ success: true, message: "Product archived" });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/products/:productId/status */
export const adminUpdateProductStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const product = await svc.updateProductStatus(
      req.admin!.id,
      req.params.productId,
      status,
    );
    res
      .status(200)
      .json({ success: true, message: "Status updated", data: { product } });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /admin/products/bulk/status */
export const adminBulkUpdateProductStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productIds, status } = bulkStatusSchema.parse(req.body);
    const result = await svc.bulkUpdateProductStatus(
      req.admin!.id,
      productIds,
      status,
    );
    res.status(200).json({
      success: true,
      message: "Product statuses updated",
      data: { updatedCount: result.count },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /admin/products/bulk/feature */
export const adminBulkToggleFeatured = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productIds, featuredProduct } = bulkFeatureSchema.parse(req.body);
    const result = await svc.bulkToggleFeaturedProducts(
      req.admin!.id,
      productIds,
      featuredProduct,
    );
    res.status(200).json({
      success: true,
      message: "Featured products updated",
      data: { updatedCount: result.count },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /admin/products/bulk/new-arrival */
export const adminBulkToggleNewArrival = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { productIds, newArrival } = bulkNewArrivalSchema.parse(req.body);
    const result = await svc.bulkToggleNewArrivalProducts(
      req.admin!.id,
      productIds,
      newArrival,
    );
    res.status(200).json({
      success: true,
      message: "New arrival products updated",
      data: { updatedCount: result.count },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /admin/products/bulk/prices */
export const adminBulkUpdateProductPrices = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { updates } = bulkPriceSchema.parse(req.body);
    const result = await svc.bulkUpdateProductPrices(req.admin!.id, updates);
    res.status(200).json({
      success: true,
      message: "Product prices updated",
      data: { updatedCount: result.length },
    });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /admin/products/analytics */
export const adminProductAnalytics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await svc.getAdminProductAnalytics();
    res.status(200).json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

// ── Variants ────────────────────────────────────────────────────────────────

/** POST /admin/products/:productId/variants */
export const adminCreateVariant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = createVariantSchema.parse(req.body);
    const variant = await svc.createVariant(
      req.admin!.id,
      req.params.productId,
      data,
    );
    res
      .status(201)
      .json({ success: true, message: "Variant created", data: { variant } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/variants/:variantId */
export const adminUpdateVariant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = updateVariantSchema.parse(req.body);
    const variant = await svc.updateVariant(
      req.admin!.id,
      req.params.variantId,
      data,
    );
    res
      .status(200)
      .json({ success: true, message: "Variant updated", data: { variant } });
  } catch (e) {
    handleError(res, e);
  }
};

/** DELETE /admin/variants/:variantId */
export const adminDeleteVariant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await svc.archiveVariant(req.admin!.id, req.params.variantId);
    res.status(200).json({ success: true, message: "Variant archived" });
  } catch (e) {
    handleError(res, e);
  }
};

// ── Images ──────────────────────────────────────────────────────────────────

/** POST /admin/products/:productId/images */
export const adminAddImages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { images } = createImageSchema.parse(req.body);
    const result = await svc.addProductImages(
      req.admin!.id,
      req.params.productId,
      images,
    );
    res
      .status(201)
      .json({ success: true, message: "Images added", data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** DELETE /admin/images/:imageId */
export const adminDeleteImage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await svc.deleteProductImage(req.admin!.id, req.params.imageId);
    res.status(200).json({ success: true, message: "Image deleted" });
  } catch (e) {
    handleError(res, e);
  }
};

// ── Specifications ──────────────────────────────────────────────────────────

/** PUT /admin/products/:productId/specifications */
export const adminUpdateSpecification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = specificationSchema.parse(req.body);
    const spec = await svc.updateSpecification(
      req.admin!.id,
      req.params.productId,
      data,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Specification updated",
        data: { specification: spec },
      });
  } catch (e) {
    handleError(res, e);
  }
};

// ── Size Guides ─────────────────────────────────────────────────────────────

/** POST /admin/products/:productId/size-guides */
export const adminCreateSizeGuide = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = sizeGuideSchema.parse(req.body);
    const guide = await svc.createSizeGuide(
      req.admin!.id,
      req.params.productId,
      data,
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Size guide created",
        data: { sizeGuide: guide },
      });
  } catch (e) {
    handleError(res, e);
  }
};

/** DELETE /admin/size-guides/:sizeGuideId */
export const adminDeleteSizeGuide = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await svc.deleteSizeGuide(req.admin!.id, req.params.sizeGuideId);
    res.status(200).json({ success: true, message: "Size guide removed" });
  } catch (e) {
    handleError(res, e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /products */
export const clientListProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listClientProducts({
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
      category: req.query.category as string,
      collection: req.query.collection as string,
      subCategory: req.query.subCategory as string,
      gender: req.query.gender as never,
      shoeType: req.query.shoeType as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      size: req.query.size as string,
      color: req.query.color as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as "price" | "newest" | "popular" | "name",
      order: req.query.order as "asc" | "desc",
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/featured */
export const clientFeaturedProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const products = await svc.getFeaturedProducts(
      Number(req.query.limit) || undefined,
    );
    res.status(200).json({ success: true, data: { products } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/new-arrivals */
export const clientNewArrivals = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const products = await svc.getNewArrivals(
      Number(req.query.limit) || undefined,
    );
    res.status(200).json({ success: true, data: { products } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/search */
export const clientSearchProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.searchProducts(
      req.query.q as string,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/best-sellers */
export const clientBestSellers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getBestSellers(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/trending */
export const clientTrendingProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getTrendingProducts(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/filters */
export const clientGetFilterOptions = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getFilterOptions();
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/categories */
export const clientGetAllCategories = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categories = await svc.getAllCategories();
    res.status(200).json({ success: true, data: { categories } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/categories/:category */
export const clientGetProductsByCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getProductsByCategory(req.params.category, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      collection: req.query.collection as string,
      gender: req.query.gender as never,
      shoeType: req.query.shoeType as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      size: req.query.size as string,
      color: req.query.color as string,
      sortBy: req.query.sortBy as "price" | "newest" | "popular" | "name",
      order: req.query.order as "asc" | "desc",
    });

    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/categories/:category/:subCategory */
export const clientGetSubCategoryProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getSubCategoryProducts(
      req.params.category,
      req.params.subCategory,
      {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        collection: req.query.collection as string,
        gender: req.query.gender as never,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        size: req.query.size as string,
        color: req.query.color as string,
        sortBy: req.query.sortBy as "price" | "newest" | "popular" | "name",
        order: req.query.order as "asc" | "desc",
      },
    );

    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/collections */
export const clientGetCollections = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const collections = await svc.getCollections();
    res.status(200).json({ success: true, data: { collections } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/collections/:collection */
export const clientGetProductsByCollection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getProductsByCollection(req.params.collection, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      category: req.query.category as string,
      subCategory: req.query.subCategory as string,
      gender: req.query.gender as never,
      shoeType: req.query.shoeType as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      size: req.query.size as string,
      color: req.query.color as string,
      sortBy: req.query.sortBy as "price" | "newest" | "popular" | "name",
      order: req.query.order as "asc" | "desc",
    });

    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/:productId/variants */
export const clientGetVariants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const variants = await svc.getProductVariants(req.params.productId);
    res.status(200).json({ success: true, data: { variants } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/variant/:variantId */
export const clientGetVariantDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const variant = await svc.getVariantDetails(req.params.variantId);
    res.status(200).json({ success: true, data: { variant } });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/:productId/related */
export const clientRelatedProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getRelatedProducts(
      req.params.productId,
      Number(req.query.limit) || 8,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/:productId/similar */
export const clientSimilarProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getSimilarProducts(
      req.params.productId,
      Number(req.query.limit) || 8,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/recommendations/personalized */
export const clientPersonalizedProducts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.getPersonalizedProducts(
      req.user!.id,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /products/:slug */
export const clientGetProduct = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const product = await svc.getProductBySlug(req.params.slug);
    res.status(200).json({ success: true, data: { product } });
  } catch (e) {
    handleError(res, e);
  }
};
