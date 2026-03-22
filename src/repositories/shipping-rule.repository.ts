import prisma from "../lib/prisma.js";

export const shippingRuleRepository = {
  findById: (id: string) =>
    prisma.shippingRule.findUnique({
      where: { id },
    }),

  findMatchingRule: async (orderTotal: number, region?: string | null) => {
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
      if (regionRule) return regionRule;
    }

    return prisma.shippingRule.findFirst({
      where: {
        ...whereBase,
        region: null,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  },

  findMany: (skip: number, take: number) =>
    Promise.all([
      prisma.shippingRule.findMany({
        skip,
        take,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.shippingRule.count(),
    ]),

  createMany: (
    data: {
      name: string;
      region?: string | null;
      minimumOrder?: number;
      maximumOrder?: number | null;
      shippingCost: number;
      isFreeShipping?: boolean;
      isActive?: boolean;
      priority?: number;
    }[],
  ) =>
    prisma.shippingRule.createMany({
      data,
    }),

  create: (data: {
    name: string;
    region?: string | null;
    minimumOrder?: number;
    maximumOrder?: number | null;
    shippingCost: number;
    isFreeShipping?: boolean;
    isActive?: boolean;
    priority?: number;
  }) => prisma.shippingRule.create({ data }),

  update: (
    id: string,
    data: {
      name?: string;
      region?: string | null;
      minimumOrder?: number;
      maximumOrder?: number | null;
      shippingCost?: number;
      isFreeShipping?: boolean;
      isActive?: boolean;
      priority?: number;
    },
  ) => prisma.shippingRule.update({ where: { id }, data }),

  delete: (id: string) => prisma.shippingRule.delete({ where: { id } }),
};
