import router from "express";
import { checkout, listOrders, getOrder, cancelOrder, validateCheckout, createCheckoutOrder, processPayment, getOrderTracking, reorderOrder, getOrderInvoice, } from "../controllers/order.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
const orderRouter = router.Router();
orderRouter.use(authenticateUser);
orderRouter.use(generalLimiter);
// ─── Legacy Checkout (Monolithic) ────────────────────────────────────────────
orderRouter.post("/checkout", checkout);
// ─── New 3-Step Checkout Flow ────────────────────────────────────────────────
orderRouter.post("/checkout/validate", validateCheckout);
orderRouter.post("/checkout/create", createCheckoutOrder);
orderRouter.post("/checkout/:orderId/pay", processPayment);
// ─── Order Management ─────────────────────────────────────────────────────────
orderRouter.get("/", listOrders);
orderRouter.get("/:orderId", getOrder);
orderRouter.patch("/:orderId/cancel", cancelOrder);
// ─── Order Actions ────────────────────────────────────────────────────────────
orderRouter.get("/:orderId/tracking", getOrderTracking);
orderRouter.post("/:orderId/reorder", reorderOrder);
orderRouter.get("/:orderId/invoice", getOrderInvoice);
export default orderRouter;
