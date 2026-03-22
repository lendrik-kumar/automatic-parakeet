import prisma from "../lib/prisma.js";

export const taxRuleRepository = {
  findActiveByRegion: (region?: string | null) =>
    prisma.taxRule.findMany({
      where: {
        isActive: true,
        OR: [{ region: region ?? null }, { region: null }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),

  findApplicable: async (region?: string | null) => {
    if (region) {
      const regionRule = await prisma.taxRule.findFirst({
        where: {
          isActive: true,
          region,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
      if (regionRule) return regionRule;
    }

    return prisma.taxRule.findFirst({
      where: { isActive: true, region: null },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  },

  findMany: (skip: number, take: number) =>
    Promise.all([
      prisma.taxRule.findMany({
        skip,
        take,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.taxRule.count(),
    ]),

  create: (data: {
    name: string;
    region?: string | null;
    taxRate: number;
    isActive?: boolean;
    priority?: number;
  }) => prisma.taxRule.create({ data }),

  update: (
    id: string,
    data: {
      name?: string;
      region?: string | null;
      taxRate?: number;
      isActive?: boolean;
      priority?: number;
    },
  ) => prisma.taxRule.update({ where: { id }, data }),

  delete: (id: string) => prisma.taxRule.delete({ where: { id } }),
};
