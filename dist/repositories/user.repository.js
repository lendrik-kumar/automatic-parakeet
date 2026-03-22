import prisma from "../lib/prisma.js";
// ─── Repository ───────────────────────────────────────────────────────────────
export const userRepository = {
    /** Find a user by primary key */
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    /** Find a user by email (case-insensitive via DB unique index) */
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    /** Find a user by phone number */
    findByPhone: (phoneNumber) => prisma.user.findUnique({ where: { phoneNumber } }),
    /** Create a new user */
    create: (data) => prisma.user.create({
        data: {
            ...data,
            status: data.status ?? "ACTIVE",
            phoneVerified: data.phoneVerified ?? false,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
        },
    }),
    /** Update a user's fields */
    update: (id, data) => prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        },
    }),
    /** Stamp last login timestamp */
    touchLastLogin: (id) => prisma.user.update({ where: { id }, data: { lastLogin: new Date() } }),
    /** Fetch public profile fields */
    getProfile: (id) => prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        },
    }),
    listOrders: (userId, skip, take) => Promise.all([
        prisma.order.findMany({
            where: { customerId: userId },
            skip,
            take,
            orderBy: { placedAt: "desc" },
            include: {
                items: {
                    select: {
                        id: true,
                        productNameSnapshot: true,
                        quantity: true,
                        total: true,
                    },
                },
                payments: { select: { paymentStatus: true, amount: true } },
                shipments: { select: { shippingStatus: true } },
            },
        }),
        prisma.order.count({ where: { customerId: userId } }),
    ]),
    listReviews: (userId, skip, take) => Promise.all([
        prisma.productReview.findMany({
            where: { customerId: userId },
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                product: { select: { id: true, name: true, slug: true } },
            },
        }),
        prisma.productReview.count({ where: { customerId: userId } }),
    ]),
    listAddresses: (userId) => prisma.address.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    }),
    listSessions: (userId, skip, take) => Promise.all([
        prisma.userSession.findMany({
            where: { userId },
            skip,
            take,
            orderBy: { createdAt: "desc" },
        }),
        prisma.userSession.count({ where: { userId } }),
    ]),
    bulkUpdateStatus: (userIds, status) => prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status },
    }),
};
