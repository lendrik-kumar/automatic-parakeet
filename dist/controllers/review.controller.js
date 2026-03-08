import { z } from "zod";
import * as svc from "../services/review.service.js";
import { ReviewError } from "../services/review.service.js";
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
    if (error instanceof ReviewError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[ReviewController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const createReviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    reviewTitle: z.string().min(1).max(255),
    reviewText: z.string().optional(),
    images: z.array(z.string().url()).optional(),
});
/** POST /products/:productId/reviews */
export const createReview = async (req, res) => {
    try {
        const data = createReviewSchema.parse(req.body);
        const review = await svc.createReview(req.user.id, req.params.productId, data);
        res
            .status(201)
            .json({ success: true, message: "Review submitted", data: { review } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /products/:productId/reviews */
export const getReviews = async (req, res) => {
    try {
        const result = await svc.getProductReviews(req.params.productId, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/reviews/:reviewId */
export const adminDeleteReview = async (req, res) => {
    try {
        await svc.deleteReview(req.admin.id, req.params.reviewId);
        res.status(200).json({ success: true, message: "Review deleted" });
    }
    catch (e) {
        handleError(res, e);
    }
};
