/**
 * Inventory Service
 */

import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";

export class InventoryError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export const listInventory = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [items, total] = await inventoryRepository.findMany(skip, limit);
  return {
    inventory: items,
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
