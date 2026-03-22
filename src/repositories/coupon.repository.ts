import prisma from "../lib/prisma.js";
import type { CouponStatus, DiscountType } from "../generated/prisma/enums.js";

export const couponRepository = {
  create: (data: {
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    minimumOrderValue?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    startDate: Date;
    expiryDate: Date;
    status?: CouponStatus;
  }) => prisma.coupon.create({ data }),

  findById: (id: string) => prisma.coupon.findUnique({ where: { id } }),

  findByCode: (code: string) => prisma.coupon.findUnique({ where: { code } }),

  findMany: (skip: number, take: number) =>
    Promise.all([
      prisma.coupon.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
      prisma.coupon.count(),
    ]),

  count: () => prisma.coupon.count(),

  update: (
    id: string,
    data: {
      code?: string;
      description?: string;
      discountType?: DiscountType;
      discountValue?: number;
      minimumOrderValue?: number;
      maximumDiscount?: number;
      usageLimit?: number;
      startDate?: Date;
      expiryDate?: Date;
      status?: CouponStatus;
    },
  ) => prisma.coupon.update({ where: { id }, data }),

  delete: (id: string) => prisma.coupon.delete({ where: { id } }),

  updateStatus: (id: string, status: CouponStatus) =>
    prisma.coupon.update({ where: { id }, data: { status } }),

  incrementUsage: (id: string) =>
    prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    }),

  expireOldCoupons: () =>
    prisma.coupon.updateMany({
      where: {
        expiryDate: { lt: new Date() },
        status: "ACTIVE",
      },
      data: { status: "EXPIRED" },
    }),

  usageStats: async (id: string) => {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return null;

    const usagePercentage =
      coupon.usageLimit && coupon.usageLimit > 0
        ? Math.round((coupon.usedCount / coupon.usageLimit) * 10000) / 100
        : null;

    return {
      id: coupon.id,
      code: coupon.code,
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit,
      usagePercentage,
      remainingUses:
        coupon.usageLimit !== null
          ? Math.max(0, coupon.usageLimit - coupon.usedCount)
          : null,
      isExpired: coupon.expiryDate < new Date(),
      status: coupon.status,
    };
  },
};
