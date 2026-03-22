/**
 * Inventory Service
 */

import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { AppError } from "../utils/AppError.js";

export class InventoryError extends AppError {}

export const listInventory = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [items, total] = await inventoryRepository.findManyWithFilters(skip, limit);
  return {
    inventory: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const listInventoryAdvanced = async (
  page = 1,
  limit = 20,
  filters?: { lowStock?: boolean; outOfStock?: boolean; search?: string },
) => {
  const skip = (page - 1) * limit;
  const [items, total] = await inventoryRepository.findManyWithFilters(
    skip,
    limit,
    filters,
  );

  let inventory = items;
  if (filters?.lowStock) {
    inventory = items.filter((item) => item.availableStock <= item.reorderThreshold);
  }

  return {
    inventory,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getInventory = async (variantId: string) => {
  const inv = await inventoryRepository.findByVariantId(variantId);
  if (!inv) throw new InventoryError(404, "Inventory record not found");
  return inv;
};

export const updateInventory = async (
  adminId: string,
  variantId: string,
  data: { stockQuantity?: number; reorderThreshold?: number },
) => {
  const inv = await inventoryRepository.findByVariantId(variantId);
  if (!inv) throw new InventoryError(404, "Inventory record not found");

  await inventoryRepository.updateStock(variantId, data);

  // Recalculate available stock
  await inventoryRepository.recalculateAvailable(variantId);

  await adminRepository.logActivity(adminId, "UPDATE", "Inventory", inv.id);

  // Re-fetch to return accurate available stock
  return inventoryRepository.findByVariantId(variantId);
};

export const bulkUpdateInventory = async (
  adminId: string,
  updates: {
    variantId: string;
    stockQuantity?: number;
    reorderThreshold?: number;
  }[],
) => {
  if (!updates.length) throw new InventoryError(400, "Inventory updates are required");

  const result = await inventoryRepository.bulkUpdateStock(updates);

  await Promise.all(
    updates.map((item) => inventoryRepository.recalculateAvailable(item.variantId)),
  );

  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Inventory",
    "bulk-update",
  );

  return result;
};

export const getInventoryAlerts = async (limit = 50) => {
  const [lowStock, outOfStock] = await Promise.all([
    inventoryRepository.findLowStock(limit),
    inventoryRepository.findOutOfStock(limit),
  ]);

  return {
    lowStock,
    outOfStock,
  };
};

export const bulkImportInventory = async (
  adminId: string,
  rows: {
    variantId: string;
    stockQuantity: number;
    reorderThreshold: number;
  }[],
) => {
  if (!rows.length) throw new InventoryError(400, "Inventory rows are required");

  const imported = [];
  for (const row of rows) {
    const variant = await inventoryRepository.findVariantWithInventory(row.variantId);
    if (!variant) {
      throw new InventoryError(404, `Variant not found: ${row.variantId}`);
    }

    const item = await inventoryRepository.upsertInventoryForVariant(row.variantId, {
      stockQuantity: row.stockQuantity,
      reorderThreshold: row.reorderThreshold,
    });
    imported.push(item);
  }

  await adminRepository.logActivity(adminId, "UPDATE", "Inventory", "bulk-import");

  return { importedCount: imported.length };
};

export const getInventoryHistory = async (variantId: string) => {
  const inventory = await inventoryRepository.findByVariantId(variantId);
  if (!inventory) throw new InventoryError(404, "Inventory record not found");

  return {
    variantId,
    current: {
      stockQuantity: inventory.stockQuantity,
      reservedStock: inventory.reservedStock,
      availableStock: inventory.availableStock,
      reorderThreshold: inventory.reorderThreshold,
      lastUpdated: inventory.lastUpdated,
    },
    timeline: [
      {
        event: "SNAPSHOT",
        at: inventory.lastUpdated,
        stockQuantity: inventory.stockQuantity,
        availableStock: inventory.availableStock,
      },
    ],
  };
};

export const getInventoryForecast = async () => inventoryRepository.getInventoryForecast();
