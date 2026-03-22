import { wishlistRepository } from "../repositories/wishlist.repository.js";
import * as cartService from "./cart.service.js";
export class WishlistError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "WishlistError";
    }
}
export const getWishlist = async (userId) => {
    const wishlist = await wishlistRepository.findByCustomerId(userId);
    if (!wishlist) {
        await wishlistRepository.findOrCreate(userId);
        return { items: [] };
    }
    return wishlist;
};
export const addItem = async (userId, data) => {
    const wishlist = await wishlistRepository.findOrCreate(userId);
    const existing = await wishlistRepository.findExistingItem(wishlist.id, data.productId, data.variantId);
    if (existing)
        throw new WishlistError(409, "Item already in wishlist");
    await wishlistRepository.addItem({
        wishlistId: wishlist.id,
        productId: data.productId,
        variantId: data.variantId,
    });
    return wishlistRepository.findByCustomerId(userId);
};
export const removeItem = async (userId, itemId) => {
    const item = await wishlistRepository.findItemById(itemId);
    if (!item)
        throw new WishlistError(404, "Wishlist item not found");
    const wishlist = await wishlistRepository.findByCustomerId(userId);
    if (!wishlist || item.wishlistId !== wishlist.id) {
        throw new WishlistError(403, "Not your wishlist item");
    }
    await wishlistRepository.deleteItem(itemId);
    return wishlistRepository.findByCustomerId(userId);
};
export const moveToCart = async (userId, itemId) => {
    const item = await wishlistRepository.findItemById(itemId);
    if (!item)
        throw new WishlistError(404, "Wishlist item not found");
    const wishlist = await wishlistRepository.findByCustomerId(userId);
    if (!wishlist || item.wishlistId !== wishlist.id) {
        throw new WishlistError(403, "Not your wishlist item");
    }
    if (!item.variant)
        throw new WishlistError(400, "Select a variant before moving to cart");
    // Add to cart
    await cartService.addItem(userId, {
        variantId: item.variant.id,
        size: item.variant.size,
        color: item.variant.color,
        quantity: 1,
    });
    // Remove from wishlist
    await wishlistRepository.deleteItem(itemId);
    return wishlistRepository.findByCustomerId(userId);
};
// ─── New Wishlist Features ──────────────────────────────────────────────────
/**
 * Clear entire wishlist
 */
export const clearWishlist = async (userId) => {
    const wishlist = await wishlistRepository.findByCustomerId(userId);
    if (!wishlist) {
        throw new WishlistError(404, "Wishlist not found");
    }
    await wishlistRepository.clearAllItems(wishlist.id);
    return {
        message: "Wishlist cleared successfully",
        itemsRemoved: wishlist.items.length,
    };
};
/**
 * Check if a product is in the wishlist
 */
export const checkItemInWishlist = async (userId, productId) => {
    const wishlist = await wishlistRepository.findByCustomerId(userId);
    if (!wishlist) {
        return { inWishlist: false };
    }
    const item = wishlist.items.find((item) => item.productId === productId);
    return {
        inWishlist: !!item,
        itemId: item?.id || null,
    };
};
/**
 * Add multiple items to wishlist in bulk
 */
export const addMultipleItems = async (userId, items) => {
    const wishlist = await wishlistRepository.findOrCreate(userId);
    const addedItems = [];
    const skippedItems = [];
    for (const itemData of items) {
        // Check if item already exists
        const existing = await wishlistRepository.findExistingItem(wishlist.id, itemData.productId, itemData.variantId);
        if (existing) {
            skippedItems.push({
                productId: itemData.productId,
                reason: "Already in wishlist",
            });
            continue;
        }
        // Add item
        await wishlistRepository.addItem({
            wishlistId: wishlist.id,
            productId: itemData.productId,
            variantId: itemData.variantId,
        });
        addedItems.push({ productId: itemData.productId });
    }
    const updatedWishlist = await wishlistRepository.findByCustomerId(userId);
    return {
        message: "Bulk add completed",
        addedCount: addedItems.length,
        skippedCount: skippedItems.length,
        addedItems,
        skippedItems,
        wishlist: updatedWishlist,
    };
};
