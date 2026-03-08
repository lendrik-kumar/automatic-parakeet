import { z } from "zod";
import * as svc from "../services/return.service.js";
import { ReturnError } from "../services/return.service.js";
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
    if (error instanceof ReturnError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[ReturnController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const createReturnSchema = z.object({
    reason: z.string().min(1),
    items: z
        .array(z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
    }))
        .min(1),
});
const statusSchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
});
// ── Client ────────────────────────────────────────────────────────────────────
/** POST /orders/:orderId/returns */
export const createReturn = async (req, res) => {
    try {
        const data = createReturnSchema.parse(req.body);
        const result = await svc.createReturn(req.user.id, req.params.orderId, data);
        res
            .status(201)
            .json({
            success: true,
            message: "Return request created",
            data: { returnRequest: result },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /returns */
export const listReturns = async (req, res) => {
    try {
        const result = await svc.listUserReturns(req.user.id, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ── Admin ─────────────────────────────────────────────────────────────────────
/** GET /admin/returns */
export const adminListReturns = async (req, res) => {
    try {
        const result = await svc.listAdminReturns(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.status);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/returns/:returnId */
export const adminUpdateReturn = async (req, res) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const result = await svc.updateReturnStatus(req.admin.id, req.params.returnId, status);
        res
            .status(200)
            .json({
            success: true,
            message: "Return status updated",
            data: { returnRequest: result },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
