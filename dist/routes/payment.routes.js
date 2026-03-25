import router from "express";
import { createPayment, webhook, getPayment, verifyPayment, } from "../controllers/payment.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter, webhookLimiter } from "../middlewares/rateLimiter.middleware.js";
import { verifyRazorpayWebhook } from "../middlewares/webhookVerification.middleware.js";
const paymentRouter = router.Router();
// Webhook is public (called by Razorpay)
// IMPORTANT: webhook route must come before express.json() middleware in app.ts
// Apply webhook-specific rate limiting BEFORE verification
paymentRouter.post("/webhook", webhookLimiter, verifyRazorpayWebhook, webhook);
// User-authenticated routes
paymentRouter.post("/", authenticateUser, generalLimiter, createPayment);
paymentRouter.post("/verify", authenticateUser, generalLimiter, verifyPayment);
paymentRouter.get("/:paymentId", authenticateUser, generalLimiter, getPayment);
export default paymentRouter;
