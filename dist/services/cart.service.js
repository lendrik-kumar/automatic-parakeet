/**
 * Cart Service
 *
 * Handles cart operations with inventory validation and stock reservation.
 */
import { cartRepository } from "../repositories/cart.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { productRepository } from "../repositories/product.repository.js";
export class CartError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "CartError";
    }
}
/** GET /cart — return user's cart with computed totals */
export const getCart = async (userId) => {
    const cart = await cartRepository.findByCustomerId(userId);
    if (!cart) {
        // Create empty cart
        const newCart = await cartRepository.findOrCreate(userId);
        return {
            ...newCart,
            items: [],
            totalItems: 0,
            subtotal: 0,
            discount: 0,
            tax: 0,
            shippingEstimate: 0,
            totalPrice: 0,
        };
    }
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax estimate
    const shippingEstimate = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    return {
        ...cart,
        subtotal,
        discount: 0,
        tax,
        shippingEstimate,
        totalPrice: Math.round((subtotal + tax + shippingEstimate) * 100) / 100,
    };
};
/** POST /cart/items */
export const addItem = async (userId, data) => {
    // 1. Get or create cart
    const cart = await cartRepository.findOrCreate(userId);
    // 2. Validate variant exists
    const variant = await productRepository.findVariantById(data.variantId);
    if (!variant)
        throw new CartError(404, "Product variant not found");
    if (variant.status !== "ACTIVE")
        throw new CartError(400, "Product variant is not available");
    if (variant.product.status !== "ACTIVE")
        throw new CartError(400, "Product is not available");
    // 3. Check inventory availability
    const inventory = await inventoryRepository.findByVariantId(data.variantId);
    if (!inventory)
        throw new CartError(400, "No inventory record for this variant");
    if (inventory.availableStock < data.quantity) {
        throw new CartError(400, `Only ${inventory.availableStock} items available`);
    }
    // 4. Check if item already in cart
    const existing = await cartRepository.findExistingItem(cart.id, data.variantId, data.size, data.color);
    if (existing) {
        const newQty = existing.quantity + data.quantity;
        if (inventory.availableStock < newQty) {
            throw new CartError(400, `Only ${inventory.availableStock} items available in total`);
        }
        await cartRepository.updateItemQuantity(existing.id, newQty, newQty * variant.price);
        // Reserve additional stock
        await inventoryRepository.reserveStock(data.variantId, data.quantity);
        await cartRepository.updateCartTotals(cart.id);
        return cartRepository.findByCustomerId(userId);
    }
    // 5. Reserve stock
    await inventoryRepository.reserveStock(data.variantId, data.quantity);
    // 6. Add cart item
    await cartRepository.addItem({
        cartId: cart.id,
        productId: variant.productId,
        variantId: data.variantId,
        size: data.size,
        color: data.color,
        quantity: data.quantity,
        unitPrice: variant.price,
        totalPrice: variant.price * data.quantity,
    });
    // 7. Recalculate totals
    await cartRepository.updateCartTotals(cart.id);
    return cartRepository.findByCustomerId(userId);
};
/** PATCH /cart/items/:itemId */
export const updateItemQuantity = async (userId, itemId, quantity) => {
    const item = await cartRepository.findItemById(itemId);
    if (!item)
        throw new CartError(404, "Cart item not found");
    const cart = await cartRepository.findByCustomerId(userId);
    if (!cart || item.cartId !== cart.id)
        throw new CartError(403, "Not your cart item");
    const diff = quantity - item.quantity;
    if (diff > 0) {
        // Need more stock
        const inventory = await inventoryRepository.findByVariantId(item.variantId);
        if (!inventory || inventory.availableStock < diff) {
            throw new CartError(400, "Insufficient stock");
        }
        await inventoryRepository.reserveStock(item.variantId, diff);
    }
    else if (diff < 0) {
        // Release stock
        await inventoryRepository.releaseStock(item.variantId, Math.abs(diff));
    }
    await cartRepository.updateItemQuantity(itemId, quantity, quantity * item.unitPrice);
    await cartRepository.updateCartTotals(cart.id);
    return cartRepository.findByCustomerId(userId);
};
/** DELETE /cart/items/:itemId */
export const removeItem = async (userId, itemId) => {
    const item = await cartRepository.findItemById(itemId);
    if (!item)
        throw new CartError(404, "Cart item not found");
    const cart = await cartRepository.findByCustomerId(userId);
    if (!cart || item.cartId !== cart.id)
        throw new CartError(403, "Not your cart item");
    // Release reserved stock
    await inventoryRepository.releaseStock(item.variantId, item.quantity);
    await cartRepository.deleteItem(itemId);
    await cartRepository.updateCartTotals(cart.id);
    return cartRepository.findByCustomerId(userId);
};
/** DELETE /cart — clear entire cart */
export const clearCart = async (userId) => {
    const cart = await cartRepository.findByCustomerId(userId);
    if (!cart)
        throw new CartError(404, "Cart not found");
    // Release all reserved stock
    for (const item of cart.items) {
        await inventoryRepository.releaseStock(item.variantId, item.quantity);
    }
    await cartRepository.clearCart(cart.id);
    await cartRepository.updateCartTotals(cart.id);
};
