import prisma from "../lib/prisma.js";
export const couponRepository = {
    create: (data) => prisma.coupon.create({ data }),
    findById: (id) => prisma.coupon.findUnique({ where: { id } }),
    findByCode: (code) => prisma.coupon.findUnique({ where: { code } }),
    findMany: (skip, take) => Promise.all([
        prisma.coupon.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
        prisma.coupon.count(),
    ]),
    update: (id, data) => prisma.coupon.update({ where: { id }, data }),
    delete: (id) => prisma.coupon.delete({ where: { id } }),
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
};
