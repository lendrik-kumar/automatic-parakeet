import { z } from "zod";
import * as svc from "../services/payment-method.service.js";
const createPaymentMethodSchema = z.object({
    provider: z.enum(["STRIPE", "RAZORPAY", "PAYPAL", "INTERNAL"]),
    paymentMethod: z.enum([
        "CREDIT_CARD",
        "DEBIT_CARD",
        "NET_BANKING",
        "WALLET",
        "UPI",
        "COD",
    ]),
    token: z.string().min(1),
    cardBrand: z.string().optional(),
    cardLast4: z.string().length(4).optional(),
    cardExpMonth: z.number().int().min(1).max(12).optional(),
    cardExpYear: z.number().int().min(new Date().getFullYear()).optional(),
    upiId: z.string().optional(),
    isDefault: z.boolean().optional(),
});
export const listSavedPaymentMethods = async (req, res, next) => {
    try {
        const paymentMethods = await svc.listSavedPaymentMethods(req.user.id);
        res.status(200).json({ success: true, data: { paymentMethods } });
    }
    catch (e) {
        next(e);
    }
};
export const addSavedPaymentMethod = async (req, res, next) => {
    try {
        const data = createPaymentMethodSchema.parse(req.body);
        const paymentMethod = await svc.addSavedPaymentMethod(req.user.id, data);
        res.status(201).json({
            success: true,
            message: "Payment method saved",
            data: { paymentMethod },
        });
    }
    catch (e) {
        next(e);
    }
};
export const removeSavedPaymentMethod = async (req, res, next) => {
    try {
        await svc.removeSavedPaymentMethod(req.user.id, req.params.paymentMethodId);
        res.status(200).json({ success: true, message: "Payment method removed" });
    }
    catch (e) {
        next(e);
    }
};
export const setDefaultSavedPaymentMethod = async (req, res, next) => {
    try {
        const paymentMethod = await svc.setDefaultSavedPaymentMethod(req.user.id, req.params.paymentMethodId);
        res.status(200).json({
            success: true,
            message: "Default payment method updated",
            data: { paymentMethod },
        });
    }
    catch (e) {
        next(e);
    }
};
