import router from "express";
import { clientBestSellers, clientFeaturedProducts, clientGetCollections, clientGetFilterOptions, clientGetProduct, clientGetProductsByCategory, clientGetProductsByCollection, clientGetSubCategoryProducts, clientGetVariantDetails, clientGetVariants, clientGetAllCategories, clientListProducts, clientNewArrivals, clientPersonalizedProducts, clientRelatedProducts, clientSearchProducts, clientSimilarProducts, clientTrendingProducts, } from "../controllers/product.controller.js";
import { createReview, getReviews, markReviewHelpful, getReviewSummary, } from "../controllers/review.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
const productRouter = router.Router();
// ─── Best Sellers & Trending ──────────────────────────────────────────────────
productRouter.get("/best-sellers", generalLimiter, clientBestSellers);
productRouter.get("/trending", generalLimiter, clientTrendingProducts);
// ─── Search + Filters ─────────────────────────────────────────────────────────
productRouter.get("/search", generalLimiter, clientSearchProducts);
productRouter.get("/filters", generalLimiter, clientGetFilterOptions);
// ─── Categories ───────────────────────────────────────────────────────────────
productRouter.get("/categories", generalLimiter, clientGetAllCategories);
productRouter.get("/categories/:category/:subCategory", generalLimiter, clientGetSubCategoryProducts);
productRouter.get("/categories/:category", generalLimiter, clientGetProductsByCategory);
// ─── Collections (single-brand catalog grouping) ─────────────────────────────
productRouter.get("/collections", generalLimiter, clientGetCollections);
productRouter.get("/collections/:collection", generalLimiter, clientGetProductsByCollection);
// ─── Recommendations ──────────────────────────────────────────────────────────
productRouter.get("/recommendations/personalized", generalLimiter, authenticateUser, clientPersonalizedProducts);
// ─── Variant Routes ───────────────────────────────────────────────────────────
productRouter.get("/variant/:variantId", generalLimiter, clientGetVariantDetails);
// ─── Core Product Browsing ────────────────────────────────────────────────────
productRouter.get("/", generalLimiter, clientListProducts);
productRouter.get("/featured", generalLimiter, clientFeaturedProducts);
productRouter.get("/new-arrivals", generalLimiter, clientNewArrivals);
// ─── Product-specific Routes ──────────────────────────────────────────────────
productRouter.get("/:productId/variants", generalLimiter, clientGetVariants);
productRouter.get("/:productId/related", generalLimiter, clientRelatedProducts);
productRouter.get("/:productId/similar", generalLimiter, clientSimilarProducts);
productRouter.get("/:productId/reviews", generalLimiter, getReviews);
productRouter.get("/:productId/reviews/summary", generalLimiter, getReviewSummary);
productRouter.post("/:productId/reviews", authenticateUser, createReview);
productRouter.post("/:productId/reviews/:reviewId/helpful", authenticateUser, generalLimiter, markReviewHelpful);
// ─── Product Detail (slug) ────────────────────────────────────────────────────
productRouter.get("/:slug", generalLimiter, clientGetProduct);
export default productRouter;
