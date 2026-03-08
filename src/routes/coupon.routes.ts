import router from "express";
import { validateCoupon } from "../controllers/coupon.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const couponRouter = router.Router();

couponRouter.use(authenticateUser);
couponRouter.use(generalLimiter);

couponRouter.post("/validate", validateCoupon);

export default couponRouter;
