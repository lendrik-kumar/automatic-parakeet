import { z } from "zod";
import * as svc from "../services/inventory.service.js";
const updateInventorySchema = z.object({
    stockQuantity: z.number().int().min(0).optional(),
    reorderThreshold: z.number().int().min(0).optional(),
});
const bulkInventorySchema = z.object({
    updates: z
        .array(z.object({
        variantId: z.string().uuid(),
        stockQuantity: z.number().int().min(0).optional(),
        reorderThreshold: z.number().int().min(0).optional(),
    }))
        .min(1),
});
const bulkImportSchema = z.object({
    rows: z
        .array(z.object({
        variantId: z.string().uuid(),
        stockQuantity: z.number().int().min(0),
        reorderThreshold: z.number().int().min(0),
    }))
        .min(1),
});
/** GET /admin/inventory */
export const listInventory = async (req, res, next) => {
    try {
        const result = await svc.listInventoryAdvanced(Number(req.query.page) || 1, Number(req.query.limit) || 20, {
            lowStock: req.query.lowStock === "true",
            outOfStock: req.query.outOfStock === "true",
            search: req.query.search,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/inventory/:variantId */
export const getInventory = async (req, res, next) => {
    try {
        const inventory = await svc.getInventory(req.params.variantId);
        res.status(200).json({ success: true, data: { inventory } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/inventory/:variantId */
export const updateInventory = async (req, res, next) => {
    try {
        const data = updateInventorySchema.parse(req.body);
        const inventory = await svc.updateInventory(req.admin.id, req.params.variantId, data);
        res
            .status(200)
            .json({
            success: true,
            message: "Inventory updated",
            data: { inventory },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/inventory/bulk/update */
export const bulkUpdateInventory = async (req, res, next) => {
    try {
        const { updates } = bulkInventorySchema.parse(req.body);
        const result = await svc.bulkUpdateInventory(req.admin.id, updates);
        res.status(200).json({
            success: true,
            message: "Inventory updated",
            data: { updatedCount: result.length },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/inventory/alerts */
export const getInventoryAlerts = async (req, res, next) => {
    try {
        const data = await svc.getInventoryAlerts(Number(req.query.limit) || 50);
        res.status(200).json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/inventory/bulk/import */
export const bulkImportInventory = async (req, res, next) => {
    try {
        const { rows } = bulkImportSchema.parse(req.body);
        const result = await svc.bulkImportInventory(req.admin.id, rows);
        res.status(200).json({
            success: true,
            message: "Inventory imported",
            data: result,
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/inventory/:variantId/history */
export const getInventoryHistory = async (req, res, next) => {
    try {
        const history = await svc.getInventoryHistory(req.params.variantId);
        res.status(200).json({ success: true, data: history });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/inventory/forecast */
export const getInventoryForecast = async (_req, res, next) => {
    try {
        const forecast = await svc.getInventoryForecast();
        res.status(200).json({ success: true, data: forecast });
    }
    catch (e) {
        next(e);
    }
};
