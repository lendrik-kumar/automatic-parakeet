import { reviewRepository } from "../repositories/review.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
export class ReviewError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ReviewError";
    }
}
/** POST /products/:productId/reviews */
export const createReview = async (userId, productId, data) => {
    // Check if already reviewed
    const existing = await reviewRepository.hasReviewed(userId, productId);
    if (existing)
        throw new ReviewError(409, "You have already reviewed this product");
    // Check if purchased (verified purchase)
    const purchased = await reviewRepository.hasPurchased(userId, productId);
    const review = await reviewRepository.create({
        customerId: userId,
        productId,
        rating: data.rating,
        reviewTitle: data.reviewTitle,
        reviewText: data.reviewText,
        images: data.images ? JSON.stringify(data.images) : undefined,
        verifiedPurchase: !!purchased,
        status: "PENDING",
    });
    return review;
};
/** GET /products/:productId/reviews */
export const getProductReviews = async (productId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const [reviews, total] = await reviewRepository.findByProduct(productId, skip, limit);
    const stats = await reviewRepository.averageRating(productId);
    return {
        reviews,
        stats: {
            averageRating: stats._avg.rating
                ? Math.round(stats._avg.rating * 10) / 10
                : 0,
            totalReviews: stats._count,
        },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
/** DELETE /admin/reviews/:reviewId */
export const deleteReview = async (adminId, reviewId) => {
    const review = await reviewRepository.findById(reviewId);
    if (!review)
        throw new ReviewError(404, "Review not found");
    await reviewRepository.delete(reviewId);
    await adminRepository.logActivity(adminId, "DELETE", "ProductReview", reviewId);
};
export const listAdminReviews = async (page = 1, limit = 20, status, search) => {
    const skip = (page - 1) * limit;
    const [reviews, total] = await reviewRepository.findManyByStatus(skip, limit, status, search);
    return {
        reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const approveReview = async (adminId, reviewId) => {
    const review = await reviewRepository.findById(reviewId);
    if (!review)
        throw new ReviewError(404, "Review not found");
    const updated = await reviewRepository.updateStatus(reviewId, "APPROVED", adminId);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
    return updated;
};
export const rejectReview = async (adminId, reviewId, note) => {
    const review = await reviewRepository.findById(reviewId);
    if (!review)
        throw new ReviewError(404, "Review not found");
    const updated = await reviewRepository.updateStatus(reviewId, "REJECTED", adminId, note);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
    return updated;
};
export const flagReview = async (adminId, reviewId, note) => {
    const review = await reviewRepository.findById(reviewId);
    if (!review)
        throw new ReviewError(404, "Review not found");
    const updated = await reviewRepository.updateStatus(reviewId, "FLAGGED", adminId, note);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
    return updated;
};
export const bulkApproveReviews = async (adminId, reviewIds) => {
    if (!reviewIds.length)
        throw new ReviewError(400, "Review IDs are required");
    const result = await reviewRepository.bulkUpdateStatus(reviewIds, "APPROVED", adminId);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", "bulk-approve");
    return result;
};
export const bulkRejectReviews = async (adminId, reviewIds, note) => {
    if (!reviewIds.length)
        throw new ReviewError(400, "Review IDs are required");
    const result = await reviewRepository.bulkUpdateStatus(reviewIds, "REJECTED", adminId, note);
    await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", "bulk-reject");
    return result;
};
export const bulkDeleteReviews = async (adminId, reviewIds) => {
    if (!reviewIds.length)
        throw new ReviewError(400, "Review IDs are required");
    const result = await reviewRepository.bulkDelete(reviewIds);
    await adminRepository.logActivity(adminId, "DELETE", "ProductReview", "bulk-delete");
    return result;
};
export const getReviewStats = async () => {
    const stats = await reviewRepository.countByStatus();
    return {
        byStatus: stats.map((item) => ({
            status: item.status,
            count: item._count,
        })),
    };
};
