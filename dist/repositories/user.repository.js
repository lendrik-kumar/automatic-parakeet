import prisma from "../lib/prisma.js";
// ─── Repository ───────────────────────────────────────────────────────────────
export const userRepository = {
    /** Find a user by primary key */
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    /** Find a user by email (case-insensitive via DB unique index) */
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    /** Find a user by phone number */
    findByPhone: (phoneNumber) => prisma.user.findFirst({ where: { phoneNumber } }),
    /** Find a user by username */
    findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
    /** Check uniqueness before registration */
    findByUsernameOrEmail: (username, email) => prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
    }),
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
            username: true,
            email: true,
            phoneNumber: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
        },
    }),
    /** Update a user's fields */
    update: (id, data) => prisma.user.update({ where: { id }, data }),
    /** Stamp last login timestamp */
    touchLastLogin: (id) => prisma.user.update({ where: { id }, data: { lastLogin: new Date() } }),
    /** Fetch public profile fields */
    getProfile: (id) => prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phoneNumber: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        },
    }),
};
