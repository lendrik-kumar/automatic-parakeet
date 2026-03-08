import { z } from "zod";
import * as svc from "../services/cart.service.js";
import { CartError } from "../services/cart.service.js";
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
    if (error instanceof CartError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[CartController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const addItemSchema = z.object({
    variantId: z.string().uuid(),
    size: z.string().min(1),
    color: z.string().min(1),
    quantity: z.number().int().min(1),
});
const updateQuantitySchema = z.object({
    quantity: z.number().int().min(1),
});
/** GET /cart */
export const getCart = async (req, res) => {
    try {
        const cart = await svc.getCart(req.user.id);
        res.status(200).json({ success: true, data: { cart } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /cart/items */
export const addItem = async (req, res) => {
    try {
        const data = addItemSchema.parse(req.body);
        const cart = await svc.addItem(req.user.id, data);
        res
            .status(201)
            .json({ success: true, message: "Item added to cart", data: { cart } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /cart/items/:itemId */
export const updateItem = async (req, res) => {
    try {
        const { quantity } = updateQuantitySchema.parse(req.body);
        const cart = await svc.updateItemQuantity(req.user.id, req.params.itemId, quantity);
        res
            .status(200)
            .json({ success: true, message: "Cart item updated", data: { cart } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /cart/items/:itemId */
export const removeItem = async (req, res) => {
    try {
        const cart = await svc.removeItem(req.user.id, req.params.itemId);
        res
            .status(200)
            .json({
            success: true,
            message: "Item removed from cart",
            data: { cart },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /cart */
export const clearCart = async (req, res) => {
    try {
        await svc.clearCart(req.user.id);
        res.status(200).json({ success: true, message: "Cart cleared" });
    }
    catch (e) {
        handleError(res, e);
    }
};
