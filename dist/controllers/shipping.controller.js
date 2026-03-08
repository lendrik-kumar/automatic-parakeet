import { z } from "zod";
import * as svc from "../services/shipping.service.js";
import { ShippingError } from "../services/shipping.service.js";
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
    if (error instanceof ShippingError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[ShippingController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const createMethodSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    cost: z.number().min(0),
    estimatedDeliveryDays: z.number().int().min(1),
});
const updateMethodSchema = createMethodSchema.partial();
const createShipmentSchema = z.object({
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
export const createMethod = async (req, res) => {
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
        handleError(res, e);
    }
};
/** GET /admin/shipping-methods */
export const listMethods = async (_req, res) => {
    try {
        const methods = await svc.listMethods();
        res.status(200).json({ success: true, data: { methods } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/shipping-methods/:id */
export const updateMethod = async (req, res) => {
    try {
        const data = updateMethodSchema.parse(req.body);
        const method = await svc.updateMethod(req.admin.id, req.params.id, data);
        res
            .status(200)
            .json({
            success: true,
            message: "Shipping method updated",
            data: { method },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/shipping-methods/:id */
export const deleteMethod = async (req, res) => {
    try {
        await svc.deleteMethod(req.admin.id, req.params.id);
        res.status(200).json({ success: true, message: "Shipping method deleted" });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ── Shipments ─────────────────────────────────────────────────────────────────
/** POST /admin/orders/:orderId/shipments */
export const createShipment = async (req, res) => {
    try {
        const data = createShipmentSchema.parse(req.body);
        const shipment = await svc.createShipment(req.admin.id, req.params.orderId, data);
        res
            .status(201)
            .json({ success: true, message: "Shipment created", data: { shipment } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/shipments/:shipmentId/status */
export const updateShipmentStatus = async (req, res) => {
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
        handleError(res, e);
    }
};
