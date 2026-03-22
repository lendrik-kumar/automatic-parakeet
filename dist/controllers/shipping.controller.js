import { z } from "zod";
import * as svc from "../services/shipping.service.js";
const createMethodSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    cost: z.number().min(0),
    estimatedDeliveryDays: z.number().int().min(1),
});
const updateMethodSchema = createMethodSchema.partial();
const createShipmentSchema = z.object({
    orderId: z.string().uuid(),
    courierName: z.string().min(1),
    trackingNumber: z.string().optional(),
    shippingMethod: z.string().min(1),
});
const shipmentStatusSchema = z.object({
    status: z.enum([
        "PENDING",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "FAILED",
        "RETURNED",
    ]),
});
// ── Shipping Methods ──────────────────────────────────────────────────────────
/** POST /admin/shipping-methods */
export const createMethod = async (req, res, next) => {
    try {
        const data = createMethodSchema.parse(req.body);
        const method = await svc.createMethod(req.admin.id, data);
        res
            .status(201)
            .json({
            success: true,
            message: "Shipping method created",
            data: { method },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/shipping-methods */
export const listMethods = async (_req, res, next) => {
    try {
        const methods = await svc.listMethods();
        res.status(200).json({ success: true, data: { methods } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/shipping-methods/:id */
export const updateMethod = async (req, res, next) => {
    try {
        const data = updateMethodSchema.parse(req.body);
        const method = await svc.updateMethod(req.admin.id, req.params.methodId, data);
        res
            .status(200)
            .json({
            success: true,
            message: "Shipping method updated",
            data: { method },
        });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /admin/shipping-methods/:id */
export const deleteMethod = async (req, res, next) => {
    try {
        await svc.deleteMethod(req.admin.id, req.params.methodId);
        res.status(200).json({ success: true, message: "Shipping method deleted" });
    }
    catch (e) {
        next(e);
    }
};
// ── Shipments ─────────────────────────────────────────────────────────────────
/** POST /admin/orders/:orderId/shipments */
export const createShipment = async (req, res, next) => {
    try {
        const data = createShipmentSchema.parse(req.body);
        const shipment = await svc.createShipment(req.admin.id, data.orderId, {
            courierName: data.courierName,
            trackingNumber: data.trackingNumber,
            shippingMethod: data.shippingMethod,
        });
        res
            .status(201)
            .json({ success: true, message: "Shipment created", data: { shipment } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/shipments/:shipmentId/status */
export const updateShipmentStatus = async (req, res, next) => {
    try {
        const { status } = shipmentStatusSchema.parse(req.body);
        const shipment = await svc.updateShipmentStatus(req.admin.id, req.params.shipmentId, status);
        res
            .status(200)
            .json({
            success: true,
            message: "Shipment status updated",
            data: { shipment },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/shipping/shipments */
export const listShipments = async (req, res, next) => {
    try {
        const result = await svc.listShipments(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.search);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/shipping/shipments/:shipmentId */
export const getShipment = async (req, res, next) => {
    try {
        const shipment = await svc.getShipment(req.params.shipmentId);
        res.status(200).json({ success: true, data: { shipment } });
    }
    catch (e) {
        next(e);
    }
};
