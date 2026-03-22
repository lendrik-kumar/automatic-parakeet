import { paymentMethodRepository } from "../repositories/payment-method.repository.js";
import { AppError } from "../utils/AppError.js";
export class PaymentMethodError extends AppError {
}
export const listSavedPaymentMethods = async (userId) => paymentMethodRepository.listByUserId(userId);
export const addSavedPaymentMethod = async (userId, data) => {
    if (data.isDefault) {
        await paymentMethodRepository.setAllDefaultFalse(userId);
    }
    const created = await paymentMethodRepository.create({
        userId,
        ...data,
        cardBrand: data.cardBrand ?? null,
        cardLast4: data.cardLast4 ?? null,
        cardExpMonth: data.cardExpMonth ?? null,
        cardExpYear: data.cardExpYear ?? null,
        upiId: data.upiId ?? null,
    });
    if (!data.isDefault) {
        const existing = await paymentMethodRepository.listByUserId(userId);
        if (existing.length === 1) {
            await paymentMethodRepository.setDefault(created.id);
        }
    }
    return created;
};
export const removeSavedPaymentMethod = async (userId, id) => {
    const existing = await paymentMethodRepository.findById(id);
    if (!existing || existing.userId !== userId) {
        throw new PaymentMethodError(404, "Saved payment method not found");
    }
    await paymentMethodRepository.deactivate(id);
    return { id };
};
export const setDefaultSavedPaymentMethod = async (userId, id) => {
    const existing = await paymentMethodRepository.findById(id);
    if (!existing || existing.userId !== userId || !existing.isActive) {
        throw new PaymentMethodError(404, "Saved payment method not found");
    }
    await paymentMethodRepository.setAllDefaultFalse(userId);
    const updated = await paymentMethodRepository.setDefault(id);
    return updated;
};
