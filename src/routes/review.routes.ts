import router from "express";
import {
  myReviews,
  updateMyReview,
  deleteMyReview,
} from "../controllers/review.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const reviewRouter = router.Router();

reviewRouter.use(authenticateUser);
reviewRouter.use(generalLimiter);

reviewRouter.get("/my-reviews", myReviews);
reviewRouter.put("/my-reviews/:reviewId", updateMyReview);
reviewRouter.delete("/my-reviews/:reviewId", deleteMyReview);

export default reviewRouter;
