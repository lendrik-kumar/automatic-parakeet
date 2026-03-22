/**
 * Payment Service (Mock Razorpay for Development)
 *
 * In production, integrate with actual Razorpay SDK.
 * This mock simulates payment session creation and webhook handling.
 */
import crypto from "crypto";
import { paymentRepository } from "../repositories/payment.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { AppError } from "../utils/AppError.js";
export class PaymentError extends AppError {
}
/** POST /payments/create — create a mock payment session */
export const createPaymentSession = async (paymentId) => {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment)
        throw new PaymentError(404, "Payment not found");
    if (payment.paymentStatus !== "PENDING") {
        throw new PaymentError(400, "Payment is not in pending state");
    }
    // Mock: generate a fake transaction ID simulating Razorpay
    const mockTransactionId = `pay_${crypto.randomBytes(12).toString("hex")}`;
    return {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        mockTransactionId,
        checkoutUrl: `https://mock-razorpay.dev/pay/${mockTransactionId}`,
        message: "Mock payment session created. Use webhook to complete.",
    };
};
/** POST /payments/webhook — handle mock payment webhook */
export const handleWebhook = async (payload) => {
    const payment = await paymentRepository.findById(payload.paymentId);
    if (!payment)
        throw new PaymentError(404, "Payment not found");
    if (payload.status === "success") {
        await paymentRepository.updateStatus(payment.id, "COMPLETED", {
            transactionId: payload.transactionId,
            paidAt: new Date(),
        });
        await orderRepository.updatePaymentStatus(payment.orderId, "COMPLETED");
        await orderRepository.updateStatus(payment.orderId, "CONFIRMED");
    }
    else {
        await paymentRepository.updateStatus(payment.id, "FAILED", {
            transactionId: payload.transactionId,
        });
        await orderRepository.updatePaymentStatus(payment.orderId, "FAILED");
    }
    return { received: true };
};
/** GET /payments/:paymentId */
export const getPayment = async (paymentId, userId) => {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment)
        throw new PaymentError(404, "Payment not found");
    // Verify ownership if userId provided (client request)
    if (userId && payment.order.customerId !== userId) {
        throw new PaymentError(403, "Not your payment");
    }
    return payment;
};
