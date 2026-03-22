import prisma from "../lib/prisma.js";
import type { CollectionStatus } from "../generated/prisma/enums.js";

export interface CreateCollectionInput {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  status?: CollectionStatus;
}

export interface UpdateCollectionInput {
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  status?: CollectionStatus;
}

export const collectionRepository = {
  findAll: (params: {
    skip?: number;
    take?: number;
    status?: CollectionStatus;
    search?: string;
  }) => {
    const { skip = 0, take = 20, status, search } = params;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.collection.findMany({
      where: where as never,
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

  count: (params: { status?: CollectionStatus; search?: string }) => {
    const { status, search } = params;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.collection.count({ where: where as never });
  },

  findById: (id: string) =>
    prisma.collection.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),

  findBySlug: (slug: string) =>
    prisma.collection.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),

  findByName: (name: string) =>
    prisma.collection.findUnique({
      where: { name },
    }),

  create: (data: CreateCollectionInput) =>
    prisma.collection.create({
      data,
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),

  update: (id: string, data: UpdateCollectionInput) =>
    prisma.collection.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),

  delete: (id: string) =>
    prisma.collection.update({
      where: { id },
      data: { status: "ARCHIVED" },
    }),

  hardDelete: (id: string) =>
    prisma.collection.delete({
      where: { id },
    }),

  updateStatus: (id: string, status: CollectionStatus) =>
    prisma.collection.update({
      where: { id },
      data: { status },
    }),

  reorder: async (orderMap: { id: string; displayOrder: number }[]) => {
    // Use transaction to update all display orders atomically
    await prisma.$transaction(
      orderMap.map((item) =>
        prisma.collection.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
  },

  countProducts: (collectionId: string) =>
    prisma.product.count({
      where: { collectionId },
    }),

  getProducts: (collectionId: string, skip = 0, take = 20) =>
    prisma.product.findMany({
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

  getStats: async (collectionId: string) => {
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
