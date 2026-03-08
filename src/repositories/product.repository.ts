import prisma from "../lib/prisma.js";
import type {
  Gender,
  ProductStatus,
  SizeSystem,
} from "../generated/prisma/enums.js";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CreateProductInput {
  name: string;
  slug: string;
  brand: string;
  description?: string;
  shortDescription?: string;
  gender: Gender;
  shoeType: string;
  category: string;
  basePrice: number;
  releaseDate?: Date;
  featuredProduct?: boolean;
  newArrival?: boolean;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  brand?: string;
  description?: string;
  shortDescription?: string;
  gender?: Gender;
  shoeType?: string;
  category?: string;
  basePrice?: number;
  releaseDate?: Date;
  featuredProduct?: boolean;
  newArrival?: boolean;
  status?: ProductStatus;
}

export interface CreateVariantInput {
  productId: string;
  sku: string;
  size: string;
  color: string;
  material?: string;
  width?: string;
  price: number;
  comparePrice?: number;
  weight?: number;
  barcode?: string;
}

export interface UpdateVariantInput {
  sku?: string;
  size?: string;
  color?: string;
  material?: string;
  width?: string;
  price?: number;
  comparePrice?: number;
  weight?: number;
  barcode?: string;
  status?: ProductStatus;
}

export interface CreateSizeGuideInput {
  productId: string;
  sizeSystem: SizeSystem;
  sizeValue: string;
  footLength?: number;
}

export interface UpdateSpecificationInput {
  material?: string;
  soleMaterial?: string;
  upperMaterial?: string;
  cushioningType?: string;
  heelHeight?: number;
  closureType?: string;
  waterproof?: boolean;
  breathable?: boolean;
  weight?: number;
}

export interface CreateImageInput {
  productId: string;
  variantId?: string;
  imageUrl: string;
  altText?: string;
  position?: number;
  isThumbnail?: boolean;
}

// ─── Repository ─────────────────────────────────────────────────────────────────

export const productRepository = {
  // ── Products ──────────────────────────────────────────────────────────────

  create: (data: CreateProductInput) => prisma.product.create({ data }),

  findById: (id: string) =>
    prisma.product.findUnique({
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

  findBySlug: (slug: string) =>
    prisma.product.findUnique({
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

  findMany: (params: {
    skip: number;
    take: number;
    where?: Record<string, unknown>;
    orderBy?: Record<string, string>;
  }) =>
    Promise.all([
      prisma.product.findMany({
        where: params.where as never,
        skip: params.skip,
        take: params.take,
        orderBy: (params.orderBy as never) ?? { createdAt: "desc" },
        include: {
          images: { where: { isThumbnail: true }, take: 1 },
          _count: { select: { variants: true, reviews: true } },
        },
      }),
      prisma.product.count({ where: params.where as never }),
    ]),

  update: (id: string, data: UpdateProductInput) =>
    prisma.product.update({ where: { id }, data }),

  updateStatus: (id: string, status: ProductStatus) =>
    prisma.product.update({ where: { id }, data: { status } }),

  // ── Featured & New Arrivals ─────────────────────────────────────────────

  findFeatured: (take = 20) =>
    prisma.product.findMany({
      where: { featuredProduct: true, status: "ACTIVE" },
      take,
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isThumbnail: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
    }),

  findNewArrivals: (take = 20) =>
    prisma.product.findMany({
      where: { newArrival: true, status: "ACTIVE" },
      take,
      orderBy: { releaseDate: "desc" },
      include: {
        images: { where: { isThumbnail: true }, take: 1 },
        _count: { select: { reviews: true } },
      },
    }),

  search: (query: string, skip: number, take: number) =>
    Promise.all([
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

  createVariant: (data: CreateVariantInput) =>
    prisma.productVariant.create({ data }),

  findVariantById: (id: string) =>
    prisma.productVariant.findUnique({
      where: { id },
      include: { inventory: true, product: true },
    }),

  updateVariant: (id: string, data: UpdateVariantInput) =>
    prisma.productVariant.update({ where: { id }, data }),

  archiveVariant: (id: string) =>
    prisma.productVariant.update({
      where: { id },
      data: { status: "ARCHIVED" },
    }),

  // ── Images ────────────────────────────────────────────────────────────────

  createImage: (data: CreateImageInput) => prisma.productImage.create({ data }),

  createImages: (data: CreateImageInput[]) =>
    prisma.productImage.createMany({ data }),

  deleteImage: (id: string) => prisma.productImage.delete({ where: { id } }),

  findImageById: (id: string) =>
    prisma.productImage.findUnique({ where: { id } }),

  // ── Specifications ────────────────────────────────────────────────────────

  upsertSpecification: (productId: string, data: UpdateSpecificationInput) =>
    prisma.shoeSpecification.upsert({
      where: { productId },
      update: data,
      create: { productId, ...data },
    }),

  // ── Size Guides ───────────────────────────────────────────────────────────

  createSizeGuide: (data: CreateSizeGuideInput) =>
    prisma.sizeGuide.create({ data }),

  deleteSizeGuide: (id: string) => prisma.sizeGuide.delete({ where: { id } }),

  findSizeGuideById: (id: string) =>
    prisma.sizeGuide.findUnique({ where: { id } }),
};
