import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/inventory.service.js";
import { InventoryError } from "../services/inventory.service.js";

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
  if (error instanceof InventoryError) {
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
    return;
  }
  console.error("[InventoryController]", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};

const updateInventorySchema = z.object({
  stockQuantity: z.number().int().min(0).optional(),
  reorderThreshold: z.number().int().min(0).optional(),
});

/** GET /admin/inventory */
export const listInventory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listInventory(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /admin/inventory/:variantId */
export const getInventory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const inventory = await svc.getInventory(req.params.variantId);
    res.status(200).json({ success: true, data: { inventory } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/inventory/:variantId */
export const updateInventory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = updateInventorySchema.parse(req.body);
    const inventory = await svc.updateInventory(
      req.admin!.id,
      req.params.variantId,
      data,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Inventory updated",
        data: { inventory },
      });
  } catch (e) {
    handleError(res, e);
  }
};
