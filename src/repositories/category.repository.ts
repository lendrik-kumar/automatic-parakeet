import prisma from "../lib/prisma.js";
import type { CategoryStatus } from "../generated/prisma/enums.js";

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  parentId?: string;
  status?: CategoryStatus;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  parentId?: string;
  status?: CategoryStatus;
}

export const categoryRepository = {
  findAll: (params: {
    skip?: number;
    take?: number;
    status?: CategoryStatus;
    search?: string;
    parentId?: string | null;
  }) => {
    const { skip = 0, take = 20, status, search, parentId } = params;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (parentId !== undefined) where.parentId = parentId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.category.findMany({
      where: where as never,
      skip,
      take,
      orderBy: { displayOrder: "asc" },
      include: {
        parent: true,
        subcategories: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    });
  },

  count: (params: {
    status?: CategoryStatus;
    search?: string;
    parentId?: string | null;
  }) => {
    const { status, search, parentId } = params;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (parentId !== undefined) where.parentId = parentId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.category.count({ where: where as never });
  },

  findById: (id: string) =>
    prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subcategories: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  findBySlug: (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        subcategories: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  findByName: (name: string) =>
    prisma.category.findUnique({
      where: { name },
    }),

  findWithSubcategories: (id: string) =>
    prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subcategories: {
          orderBy: { displayOrder: "asc" },
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  findRootCategories: () =>
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { displayOrder: "asc" },
      include: {
        subcategories: {
          orderBy: { displayOrder: "asc" },
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  create: (data: CreateCategoryInput) =>
    prisma.category.create({
      data,
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  update: (id: string, data: UpdateCategoryInput) =>
    prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    }),

  delete: (id: string) =>
    prisma.category.update({
      where: { id },
      data: { status: "ARCHIVED" },
    }),

  hardDelete: (id: string) =>
    prisma.category.delete({
      where: { id },
    }),

  updateStatus: (id: string, status: CategoryStatus) =>
    prisma.category.update({
      where: { id },
      data: { status },
    }),

  reorder: async (orderMap: { id: string; displayOrder: number }[]) => {
    await prisma.$transaction(
      orderMap.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
  },

  countProducts: (categoryId: string) =>
    prisma.product.count({
      where: { categoryId },
    }),

  getProducts: (categoryId: string, skip = 0, take = 20) =>
    prisma.product.findMany({
      where: { categoryId },
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

  getStats: async (categoryId: string) => {
    const [productCount, totalRevenue] = await Promise.all([
      prisma.product.count({ where: { categoryId } }),
      prisma.orderItem.aggregate({
        where: {
          product: { categoryId },
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
