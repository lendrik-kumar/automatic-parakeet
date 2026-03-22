/**
 * Cart Service
 *
 * Handles cart operations with inventory validation and stock reservation.
 */

import { cartRepository } from "../repositories/cart.repository.js";
import { couponRepository } from "../repositories/coupon.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { savedItemRepository } from "../repositories/saved-item.repository.js";
import { shippingRuleRepository } from "../repositories/shipping-rule.repository.js";
import { taxRuleRepository } from "../repositories/tax-rule.repository.js";
import { wishlistRepository } from "../repositories/wishlist.repository.js";
import { validateCoupon } from "./coupon.service.js";
import { AppError } from "../utils/AppError.js";

export class CartError extends AppError {}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const calculateSummary = async (
  cart: {
    items: { totalPrice: number }[];
    appliedDiscount?: number;
    appliedCoupon?: { code: string; discountType: string; discountValue: number } | null;
  },
  region?: string,
) => {
  const subtotal = round2(cart.items.reduce((sum, item) => sum + item.totalPrice, 0));
  const discount = Math.min(round2(cart.appliedDiscount ?? 0), subtotal);

  const taxableAmount = Math.max(0, subtotal - discount);

  const taxRule = await taxRuleRepository.findApplicable(region ?? null);
  const taxRate = taxRule?.taxRate ?? 0;
  const tax = round2(taxableAmount * taxRate);

  const shippingRule = await shippingRuleRepository.findMatchingRule(
    taxableAmount,
    region ?? null,
  );
  const shippingCost = shippingRule
    ? shippingRule.isFreeShipping
      ? 0
      : shippingRule.shippingCost
    : 0;

  return {
    subtotal,
    discount,
    taxRate,
    tax,
    shippingCost,
    total: round2(taxableAmount + tax + shippingCost),
    coupon: cart.appliedCoupon
      ? {
          code: cart.appliedCoupon.code,
          discountType: cart.appliedCoupon.discountType,
          discountValue: cart.appliedCoupon.discountValue,
        }
      : null,
  };
};

const ensureValidAndAvailableVariant = async (
  variantId: string,
  neededQty: number,
) => {
  const variant = await productRepository.findVariantById(variantId);
  if (!variant) throw new CartError(404, "Product variant not found");
  if (variant.status !== "ACTIVE") {
    throw new CartError(400, "Product variant is not available");
  }
  if (variant.product.status !== "ACTIVE") {
    throw new CartError(400, "Product is not available");
  }

  const inventory = await inventoryRepository.findByVariantId(variantId);
  if (!inventory) {
    throw new CartError(400, "No inventory record for this variant");
  }
  if (inventory.availableStock < neededQty) {
    throw new CartError(400, `Only ${inventory.availableStock} items available`);
  }

  return { variant, inventory };
};

/** GET /cart — return user's cart with computed totals */
export const getCart = async (userId: string, region?: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) {
    const newCart = await cartRepository.findOrCreate(userId);
    const summary = await calculateSummary({ items: [], appliedDiscount: 0 }, region);
    return {
      ...newCart,
      items: [],
      ...summary,
      totalItems: 0,
      totalPrice: summary.total,
    };
  }

  const summary = await calculateSummary(cart, region);

  return {
    ...cart,
    ...summary,
    totalPrice: summary.total,
  };
};

/** POST /cart/items */
export const addItem = async (
  userId: string,
  data: { variantId: string; size: string; color: string; quantity: number },
) => {
  const cart = await cartRepository.findOrCreate(userId);

  const { variant, inventory } = await ensureValidAndAvailableVariant(
    data.variantId,
    data.quantity,
  );

  const existing = await cartRepository.findExistingItem(
    cart.id,
    data.variantId,
    data.size,
    data.color,
  );
  if (existing) {
    const newQty = existing.quantity + data.quantity;
    if (inventory.availableStock < newQty) {
      throw new CartError(
        400,
        `Only ${inventory.availableStock} items available in total`,
      );
    }
    await cartRepository.updateItemQuantity(
      existing.id,
      newQty,
      round2(newQty * variant.price),
    );
    await inventoryRepository.reserveStock(data.variantId, data.quantity);
    await cartRepository.updateCartTotals(cart.id);
    return cartRepository.findByCustomerId(userId);
  }

  await inventoryRepository.reserveStock(data.variantId, data.quantity);

  await cartRepository.addItem({
    cartId: cart.id,
    productId: variant.productId,
    variantId: data.variantId,
    size: data.size,
    color: data.color,
    quantity: data.quantity,
    unitPrice: variant.price,
    totalPrice: round2(variant.price * data.quantity),
  });

  await cartRepository.updateCartTotals(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** PATCH /cart/items/:itemId */
export const updateItemQuantity = async (
  userId: string,
  itemId: string,
  quantity: number,
) => {
  const item = await cartRepository.findItemById(itemId);
  if (!item) throw new CartError(404, "Cart item not found");

  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart || item.cartId !== cart.id) {
    throw new CartError(403, "Not your cart item");
  }

  const diff = quantity - item.quantity;

  if (diff > 0) {
    const inventory = await inventoryRepository.findByVariantId(item.variantId);
    if (!inventory || inventory.availableStock < diff) {
      throw new CartError(400, "Insufficient stock");
    }
    await inventoryRepository.reserveStock(item.variantId, diff);
  } else if (diff < 0) {
    await inventoryRepository.releaseStock(item.variantId, Math.abs(diff));
  }

  await cartRepository.updateItemQuantity(
    itemId,
    quantity,
    round2(quantity * item.unitPrice),
  );
  await cartRepository.updateCartTotals(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** DELETE /cart/items/:itemId */
export const removeItem = async (userId: string, itemId: string) => {
  const item = await cartRepository.findItemById(itemId);
  if (!item) throw new CartError(404, "Cart item not found");

  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart || item.cartId !== cart.id) {
    throw new CartError(403, "Not your cart item");
  }

  await inventoryRepository.releaseStock(item.variantId, item.quantity);
  await cartRepository.deleteItem(itemId);
  await cartRepository.updateCartTotals(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** DELETE /cart — clear entire cart */
export const clearCart = async (userId: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  for (const item of cart.items) {
    await inventoryRepository.releaseStock(item.variantId, item.quantity);
  }

  await cartRepository.clearCart(cart.id);
  await cartRepository.updateCartTotals(cart.id);
};

/** POST /cart/items/bulk */
export const bulkAddItems = async (
  userId: string,
  items: { variantId: string; size: string; color: string; quantity: number }[],
) => {
  const cart = await cartRepository.findByCustomerId(userId);
  const ensuredCart = cart ?? (await cartRepository.findOrCreate(userId));

  for (const item of items) {
    await ensureValidAndAvailableVariant(item.variantId, item.quantity);
  }

  for (const item of items) {
    await addItem(userId, item);
  }

  await cartRepository.updateCartTotals(ensuredCart.id);
  return cartRepository.findByCustomerId(userId);
};

/** PATCH /cart/items/bulk */
export const bulkUpdateItems = async (
  userId: string,
  updates: { itemId: string; quantity: number }[],
) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  const ids = updates.map((item) => item.itemId);
  const cartItems = await cartRepository.findItemsByIds(cart.id, ids);
  if (cartItems.length !== updates.length) {
    throw new CartError(404, "One or more cart items not found");
  }

  for (const update of updates) {
    const existing = cartItems.find((item) => item.id === update.itemId);
    if (!existing) continue;

    const diff = update.quantity - existing.quantity;
    if (diff > 0) {
      const inventory = await inventoryRepository.findByVariantId(existing.variantId);
      if (!inventory || inventory.availableStock < diff) {
        throw new CartError(
          400,
          `Insufficient stock for item ${existing.variant.sku}`,
        );
      }
    }
  }

  for (const update of updates) {
    const existing = cartItems.find((item) => item.id === update.itemId);
    if (!existing) continue;

    const diff = update.quantity - existing.quantity;
    if (diff > 0) {
      await inventoryRepository.reserveStock(existing.variantId, diff);
    } else if (diff < 0) {
      await inventoryRepository.releaseStock(existing.variantId, Math.abs(diff));
    }

    await cartRepository.updateItemQuantity(
      existing.id,
      update.quantity,
      round2(update.quantity * existing.unitPrice),
    );
  }

  await cartRepository.updateCartTotals(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** DELETE /cart/items/bulk */
export const bulkRemoveItems = async (userId: string, itemIds: string[]) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  const cartItems = await cartRepository.findItemsByIds(cart.id, itemIds);
  if (cartItems.length !== itemIds.length) {
    throw new CartError(404, "One or more cart items not found");
  }

  for (const item of cartItems) {
    await inventoryRepository.releaseStock(item.variantId, item.quantity);
  }

  await cartRepository.bulkDeleteItems(itemIds);
  await cartRepository.updateCartTotals(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** POST /cart/coupon */
export const applyCoupon = async (userId: string, couponCode: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  const subtotal = round2(cart.items.reduce((sum, item) => sum + item.totalPrice, 0));
  if (subtotal <= 0) throw new CartError(400, "Cannot apply coupon to empty cart");

  let validation;
  try {
    validation = await validateCoupon(couponCode, subtotal);
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 400;
    const message =
      error instanceof Error ? error.message : "Coupon validation failed";
    throw new CartError(statusCode, message);
  }

  const coupon = await couponRepository.findByCode(couponCode);
  if (!coupon) throw new CartError(404, "Coupon not found");

  await cartRepository.applyCoupon(cart.id, coupon.id, validation.calculatedDiscount);
  return cartRepository.findByCustomerId(userId);
};

/** DELETE /cart/coupon */
export const removeCoupon = async (userId: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  await cartRepository.removeCoupon(cart.id);
  return cartRepository.findByCustomerId(userId);
};

/** GET /cart/summary */
export const getCartSummary = async (userId: string, region?: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) {
    return {
      items: [],
      totalItems: 0,
      subtotal: 0,
      discount: 0,
      taxRate: 0,
      tax: 0,
      shippingCost: 0,
      total: 0,
      coupon: null,
    };
  }

  const summary = await calculateSummary(cart, region);

  return {
    items: cart.items,
    totalItems: cart.totalItems,
    ...summary,
  };
};

/** POST /cart/validate */
export const validateCart = async (userId: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) {
    return {
      valid: true,
      issues: [],
      validItems: 0,
      invalidItems: 0,
    };
  }

  const issues: {
    itemId: string;
    productName: string;
    issue: "unavailable" | "out_of_stock" | "price_changed";
    details: string;
  }[] = [];

  for (const item of cart.items) {
    if (item.product.status !== "ACTIVE" || item.variant.status !== "ACTIVE") {
      issues.push({
        itemId: item.id,
        productName: item.product.name,
        issue: "unavailable",
        details: "Product or variant is no longer available",
      });
      continue;
    }

    const inventory = await inventoryRepository.findByVariantId(item.variantId);
    if (!inventory || inventory.availableStock + item.quantity < item.quantity) {
      issues.push({
        itemId: item.id,
        productName: item.product.name,
        issue: "out_of_stock",
        details: "Insufficient stock",
      });
      continue;
    }

    if (round2(item.unitPrice) !== round2(item.variant.price)) {
      issues.push({
        itemId: item.id,
        productName: item.product.name,
        issue: "price_changed",
        details: `Price changed from ${item.unitPrice} to ${item.variant.price}`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    validItems: cart.items.length - issues.length,
    invalidItems: issues.length,
  };
};

/** POST /cart/move-to-wishlist/:itemId */
export const moveItemToWishlist = async (userId: string, itemId: string) => {
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart) throw new CartError(404, "Cart not found");

  const item = await cartRepository.findItemById(itemId);
  if (!item || item.cartId !== cart.id) {
    throw new CartError(404, "Cart item not found");
  }

  const wishlist = await wishlistRepository.findOrCreate(userId);

  const existingWishlistItem = await wishlistRepository.findExistingItem(
    wishlist.id,
    item.productId,
    item.variantId,
  );

  if (!existingWishlistItem) {
    await wishlistRepository.addItem({
      wishlistId: wishlist.id,
      productId: item.productId,
      variantId: item.variantId,
    });
  }

  await inventoryRepository.releaseStock(item.variantId, item.quantity);
  await cartRepository.deleteItem(item.id);
  await cartRepository.updateCartTotals(cart.id);

  return {
    cart: await cartRepository.findByCustomerId(userId),
    wishlist: await wishlistRepository.findByCustomerId(userId),
  };
};

/** POST /cart/add-from-wishlist/:wishlistItemId */
export const addItemFromWishlist = async (userId: string, wishlistItemId: string) => {
  const wishlistItem = await wishlistRepository.findItemById(wishlistItemId);
  if (!wishlistItem) throw new CartError(404, "Wishlist item not found");

  const wishlist = await wishlistRepository.findByCustomerId(userId);
  if (!wishlist || wishlistItem.wishlistId !== wishlist.id) {
    throw new CartError(403, "Not your wishlist item");
  }

  if (!wishlistItem.variant) {
    throw new CartError(400, "Select a variant before adding to cart");
  }

  return addItem(userId, {
    variantId: wishlistItem.variant.id,
    size: wishlistItem.variant.size,
    color: wishlistItem.variant.color,
    quantity: 1,
  });
};

/** POST /cart/save-for-later/:itemId */
export const saveItemForLater = async (userId: string, itemId: string) => {
  const item = await cartRepository.findItemById(itemId);
  if (!item) throw new CartError(404, "Cart item not found");

  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart || item.cartId !== cart.id) {
    throw new CartError(403, "Not your cart item");
  }

  const savedItem = await savedItemRepository.create({
    customerId: userId,
    productId: item.productId,
    variantId: item.variantId,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  });

  await inventoryRepository.releaseStock(item.variantId, item.quantity);
  await cartRepository.deleteItem(item.id);
  await cartRepository.updateCartTotals(cart.id);

  return {
    cart: await cartRepository.findByCustomerId(userId),
    savedItem,
  };
};

/** GET /cart/saved-items */
export const listSavedItems = async (userId: string) => {
  const items = await savedItemRepository.findByCustomerId(userId);
  return { items };
};

/** POST /cart/restore-saved-item/:savedItemId */
export const restoreSavedItem = async (userId: string, savedItemId: string) => {
  const savedItem = await savedItemRepository.findById(savedItemId);
  if (!savedItem) throw new CartError(404, "Saved item not found");
  if (savedItem.customerId !== userId) {
    throw new CartError(403, "Not your saved item");
  }

  await ensureValidAndAvailableVariant(savedItem.variantId, savedItem.quantity);

  const cart = await addItem(userId, {
    variantId: savedItem.variantId,
    size: savedItem.size,
    color: savedItem.color,
    quantity: savedItem.quantity,
  });

  await savedItemRepository.delete(savedItem.id);

  return cart;
};

/** DELETE /cart/saved-items/:savedItemId */
export const removeSavedItem = async (userId: string, savedItemId: string) => {
  const savedItem = await savedItemRepository.findById(savedItemId);
  if (!savedItem) throw new CartError(404, "Saved item not found");
  if (savedItem.customerId !== userId) {
    throw new CartError(403, "Not your saved item");
  }

  await savedItemRepository.delete(savedItem.id);
};

/** POST /cart/sync */
export const syncCart = async (
  userId: string,
  payload: {
    sessionId?: string;
    items: { variantId: string; size: string; color: string; quantity: number }[];
    mergeStrategy?: "KEEP_HIGHER" | "KEEP_SERVER" | "KEEP_LOCAL";
  },
) => {
  let currentCart = await cartRepository.findByCustomerId(userId);
  if (!currentCart) {
    await cartRepository.findOrCreate(userId);
    currentCart = await cartRepository.findByCustomerId(userId);
  }
  if (!currentCart) {
    throw new CartError(500, "Failed to initialize cart");
  }

  if (payload.sessionId) {
    await cartRepository.setSessionId(currentCart.id, payload.sessionId);
  }

  const strategy = payload.mergeStrategy ?? "KEEP_HIGHER";
  const byKey = (item: { variantId: string; size: string; color: string }) =>
    `${item.variantId}:${item.size}:${item.color}`;

  const serverMap = new Map<string, (typeof currentCart.items)[number]>(
    currentCart.items.map((item) => [
      byKey({ variantId: item.variantId, size: item.size, color: item.color }),
      item,
    ]),
  );

  for (const localItem of payload.items) {
    const key = byKey(localItem);
    const serverItem = serverMap.get(key);

    if (!serverItem) {
      await addItem(userId, localItem);
      continue;
    }

    const targetQty =
      strategy === "KEEP_HIGHER"
        ? Math.max(serverItem.quantity, localItem.quantity)
        : strategy === "KEEP_LOCAL"
          ? localItem.quantity
          : serverItem.quantity;

    if (targetQty !== serverItem.quantity) {
      await updateItemQuantity(userId, serverItem.id, targetQty);
    }
  }

  const syncedCart = await cartRepository.findByCustomerId(userId);
  if (!syncedCart) throw new CartError(500, "Failed to sync cart");

  return syncedCart;
};
