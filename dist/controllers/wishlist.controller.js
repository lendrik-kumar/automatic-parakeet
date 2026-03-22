import { z } from "zod";
import * as svc from "../services/wishlist.service.js";
import { WishlistError } from "../services/wishlist.service.js";
const handleError = (res, error) => {
    if (error instanceof z.ZodError) {
        res
            .status(400)
            .json({
            success: false,
            message: "Validation error",
            errors: error.issues,
        });
        return;
    }
    if (error instanceof WishlistError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[WishlistController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const addItemSchema = z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
});
const bulkAddItemsSchema = z.object({
    items: z
        .array(z.object({
        productId: z.string().uuid("Invalid product ID"),
        variantId: z.string().uuid("Invalid variant ID").optional(),
    }))
        .min(1, "At least one item is required")
        .max(50, "Maximum 50 items allowed at once"),
});
/** GET /wishlist */
export const getWishlist = async (req, res) => {
    try {
        const wishlist = await svc.getWishlist(req.user.id);
        res.status(200).json({ success: true, data: { wishlist } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /wishlist/items */
export const addItem = async (req, res) => {
    try {
        const data = addItemSchema.parse(req.body);
        const wishlist = await svc.addItem(req.user.id, data);
        res
            .status(201)
            .json({
            success: true,
            message: "Added to wishlist",
            data: { wishlist },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /wishlist/items/:itemId */
export const removeItem = async (req, res) => {
    try {
        const wishlist = await svc.removeItem(req.user.id, req.params.itemId);
        res
            .status(200)
            .json({
            success: true,
            message: "Removed from wishlist",
            data: { wishlist },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /wishlist/items/:itemId/move-to-cart */
export const moveToCart = async (req, res) => {
    try {
        const wishlist = await svc.moveToCart(req.user.id, req.params.itemId);
        res
            .status(200)
            .json({ success: true, message: "Moved to cart", data: { wishlist } });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── New Wishlist Features ──────────────────────────────────────────────────
/** DELETE /wishlist - Clear entire wishlist */
export const clearWishlist = async (req, res) => {
    try {
        const result = await svc.clearWishlist(req.user.id);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /wishlist/check/:productId - Check if product is in wishlist */
export const checkItemInWishlist = async (req, res) => {
    try {
        const result = await svc.checkItemInWishlist(req.user.id, req.params.productId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /wishlist/items/bulk - Add multiple items to wishlist */
export const addMultipleItems = async (req, res) => {
    try {
        const data = bulkAddItemsSchema.parse(req.body);
        const result = await svc.addMultipleItems(req.user.id, data.items);
        res.status(201).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
