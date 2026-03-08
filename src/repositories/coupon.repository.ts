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
};
