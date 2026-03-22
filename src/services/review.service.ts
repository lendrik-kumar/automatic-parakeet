import { reviewRepository } from "../repositories/review.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type { ReviewStatus } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";

export class ReviewError extends AppError {}

/** POST /products/:productId/reviews */
export const createReview = async (
  userId: string,
  productId: string,
  data: {
    rating: number;
    reviewTitle: string;
    reviewText?: string;
    images?: string[];
  },
) => {
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
export const getProductReviews = async (
  productId: string,
  page = 1,
  limit = 10,
) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await reviewRepository.findByProduct(
    productId,
    skip,
    limit,
  );
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

export const listMyReviews = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await reviewRepository.findByCustomerId(userId, skip, limit);

  return {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const updateMyReview = async (
  userId: string,
  reviewId: string,
  data: {
    rating?: number;
    reviewTitle?: string;
    reviewText?: string;
    images?: string[];
  },
) => {
  const result = await reviewRepository.updateByOwner(reviewId, userId, {
    rating: data.rating,
    reviewTitle: data.reviewTitle,
    reviewText: data.reviewText,
    images: data.images ? JSON.stringify(data.images) : undefined,
  });

  if (result.count === 0) {
    throw new ReviewError(404, "Review not found");
  }

  return reviewRepository.findById(reviewId);
};

export const deleteMyReview = async (userId: string, reviewId: string) => {
  const result = await reviewRepository.deleteByOwner(reviewId, userId);
  if (result.count === 0) {
    throw new ReviewError(404, "Review not found");
  }
  return { id: reviewId };
};

export const markReviewHelpful = async (
  _userId: string,
  productId: string,
  reviewId: string,
) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review || review.productId !== productId || review.status !== "APPROVED") {
    throw new ReviewError(404, "Review not found");
  }

  return {
    reviewId,
    helpfulCount: 1,
    message: "Review marked helpful",
  };
};

export const getReviewSummary = async (productId: string) => {
  const aggregate = await reviewRepository.averageRating(productId);
  const distribution = await reviewRepository.countRatingDistribution(productId);

  return {
    productId,
    averageRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
    totalReviews: aggregate._count,
    distribution: distribution.map((row) => ({
      rating: row.rating,
      count: row._count,
    })),
  };
};

/** DELETE /admin/reviews/:reviewId */
export const deleteReview = async (adminId: string, reviewId: string) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewError(404, "Review not found");

  await reviewRepository.delete(reviewId);
  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "ProductReview",
    reviewId,
  );
};

export const listAdminReviews = async (
  page = 1,
  limit = 20,
  status?: ReviewStatus,
  search?: string,
) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await reviewRepository.findManyByStatus(
    skip,
    limit,
    status,
    search,
  );

  return {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const approveReview = async (adminId: string, reviewId: string) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewError(404, "Review not found");

  const updated = await reviewRepository.updateStatus(
    reviewId,
    "APPROVED",
    adminId,
  );
  await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
  return updated;
};

export const rejectReview = async (
  adminId: string,
  reviewId: string,
  note?: string,
) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewError(404, "Review not found");

  const updated = await reviewRepository.updateStatus(
    reviewId,
    "REJECTED",
    adminId,
    note,
  );
  await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
  return updated;
};

export const flagReview = async (
  adminId: string,
  reviewId: string,
  note?: string,
) => {
  const review = await reviewRepository.findById(reviewId);
  if (!review) throw new ReviewError(404, "Review not found");

  const updated = await reviewRepository.updateStatus(
    reviewId,
    "FLAGGED",
    adminId,
    note,
  );
  await adminRepository.logActivity(adminId, "UPDATE", "ProductReview", reviewId);
  return updated;
};

export const bulkApproveReviews = async (adminId: string, reviewIds: string[]) => {
  if (!reviewIds.length) throw new ReviewError(400, "Review IDs are required");

  const result = await reviewRepository.bulkUpdateStatus(
    reviewIds,
    "APPROVED",
    adminId,
  );
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ProductReview",
    "bulk-approve",
  );
  return result;
};

export const bulkRejectReviews = async (
  adminId: string,
  reviewIds: string[],
  note?: string,
) => {
  if (!reviewIds.length) throw new ReviewError(400, "Review IDs are required");

  const result = await reviewRepository.bulkUpdateStatus(
    reviewIds,
    "REJECTED",
    adminId,
    note,
  );
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ProductReview",
    "bulk-reject",
  );
  return result;
};

export const bulkDeleteReviews = async (adminId: string, reviewIds: string[]) => {
  if (!reviewIds.length) throw new ReviewError(400, "Review IDs are required");

  const result = await reviewRepository.bulkDelete(reviewIds);
  await adminRepository.logActivity(
    adminId,
    "DELETE",
    "ProductReview",
    "bulk-delete",
  );
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
