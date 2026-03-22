import prisma from "../lib/prisma.js";
export const paymentMethodRepository = {
    listByUserId: (userId) => prisma.savedPaymentMethod.findMany({
        where: { userId, isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    findById: (id) => prisma.savedPaymentMethod.findUnique({
        where: { id },
    }),
    create: (data) => prisma.savedPaymentMethod.create({ data }),
    setAllDefaultFalse: (userId) => prisma.savedPaymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
    }),
    setDefault: (id) => prisma.savedPaymentMethod.update({
        where: { id },
        data: { isDefault: true },
    }),
    deactivate: (id) => prisma.savedPaymentMethod.update({
        where: { id },
        data: { isActive: false, isDefault: false },
    }),
};
