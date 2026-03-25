import { z } from "zod";
import * as svc from "../services/payment.service.js";
const getPaymentSchema = z.object({
    paymentId: z.string().uuid(),
});
const verifyPaymentSchema = z.object({
    razorpayOrderId: z.string().min(1, "Razorpay order ID is required"),
    razorpayPaymentId: z.string().min(1, "Razorpay payment ID is required"),
    razorpaySignature: z.string().min(1, "Razorpay signature is required"),
});
const webhookSchema = z.object({
    entity: z.string(),
    event: z.string(),
    payload: z.object({
        payment: z.object({
            entity: z.unknown(),
        }),
    }),
});
/** POST /payments/create - Get payment session (deprecated - use /orders/process-payment) */
export const createPayment = async (req, res, next) => {
    try {
        // This endpoint is deprecated - payments should be created via order processing
        res.status(410).json({
            success: false,
            message: "This endpoint is deprecated. Use POST /api/orders/process-payment instead."
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /payments/verify - Verify Razorpay payment signature */
export const verifyPayment = async (req, res, next) => {
    try {
        const data = verifyPaymentSchema.parse(req.body);
        const payment = await svc.verifyRazorpayPayment(data);
        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            data: {
                payment: {
                    id: payment.id,
                    orderId: payment.orderId,
                    status: payment.paymentStatus,
                    amount: payment.amount,
                    currency: payment.currency,
                    paidAt: payment.paidAt,
                },
            },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /payments/webhook - Handle Razorpay webhook */
export const webhook = async (req, res) => {
    try {
        // Webhook payload is already verified by middleware
        const payload = webhookSchema.parse(req.body);
        const result = await svc.handleRazorpayWebhook(payload);
        // Always return 200 to Razorpay to acknowledge receipt
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        // Log error but return 200 to prevent Razorpay retries
        console.error("[PaymentController] Webhook error:", e);
        res.status(200).json({ success: true, message: "Received" });
    }
};
/** GET /payments/:paymentId */
export const getPayment = async (req, res, next) => {
    try {
        const { paymentId } = getPaymentSchema.parse({ paymentId: req.params.paymentId });
        const payment = await svc.getPayment(paymentId, req.user?.id);
        res.status(200).json({ success: true, data: { payment } });
    }
    catch (e) {
        next(e);
    }
};
