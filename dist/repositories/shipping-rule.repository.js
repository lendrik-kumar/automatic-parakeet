import prisma from "../lib/prisma.js";
export const shippingRuleRepository = {
    findById: (id) => prisma.shippingRule.findUnique({
        where: { id },
    }),
    findMatchingRule: async (orderTotal, region) => {
        const whereBase = {
            isActive: true,
            minimumOrder: { lte: orderTotal },
            OR: [{ maximumOrder: null }, { maximumOrder: { gte: orderTotal } }],
        };
        if (region) {
            const regionRule = await prisma.shippingRule.findFirst({
                where: {
                    ...whereBase,
                    region,
                },
                orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            });
            if (regionRule)
                return regionRule;
        }
        return prisma.shippingRule.findFirst({
            where: {
                ...whereBase,
                region: null,
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
    },
    findMany: (skip, take) => Promise.all([
        prisma.shippingRule.findMany({
            skip,
            take,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        }),
        prisma.shippingRule.count(),
    ]),
    createMany: (data) => prisma.shippingRule.createMany({
        data,
    }),
    create: (data) => prisma.shippingRule.create({ data }),
    update: (id, data) => prisma.shippingRule.update({ where: { id }, data }),
    delete: (id) => prisma.shippingRule.delete({ where: { id } }),
};
