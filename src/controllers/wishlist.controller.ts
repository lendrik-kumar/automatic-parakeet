import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/wishlist.service.js";
import { WishlistError } from "../services/wishlist.service.js";

const handleError = (res: Response, error: unknown): void => {
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

/** GET /wishlist */
export const getWishlist = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const wishlist = await svc.getWishlist(req.user!.id);
    res.status(200).json({ success: true, data: { wishlist } });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /wishlist/items */
export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = addItemSchema.parse(req.body);
    const wishlist = await svc.addItem(req.user!.id, data);
    res
      .status(201)
      .json({
        success: true,
        message: "Added to wishlist",
        data: { wishlist },
      });
  } catch (e) {
    handleError(res, e);
  }
};

/** DELETE /wishlist/items/:itemId */
export const removeItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const wishlist = await svc.removeItem(req.user!.id, req.params.itemId);
    res
      .status(200)
      .json({
        success: true,
        message: "Removed from wishlist",
        data: { wishlist },
      });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /wishlist/items/:itemId/move-to-cart */
export const moveToCart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const wishlist = await svc.moveToCart(req.user!.id, req.params.itemId);
    res
      .status(200)
      .json({ success: true, message: "Moved to cart", data: { wishlist } });
  } catch (e) {
    handleError(res, e);
  }
};
