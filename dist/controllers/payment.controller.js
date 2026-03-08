import { z } from "zod";
import * as svc from "../services/payment.service.js";
import { PaymentError } from "../services/payment.service.js";
const handleError = (res, error) => {
    if (error instanceof z.ZodError) {
        res
            .status(400)
            .json({
            success: false,
            message: "Validation error",
            errors: error.issues,
        });
        return;
    }
    if (error instanceof PaymentError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[PaymentController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const createPaymentSchema = z.object({
    paymentId: z.string().uuid(),
});
const webhookSchema = z.object({
    transactionId: z.string().min(1),
    paymentId: z.string().uuid(),
    status: z.enum(["success", "failed"]),
});
/** POST /payments/create */
export const createPayment = async (req, res) => {
    try {
        const { paymentId } = createPaymentSchema.parse(req.body);
        const session = await svc.createPaymentSession(paymentId);
        res.status(200).json({ success: true, data: { session } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /payments/webhook */
export const webhook = async (req, res) => {
    try {
        const payload = webhookSchema.parse(req.body);
        const result = await svc.handleWebhook(payload);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /payments/:paymentId */
export const getPayment = async (req, res) => {
    try {
        const payment = await svc.getPayment(req.params.paymentId, req.user?.id);
        res.status(200).json({ success: true, data: { payment } });
    }
    catch (e) {
        handleError(res, e);
    }
};
