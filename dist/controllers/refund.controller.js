import { z } from "zod";
import * as svc from "../services/refund.service.js";
import { RefundError } from "../services/refund.service.js";
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
    if (error instanceof RefundError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[RefundController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const createRefundSchema = z.object({
    paymentId: z.string().uuid(),
    orderId: z.string().uuid(),
    refundAmount: z.number().positive(),
    refundReason: z.string().min(1),
});
const statusSchema = z.object({
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
});
const bulkRefundSchema = z.object({
    refundIds: z.array(z.string().uuid()).min(1),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
});
/** POST /admin/refunds */
export const createRefund = async (req, res) => {
    try {
        const data = createRefundSchema.parse(req.body);
        const refund = await svc.createRefund(req.admin.id, data);
        res
            .status(201)
            .json({ success: true, message: "Refund created", data: { refund } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/refunds/:refundId */
export const updateRefundStatus = async (req, res) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const refund = await svc.updateRefundStatus(req.admin.id, req.params.refundId, status);
        res
            .status(200)
            .json({
            success: true,
            message: "Refund status updated",
            data: { refund },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/refunds */
export const listRefunds = async (req, res) => {
    try {
        const result = await svc.listRefunds(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.status, req.query.search, req.query.startDate, req.query.endDate);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/refunds/:refundId */
export const getRefund = async (req, res) => {
    try {
        const refund = await svc.getRefund(req.params.refundId);
        res.status(200).json({ success: true, data: { refund } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/refunds/bulk/process */
export const bulkProcessRefunds = async (req, res) => {
    try {
        const { refundIds, status } = bulkRefundSchema.parse(req.body);
        const result = await svc.bulkProcessRefunds(req.admin.id, refundIds, status);
        res.status(200).json({
            success: true,
            message: "Refunds processed",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
