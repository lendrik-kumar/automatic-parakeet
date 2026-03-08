import { reviewRepository } from "../repositories/review.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";

export class ReviewError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

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
