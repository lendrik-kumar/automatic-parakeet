import { z } from "zod";
import * as svc from "../services/review.service.js";
const createReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    reviewTitle: z.string().min(1).max(255),
    reviewText: z.string().optional(),
    images: z.array(z.string().url()).optional(),
});
const updateMyReviewSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    reviewTitle: z.string().min(1).max(255).optional(),
    reviewText: z.string().optional(),
    images: z.array(z.string().url()).optional(),
});
const reviewStatusSchema = z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]).optional(),
    search: z.string().optional(),
});
const moderationNoteSchema = z.object({
    note: z.string().optional(),
});
const bulkReviewSchema = z.object({
    reviewIds: z.array(z.string().uuid()).min(1),
    note: z.string().optional(),
});
/** POST /products/:productId/reviews */
export const createReview = async (req, res, next) => {
    try {
        const data = createReviewSchema.parse(req.body);
        const review = await svc.createReview(req.user.id, req.params.productId, data);
        res
            .status(201)
            .json({ success: true, message: "Review submitted", data: { review } });
    }
    catch (e) {
        next(e);
    }
};
/** GET /products/:productId/reviews */
export const getReviews = async (req, res, next) => {
    try {
        const result = await svc.getProductReviews(req.params.productId, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /reviews/my-reviews */
export const myReviews = async (req, res, next) => {
    try {
        const result = await svc.listMyReviews(req.user.id, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** PUT /reviews/my-reviews/:reviewId */
export const updateMyReview = async (req, res, next) => {
    try {
        const data = updateMyReviewSchema.parse(req.body);
        const review = await svc.updateMyReview(req.user.id, req.params.reviewId, data);
        res.status(200).json({ success: true, message: "Review updated", data: { review } });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /reviews/my-reviews/:reviewId */
export const deleteMyReview = async (req, res, next) => {
    try {
        await svc.deleteMyReview(req.user.id, req.params.reviewId);
        res.status(200).json({ success: true, message: "Review deleted" });
    }
    catch (e) {
        next(e);
    }
};
/** POST /products/:productId/reviews/:reviewId/helpful */
export const markReviewHelpful = async (req, res, next) => {
    try {
        const result = await svc.markReviewHelpful(req.user.id, req.params.productId, req.params.reviewId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /products/:productId/reviews/summary */
export const getReviewSummary = async (req, res, next) => {
    try {
        const summary = await svc.getReviewSummary(req.params.productId);
        res.status(200).json({ success: true, data: summary });
    }
    catch (e) {
        next(e);
    }
};
/** DELETE /admin/reviews/:reviewId */
export const adminDeleteReview = async (req, res, next) => {
    try {
        await svc.deleteReview(req.admin.id, req.params.reviewId);
        res.status(200).json({ success: true, message: "Review deleted" });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/reviews */
export const adminListReviews = async (req, res, next) => {
    try {
        const filters = reviewStatusSchema.parse(req.query);
        const result = await svc.listAdminReviews(Number(req.query.page) || 1, Number(req.query.limit) || 20, filters.status, filters.search);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/reviews/:reviewId/approve */
export const adminApproveReview = async (req, res, next) => {
    try {
        const review = await svc.approveReview(req.admin.id, req.params.reviewId);
        res
            .status(200)
            .json({ success: true, message: "Review approved", data: { review } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/reviews/:reviewId/reject */
export const adminRejectReview = async (req, res, next) => {
    try {
        const { note } = moderationNoteSchema.parse(req.body);
        const review = await svc.rejectReview(req.admin.id, req.params.reviewId, note);
        res
            .status(200)
            .json({ success: true, message: "Review rejected", data: { review } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/reviews/:reviewId/flag */
export const adminFlagReview = async (req, res, next) => {
    try {
        const { note } = moderationNoteSchema.parse(req.body);
        const review = await svc.flagReview(req.admin.id, req.params.reviewId, note);
        res
            .status(200)
            .json({ success: true, message: "Review flagged", data: { review } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/reviews/bulk/approve */
export const adminBulkApproveReviews = async (req, res, next) => {
    try {
        const { reviewIds } = bulkReviewSchema.parse(req.body);
        const result = await svc.bulkApproveReviews(req.admin.id, reviewIds);
        res.status(200).json({
            success: true,
            message: "Reviews approved",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/reviews/bulk/reject */
export const adminBulkRejectReviews = async (req, res, next) => {
    try {
        const { reviewIds, note } = bulkReviewSchema.parse(req.body);
        const result = await svc.bulkRejectReviews(req.admin.id, reviewIds, note);
        res.status(200).json({
            success: true,
            message: "Reviews rejected",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/reviews/bulk/delete */
export const adminBulkDeleteReviews = async (req, res, next) => {
    try {
        const { reviewIds } = bulkReviewSchema.parse(req.body);
        const result = await svc.bulkDeleteReviews(req.admin.id, reviewIds);
        res.status(200).json({
            success: true,
            message: "Reviews deleted",
            data: { deletedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/reviews/stats */
export const adminReviewStats = async (req, res, next) => {
    try {
        const data = await svc.getReviewStats();
        res.status(200).json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
};
