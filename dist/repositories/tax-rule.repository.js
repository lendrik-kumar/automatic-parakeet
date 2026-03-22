import prisma from "../lib/prisma.js";
export const taxRuleRepository = {
    findActiveByRegion: (region) => prisma.taxRule.findMany({
        where: {
            isActive: true,
            OR: [{ region: region ?? null }, { region: null }],
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    findApplicable: async (region) => {
        if (region) {
            const regionRule = await prisma.taxRule.findFirst({
                where: {
                    isActive: true,
                    region,
                },
                orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            });
            if (regionRule)
                return regionRule;
        }
        return prisma.taxRule.findFirst({
            where: { isActive: true, region: null },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
    },
    findMany: (skip, take) => Promise.all([
        prisma.taxRule.findMany({
            skip,
            take,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        }),
        prisma.taxRule.count(),
    ]),
    create: (data) => prisma.taxRule.create({ data }),
    update: (id, data) => prisma.taxRule.update({ where: { id }, data }),
    delete: (id) => prisma.taxRule.delete({ where: { id } }),
};
