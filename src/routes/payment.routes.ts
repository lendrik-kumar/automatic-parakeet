import router from "express";
import {
  createPayment,
  webhook,
  getPayment,
} from "../controllers/payment.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const paymentRouter = router.Router();

// Webhook is public (called by payment gateway)
paymentRouter.post("/webhook", webhook);

// User-authenticated routes
paymentRouter.post("/", authenticateUser, generalLimiter, createPayment);
paymentRouter.get("/:paymentId", authenticateUser, generalLimiter, getPayment);

export default paymentRouter;
