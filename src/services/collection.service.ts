import {
  collectionRepository,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "../repositories/collection.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { slugify } from "../utils/slugify.js";
import type { CollectionStatus } from "../generated/prisma/enums.js";

export class CollectionError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CollectionError";
  }
}

export const listCollections = async (
  page = 1,
  limit = 20,
  status?: CollectionStatus,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const [collections, total] = await Promise.all([
    collectionRepository.findAll({ skip, take: limit, status, search }),
    collectionRepository.count({ status, search }),
  ]);

  return {
    collections,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getCollection = async (id: string) => {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw new CollectionError(404, "Collection not found");
  return collection;
};

export const getCollectionBySlug = async (slug: string) => {
  const collection = await collectionRepository.findBySlug(slug);
  if (!collection) throw new CollectionError(404, "Collection not found");
  return collection;
};

export const createCollection = async (
  adminId: string,
  data: Omit<CreateCollectionInput, "slug"> & { slug?: string },
) => {
  // Generate slug from name if not provided
  const slug = data.slug || slugify(data.name);

  // Check if name or slug already exists
  const [existingByName, existingBySlug] = await Promise.all([
    collectionRepository.findByName(data.name),
    collectionRepository.findBySlug(slug),
  ]);

  if (existingByName)
    throw new CollectionError(400, "Collection with this name already exists");
  if (existingBySlug)
    throw new CollectionError(400, "Collection with this slug already exists");

  const collection = await collectionRepository.create({
    ...data,
    slug,
  });

  await adminRepository.logActivity(
    adminId,
    "CREATE",
    "Collection",
    collection.id,
  );

  return collection;
};

export const updateCollection = async (
  adminId: string,
  id: string,
  data: UpdateCollectionInput,
) => {
  const existing = await collectionRepository.findById(id);
  if (!existing) throw new CollectionError(404, "Collection not found");

  // If updating name, generate new slug
  if (data.name && !data.slug) {
    data.slug = slugify(data.name);
  }

  // Check for name/slug conflicts
  if (data.name && data.name !== existing.name) {
    const existingByName = await collectionRepository.findByName(data.name);
    if (existingByName && existingByName.id !== id) {
      throw new CollectionError(
        400,
        "Collection with this name already exists",
      );
    }
  }

  if (data.slug && data.slug !== existing.slug) {
    const existingBySlug = await collectionRepository.findBySlug(data.slug);
    if (existingBySlug && existingBySlug.id !== id) {
      throw new CollectionError(
        400,
        "Collection with this slug already exists",
      );
    }
  }

  const collection = await collectionRepository.update(id, data);

  await adminRepository.logActivity(adminId, "UPDATE", "Collection", id);

  return collection;
};

export const deleteCollection = async (adminId: string, id: string) => {
  const existing = await collectionRepository.findById(id);
  if (!existing) throw new CollectionError(404, "Collection not found");

  // Check if collection has products
  const productCount = await collectionRepository.countProducts(id);
  if (productCount > 0) {
    throw new CollectionError(
      400,
      `Cannot delete collection with ${productCount} products. Please reassign or delete products first.`,
    );
  }

  await collectionRepository.hardDelete(id);

  await adminRepository.logActivity(adminId, "DELETE", "Collection", id);
};

export const updateCollectionStatus = async (
  adminId: string,
  id: string,
  status: CollectionStatus,
) => {
  const existing = await collectionRepository.findById(id);
  if (!existing) throw new CollectionError(404, "Collection not found");

  const collection = await collectionRepository.updateStatus(id, status);

  await adminRepository.logActivity(adminId, "UPDATE", "Collection", id);

  return collection;
};

export const reorderCollections = async (
  adminId: string,
  orderMap: { id: string; displayOrder: number }[],
) => {
  // Validate all collections exist
  const collections = await Promise.all(
    orderMap.map((item) => collectionRepository.findById(item.id)),
  );

  if (collections.some((c) => !c)) {
    throw new CollectionError(400, "One or more collections not found");
  }

  await collectionRepository.reorder(orderMap);

  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Collection",
    "bulk-reorder",
  );
};

export const getCollectionProducts = async (
  id: string,
  page = 1,
  limit = 20,
) => {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw new CollectionError(404, "Collection not found");

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    collectionRepository.getProducts(id, skip, limit),
    collectionRepository.countProducts(id),
  ]);

  return {
    collection,
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getCollectionStats = async (id: string) => {
  const collection = await collectionRepository.findById(id);
  if (!collection) throw new CollectionError(404, "Collection not found");

  const stats = await collectionRepository.getStats(id);

  return {
    collection,
    stats,
  };
};
