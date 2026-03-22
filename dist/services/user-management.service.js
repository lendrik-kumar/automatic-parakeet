import prisma from "../lib/prisma.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { userRepository } from "../repositories/user.repository.js";
export class UserManagementError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "UserManagementError";
    }
}
export const listUsers = async (page = 1, limit = 20, search, status) => {
    const skip = (page - 1) * limit;
    const where = {};
    if (status)
        where.status = status;
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
        ];
    }
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where: where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
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
                _count: { select: { orders: true, reviews: true } },
            },
        }),
        prisma.user.count({ where: where }),
    ]);
    return {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
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
            addresses: true,
            _count: { select: { orders: true, reviews: true, sessions: true } },
        },
    });
    if (!user)
        throw new UserManagementError(404, "User not found");
    return user;
};
export const updateUserStatus = async (adminId, userId, status) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const updated = await prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
        },
    });
    await adminRepository.logActivity(adminId, "UPDATE", "User", userId);
    return updated;
};
export const updateUserProfile = async (adminId, userId, data) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const updated = await userRepository.update(userId, data);
    await adminRepository.logActivity(adminId, "UPDATE", "User", userId);
    return updated;
};
export const resetUserPassword = async (adminId, userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    await adminRepository.logActivity(adminId, "UPDATE", "UserPasswordReset", userId);
    return {
        userId,
        message: "Password reset requested. Integrate email/SMS flow to deliver reset link.",
    };
};
export const getUserOrders = async (userId, page = 1, limit = 20) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const skip = (page - 1) * limit;
    const [orders, total] = await userRepository.listOrders(userId, skip, limit);
    return {
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getUserReviews = async (userId, page = 1, limit = 20) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const skip = (page - 1) * limit;
    const [reviews, total] = await userRepository.listReviews(userId, skip, limit);
    return {
        reviews,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getUserAddresses = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const addresses = await userRepository.listAddresses(userId);
    return { addresses };
};
export const getUserActivity = async (userId, page = 1, limit = 20) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new UserManagementError(404, "User not found");
    const skip = (page - 1) * limit;
    const [sessions, total] = await userRepository.listSessions(userId, skip, limit);
    return {
        sessions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const bulkUpdateUserStatus = async (adminId, userIds, status) => {
    if (!userIds.length)
        throw new UserManagementError(400, "User IDs are required");
    const result = await userRepository.bulkUpdateStatus(userIds, status);
    await adminRepository.logActivity(adminId, "UPDATE", "User", "bulk-status");
    return result;
};
