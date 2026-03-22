import { z } from "zod";
import * as svc from "../services/return.service.js";
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
const bulkApproveSchema = z.object({
    returnIds: z.array(z.string().uuid()).min(1),
});
const bulkProcessSchema = z.object({
    returnIds: z.array(z.string().uuid()).min(1),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
});
const exportQuerySchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
// ── Client ────────────────────────────────────────────────────────────────────
/** POST /orders/:orderId/returns */
export const createReturn = async (req, res, next) => {
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
        next(e);
    }
};
/** GET /returns */
export const listReturns = async (req, res, next) => {
    try {
        const result = await svc.listUserReturns(req.user.id, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /returns/:returnId */
export const getReturn = async (req, res, next) => {
    try {
        const returnRequest = await svc.getUserReturnById(req.user.id, req.params.returnId);
        res.status(200).json({ success: true, data: { returnRequest } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /returns/:returnId/cancel */
export const cancelReturn = async (req, res, next) => {
    try {
        const returnRequest = await svc.cancelUserReturn(req.user.id, req.params.returnId);
        res.status(200).json({
            success: true,
            message: "Return request cancelled",
            data: { returnRequest },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /returns/:returnId/timeline */
export const getReturnTimeline = async (req, res, next) => {
    try {
        const timeline = await svc.getReturnTimeline(req.user.id, req.params.returnId);
        res.status(200).json({ success: true, data: timeline });
    }
    catch (e) {
        next(e);
    }
};
/** GET /returns/reasons */
export const getReturnReasons = async (_req, res, next) => {
    try {
        const reasons = await svc.listReturnReasons();
        res.status(200).json({ success: true, data: reasons });
    }
    catch (e) {
        next(e);
    }
};
// ── Admin ─────────────────────────────────────────────────────────────────────
/** GET /admin/returns */
export const adminListReturns = async (req, res, next) => {
    try {
        const result = await svc.listAdminReturns(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.status, req.query.search, req.query.startDate, req.query.endDate);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/returns/:returnId */
export const adminUpdateReturn = async (req, res, next) => {
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
        next(e);
    }
};
/** GET /admin/returns/:returnId */
export const adminGetReturn = async (req, res, next) => {
    try {
        const returnRequest = await svc.getAdminReturn(req.params.returnId);
        res.status(200).json({ success: true, data: { returnRequest } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/returns/bulk/approve */
export const adminBulkApproveReturns = async (req, res, next) => {
    try {
        const { returnIds } = bulkApproveSchema.parse(req.body);
        const result = await svc.bulkApproveReturns(req.admin.id, returnIds);
        res.status(200).json({
            success: true,
            message: "Returns approved",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/returns/analytics */
export const adminReturnAnalytics = async (_req, res, next) => {
    try {
        const analytics = await svc.getReturnAnalytics();
        res.status(200).json({ success: true, data: analytics });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/returns/bulk/process */
export const adminBulkProcessReturns = async (req, res, next) => {
    try {
        const { returnIds, status } = bulkProcessSchema.parse(req.body);
        const result = await svc.bulkProcessReturns(req.admin.id, returnIds, status);
        res.status(200).json({
            success: true,
            message: "Returns processed",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/returns/export */
export const adminExportReturns = async (req, res, next) => {
    try {
        const filters = exportQuerySchema.parse(req.query);
        const rows = await svc.exportReturns(filters);
        res.status(200).json({ success: true, data: { rows, count: rows.length } });
    }
    catch (e) {
        next(e);
    }
};
