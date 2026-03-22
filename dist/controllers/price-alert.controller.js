import { z } from "zod";
import * as svc from "../services/price-alert.service.js";
const createPriceAlertSchema = z.object({
    productId: z.string().uuid(),
    wishlistItemId: z.string().uuid().optional(),
    targetPrice: z.number().positive(),
});
const updatePriceAlertSchema = z.object({
    targetPrice: z.number().positive().optional(),
    isActive: z.boolean().optional(),
});
export const listPriceAlerts = async (req, res, next) => {
    try {
        const priceAlerts = await svc.listPriceAlerts(req.user.id);
        res.status(200).json({ success: true, data: { priceAlerts } });
    }
    catch (e) {
        next(e);
    }
};
export const createPriceAlert = async (req, res, next) => {
    try {
        const data = createPriceAlertSchema.parse(req.body);
        const priceAlert = await svc.createPriceAlert(req.user.id, data);
        res.status(201).json({
            success: true,
            message: "Price alert created",
            data: { priceAlert },
        });
    }
    catch (e) {
        next(e);
    }
};
export const updatePriceAlert = async (req, res, next) => {
    try {
        const data = updatePriceAlertSchema.parse(req.body);
        const priceAlert = await svc.updatePriceAlert(req.user.id, req.params.alertId, data);
        res.status(200).json({
            success: true,
            message: "Price alert updated",
            data: { priceAlert },
        });
    }
    catch (e) {
        next(e);
    }
};
export const deletePriceAlert = async (req, res, next) => {
    try {
        await svc.deletePriceAlert(req.user.id, req.params.alertId);
        res.status(200).json({ success: true, message: "Price alert deleted" });
    }
    catch (e) {
        next(e);
    }
};
