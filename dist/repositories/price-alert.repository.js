import prisma from "../lib/prisma.js";
export const priceAlertRepository = {
    listByUserId: (userId) => prisma.priceAlert.findMany({
        where: { userId },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    basePrice: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    }),
    findById: (id) => prisma.priceAlert.findUnique({
        where: { id },
    }),
    create: (data) => prisma.priceAlert.create({ data }),
    update: (id, data) => prisma.priceAlert.update({
        where: { id },
        data,
    }),
    delete: (id) => prisma.priceAlert.delete({
        where: { id },
    }),
};
