import prisma from "../lib/prisma.js";
export const savedItemRepository = {
    findByCustomerId: (customerId) => prisma.savedItem.findMany({
        where: { customerId },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                },
            },
            variant: {
                select: {
                    id: true,
                    sku: true,
                    size: true,
                    color: true,
                    price: true,
                    status: true,
                },
                include: { inventory: true },
            },
        },
        orderBy: { savedAt: "desc" },
    }),
    findById: (id) => prisma.savedItem.findUnique({
        where: { id },
        include: {
            product: true,
            variant: { include: { inventory: true, product: true } },
        },
    }),
    create: (data) => prisma.savedItem.create({ data }),
    delete: (id) => prisma.savedItem.delete({ where: { id } }),
    deleteAllByCustomer: (customerId) => prisma.savedItem.deleteMany({ where: { customerId } }),
    countByCustomer: (customerId) => prisma.savedItem.count({ where: { customerId } }),
};
