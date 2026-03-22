import { z } from "zod";
import * as svc from "../services/cart.service.js";
const addItemSchema = z.object({
    variantId: z.string().uuid(),
    size: z.string().min(1),
    color: z.string().min(1),
    quantity: z.number().int().min(1),
});
const updateQuantitySchema = z.object({
    quantity: z.number().int().min(1),
});
const bulkAddItemsSchema = z.object({
    items: z
        .array(z.object({
        variantId: z.string().uuid(),
        size: z.string().min(1),
        color: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
    }))
        .min(1)
        .max(50),
});
const bulkUpdateItemsSchema = z.object({
    updates: z
        .array(z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
    }))
        .min(1)
        .max(50),
});
const bulkRemoveItemsSchema = z.object({
    itemIds: z.array(z.string().uuid()).min(1).max(50),
});
const applyCouponSchema = z.object({
    couponCode: z.string().trim().min(1).max(50),
});
const summaryQuerySchema = z.object({
    region: z.string().trim().min(1).optional(),
});
const syncCartSchema = z.object({
    sessionId: z.string().trim().min(1).max(255).optional(),
    items: z
        .array(z.object({
        variantId: z.string().uuid(),
        size: z.string().min(1),
        color: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
    }))
        .default([]),
    mergeStrategy: z
        .enum(["KEEP_HIGHER", "KEEP_SERVER", "KEEP_LOCAL"])
        .default("KEEP_HIGHER"),
});
/** GET /cart */
export const getCart = async (req, res, next) => {
    try {
        const { region } = summaryQuerySchema.parse(req.query);
        const cart = await svc.getCart(req.user.id, region);
        res.status(200).json({ success: true, data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/items */
export const addItem = async (req, res, next) => {
    try {
        const data = addItemSchema.parse(req.body);
        const cart = await svc.addItem(req.user.id, data);
        res
            .status(201)
            .json({ success: true, message: "Item added to cart", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /cart/items/:itemId */
export const updateItem = async (req, res, next) => {
    try {
        const { quantity } = updateQuantitySchema.parse(req.body);
        const cart = await svc.updateItemQuantity(req.user.id, req.params.itemId, quantity);
        res.status(200).json({ success: true, message: "Cart item updated", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /cart/items/:itemId */
export const removeItem = async (req, res, next) => {
    try {
        const cart = await svc.removeItem(req.user.id, req.params.itemId);
        res
            .status(200)
            .json({ success: true, message: "Item removed from cart", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /cart */
export const clearCart = async (req, res, next) => {
    try {
        await svc.clearCart(req.user.id);
        res.status(200).json({ success: true, message: "Cart cleared" });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/items/bulk */
export const bulkAddItems = async (req, res, next) => {
    try {
        const { items } = bulkAddItemsSchema.parse(req.body);
        const cart = await svc.bulkAddItems(req.user.id, items);
        res.status(200).json({
            success: true,
            message: `${items.length} items added to cart`,
            data: { cart },
        });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /cart/items/bulk */
export const bulkUpdateItems = async (req, res, next) => {
    try {
        const { updates } = bulkUpdateItemsSchema.parse(req.body);
        const cart = await svc.bulkUpdateItems(req.user.id, updates);
        res.status(200).json({
            success: true,
            message: `${updates.length} items updated`,
            data: { cart },
        });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /cart/items/bulk */
export const bulkRemoveItems = async (req, res, next) => {
    try {
        const { itemIds } = bulkRemoveItemsSchema.parse(req.body);
        const cart = await svc.bulkRemoveItems(req.user.id, itemIds);
        res.status(200).json({
            success: true,
            message: `${itemIds.length} items removed`,
            data: { cart },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/coupon */
export const applyCoupon = async (req, res, next) => {
    try {
        const { couponCode } = applyCouponSchema.parse(req.body);
        const cart = await svc.applyCoupon(req.user.id, couponCode);
        res
            .status(200)
            .json({ success: true, message: "Coupon applied", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /cart/coupon */
export const removeCoupon = async (req, res, next) => {
    try {
        const cart = await svc.removeCoupon(req.user.id);
        res
            .status(200)
            .json({ success: true, message: "Coupon removed", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
/** GET /cart/summary */
export const getCartSummary = async (req, res, next) => {
    try {
        const { region } = summaryQuerySchema.parse(req.query);
        const summary = await svc.getCartSummary(req.user.id, region);
        res.status(200).json({ success: true, data: { summary } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/validate */
export const validateCart = async (req, res, next) => {
    try {
        const validation = await svc.validateCart(req.user.id);
        res.status(200).json({ success: true, data: { validation } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/move-to-wishlist/:itemId */
export const moveItemToWishlist = async (req, res, next) => {
    try {
        const result = await svc.moveItemToWishlist(req.user.id, req.params.itemId);
        res.status(200).json({
            success: true,
            message: "Item moved to wishlist",
            data: result,
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/add-from-wishlist/:wishlistItemId */
export const addItemFromWishlist = async (req, res, next) => {
    try {
        const cart = await svc.addItemFromWishlist(req.user.id, req.params.wishlistItemId);
        res.status(200).json({
            success: true,
            message: "Item added from wishlist",
            data: { cart },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/save-for-later/:itemId */
export const saveItemForLater = async (req, res, next) => {
    try {
        const result = await svc.saveItemForLater(req.user.id, req.params.itemId);
        res.status(200).json({
            success: true,
            message: "Item saved for later",
            data: result,
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /cart/saved-items */
export const listSavedItems = async (req, res, next) => {
    try {
        const savedItems = await svc.listSavedItems(req.user.id);
        res.status(200).json({ success: true, data: savedItems });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/restore-saved-item/:savedItemId */
export const restoreSavedItem = async (req, res, next) => {
    try {
        const cart = await svc.restoreSavedItem(req.user.id, req.params.savedItemId);
        res.status(200).json({
            success: true,
            message: "Saved item restored to cart",
            data: { cart },
        });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /cart/saved-items/:savedItemId */
export const removeSavedItem = async (req, res, next) => {
    try {
        await svc.removeSavedItem(req.user.id, req.params.savedItemId);
        res.status(200).json({ success: true, message: "Saved item removed" });
    }
    catch (e) {
        next(e);
    }
};
/** POST /cart/sync */
export const syncCart = async (req, res, next) => {
    try {
        const payload = syncCartSchema.parse(req.body);
        const cart = await svc.syncCart(req.user.id, payload);
        res.status(200).json({ success: true, message: "Cart synced", data: { cart } });
    }
    catch (e) {
        next(e);
    }
};
