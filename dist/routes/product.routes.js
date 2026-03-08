import router from "express";
import { clientListProducts, clientFeaturedProducts, clientNewArrivals, clientSearchProducts, clientGetProduct, } from "../controllers/product.controller.js";
import { createReview, getReviews } from "../controllers/review.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
const productRouter = router.Router();
// ─── Public Product Browsing ──────────────────────────────────────────────────
productRouter.get("/", generalLimiter, clientListProducts);
productRouter.get("/featured", generalLimiter, clientFeaturedProducts);
productRouter.get("/new-arrivals", generalLimiter, clientNewArrivals);
productRouter.get("/search", generalLimiter, clientSearchProducts);
productRouter.get("/:slug", generalLimiter, clientGetProduct);
// ─── Reviews (nested under product) ──────────────────────────────────────────
productRouter.get("/:productId/reviews", generalLimiter, getReviews);
productRouter.post("/:productId/reviews", authenticateUser, createReview);
export default productRouter;
