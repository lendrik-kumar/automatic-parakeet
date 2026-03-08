import { wishlistRepository } from "../repositories/wishlist.repository.js";
import * as cartService from "./cart.service.js";

export class WishlistError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "WishlistError";
  }
}

export const getWishlist = async (userId: string) => {
  const wishlist = await wishlistRepository.findByCustomerId(userId);
  if (!wishlist) {
    await wishlistRepository.findOrCreate(userId);
    return { items: [] };
  }
  return wishlist;
};

export const addItem = async (
  userId: string,
  data: { productId: string; variantId?: string },
) => {
  const wishlist = await wishlistRepository.findOrCreate(userId);

  const existing = await wishlistRepository.findExistingItem(
    wishlist.id,
    data.productId,
    data.variantId,
  );
  if (existing) throw new WishlistError(409, "Item already in wishlist");

  await wishlistRepository.addItem({
    wishlistId: wishlist.id,
    productId: data.productId,
    variantId: data.variantId,
  });

  return wishlistRepository.findByCustomerId(userId);
};

export const removeItem = async (userId: string, itemId: string) => {
  const item = await wishlistRepository.findItemById(itemId);
  if (!item) throw new WishlistError(404, "Wishlist item not found");

  const wishlist = await wishlistRepository.findByCustomerId(userId);
  if (!wishlist || item.wishlistId !== wishlist.id) {
    throw new WishlistError(403, "Not your wishlist item");
  }

  await wishlistRepository.deleteItem(itemId);
  return wishlistRepository.findByCustomerId(userId);
};

export const moveToCart = async (userId: string, itemId: string) => {
  const item = await wishlistRepository.findItemById(itemId);
  if (!item) throw new WishlistError(404, "Wishlist item not found");

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
