import prisma from "../lib/prisma.js";
export const couponRepository = {
    create: (data) => prisma.coupon.create({ data }),
    findById: (id) => prisma.coupon.findUnique({ where: { id } }),
    findByCode: (code) => prisma.coupon.findUnique({ where: { code } }),
    findMany: (skip, take) => Promise.all([
        prisma.coupon.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
        prisma.coupon.count(),
    ]),
    count: () => prisma.coupon.count(),
    update: (id, data) => prisma.coupon.update({ where: { id }, data }),
    delete: (id) => prisma.coupon.delete({ where: { id } }),
    updateStatus: (id, status) => prisma.coupon.update({ where: { id }, data: { status } }),
    incrementUsage: (id) => prisma.coupon.update({
        where: { id },
        data: { usedCount: { increment: 1 } },
    }),
    expireOldCoupons: () => prisma.coupon.updateMany({
        where: {
            expiryDate: { lt: new Date() },
            status: "ACTIVE",
        },
        data: { status: "EXPIRED" },
    }),
    usageStats: async (id) => {
        const coupon = await prisma.coupon.findUnique({ where: { id } });
        if (!coupon)
            return null;
        const usagePercentage = coupon.usageLimit && coupon.usageLimit > 0
            ? Math.round((coupon.usedCount / coupon.usageLimit) * 10000) / 100
            : null;
        return {
            id: coupon.id,
            code: coupon.code,
            usedCount: coupon.usedCount,
            usageLimit: coupon.usageLimit,
            usagePercentage,
            remainingUses: coupon.usageLimit !== null
                ? Math.max(0, coupon.usageLimit - coupon.usedCount)
                : null,
            isExpired: coupon.expiryDate < new Date(),
            status: coupon.status,
        };
    },
};
