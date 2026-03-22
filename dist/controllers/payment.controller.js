import { z } from "zod";
import * as svc from "../services/payment.service.js";
const createPaymentSchema = z.object({
    paymentId: z.string().uuid(),
});
const webhookSchema = z.object({
    transactionId: z.string().min(1),
    paymentId: z.string().uuid(),
    status: z.enum(["success", "failed"]),
});
/** POST /payments/create */
export const createPayment = async (req, res, next) => {
    try {
        const { paymentId } = createPaymentSchema.parse(req.body);
        const session = await svc.createPaymentSession(paymentId);
        res.status(200).json({ success: true, data: { session } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /payments/webhook */
export const webhook = async (req, res, next) => {
    try {
        const payload = webhookSchema.parse(req.body);
        const result = await svc.handleWebhook(payload);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /payments/:paymentId */
export const getPayment = async (req, res, next) => {
    try {
        const payment = await svc.getPayment(req.params.paymentId, req.user?.id);
        res.status(200).json({ success: true, data: { payment } });
    }
    catch (e) {
        next(e);
    }
};
