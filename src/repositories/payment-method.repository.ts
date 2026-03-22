import prisma from "../lib/prisma.js";

export const paymentMethodRepository = {
  listByUserId: (userId: string) =>
    prisma.savedPaymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),

  findById: (id: string) =>
    prisma.savedPaymentMethod.findUnique({
      where: { id },
    }),

  create: (data: {
    userId: string;
    provider: "STRIPE" | "RAZORPAY" | "PAYPAL" | "INTERNAL";
    paymentMethod:
      | "CREDIT_CARD"
      | "DEBIT_CARD"
      | "NET_BANKING"
      | "WALLET"
      | "UPI"
      | "COD";
    token: string;
    cardBrand?: string | null;
    cardLast4?: string | null;
    cardExpMonth?: number | null;
    cardExpYear?: number | null;
    upiId?: string | null;
    isDefault?: boolean;
  }) => prisma.savedPaymentMethod.create({ data }),

  setAllDefaultFalse: (userId: string) =>
    prisma.savedPaymentMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),

  setDefault: (id: string) =>
    prisma.savedPaymentMethod.update({
      where: { id },
      data: { isDefault: true },
    }),

  deactivate: (id: string) =>
    prisma.savedPaymentMethod.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    }),
};
