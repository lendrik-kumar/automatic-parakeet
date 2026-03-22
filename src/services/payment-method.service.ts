import { paymentMethodRepository } from "../repositories/payment-method.repository.js";
import { AppError } from "../utils/AppError.js";

export class PaymentMethodError extends AppError {}

interface CreatePaymentMethodInput {
  provider: "STRIPE" | "RAZORPAY" | "PAYPAL" | "INTERNAL";
  paymentMethod:
    | "CREDIT_CARD"
    | "DEBIT_CARD"
    | "NET_BANKING"
    | "WALLET"
    | "UPI"
    | "COD";
  token: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  upiId?: string;
  isDefault?: boolean;
}

export const listSavedPaymentMethods = async (userId: string) =>
  paymentMethodRepository.listByUserId(userId);

export const addSavedPaymentMethod = async (
  userId: string,
  data: CreatePaymentMethodInput,
) => {
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

export const removeSavedPaymentMethod = async (userId: string, id: string) => {
  const existing = await paymentMethodRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new PaymentMethodError(404, "Saved payment method not found");
  }

  await paymentMethodRepository.deactivate(id);
  return { id };
};

export const setDefaultSavedPaymentMethod = async (userId: string, id: string) => {
  const existing = await paymentMethodRepository.findById(id);
  if (!existing || existing.userId !== userId || !existing.isActive) {
    throw new PaymentMethodError(404, "Saved payment method not found");
  }

  await paymentMethodRepository.setAllDefaultFalse(userId);
  const updated = await paymentMethodRepository.setDefault(id);
  return updated;
};
