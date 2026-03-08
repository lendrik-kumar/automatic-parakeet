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
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]),
  shoeType: z.string().min(1),
  category: z.string().min(1),
  basePrice: z.number().positive(),
  releaseDate: z.string().optional(),
  featuredProduct: z.boolean().optional(),
  newArrival: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial();

const statusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "DISCONTINUED"]),
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
      brand: req.query.brand as string,
      gender: req.query.gender as never,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      size: req.query.size as string,
      color: req.query.color as string,
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
