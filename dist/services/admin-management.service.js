import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { adminRepository } from "../repositories/admin.repository.js";
export class AdminManagementError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AdminManagementError";
    }
}
export const listAdmins = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [admins, total] = await Promise.all([
        prisma.admin.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
                accountStatus: true,
                lastLogin: true,
                createdAt: true,
                role: { select: { id: true, roleName: true } },
            },
        }),
        prisma.admin.count(),
    ]);
    return {
        admins,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const createAdmin = async (creatorAdminId, data) => {
    const existing = await adminRepository.findByEmail(data.email);
    if (existing)
        throw new AdminManagementError(409, "Admin with this email already exists");
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role)
        throw new AdminManagementError(400, "Invalid role ID");
    const passwordHash = await bcrypt.hash(data.password, 12);
    const admin = await prisma.admin.create({
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            passwordHash,
            roleId: data.roleId,
            profileImage: data.profileImage,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountStatus: true,
            role: { select: { id: true, roleName: true } },
            createdAt: true,
        },
    });
    await adminRepository.logActivity(creatorAdminId, "CREATE", "Admin", admin.id);
    return admin;
};
export const updateAdmin = async (requesterAdminId, adminId, data) => {
    const existing = await adminRepository.findById(adminId);
    if (!existing)
        throw new AdminManagementError(404, "Admin not found");
    if (data.roleId) {
        const role = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (!role)
            throw new AdminManagementError(400, "Invalid role ID");
    }
    const admin = await prisma.admin.update({
        where: { id: adminId },
        data,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountStatus: true,
            role: { select: { id: true, roleName: true } },
        },
    });
    await adminRepository.logActivity(requesterAdminId, "UPDATE", "Admin", adminId);
    return admin;
};
export const updateAdminStatus = async (requesterAdminId, adminId, status) => {
    const existing = await adminRepository.findById(adminId);
    if (!existing)
        throw new AdminManagementError(404, "Admin not found");
    if (adminId === requesterAdminId) {
        throw new AdminManagementError(400, "Cannot change your own status");
    }
    const admin = await prisma.admin.update({
        where: { id: adminId },
        data: { accountStatus: status },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountStatus: true,
        },
    });
    const action = status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE";
    await adminRepository.logActivity(requesterAdminId, action, "Admin", adminId);
    return admin;
};
export const getAdmin = async (adminId) => {
    const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            accountStatus: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            role: { select: { id: true, roleName: true, description: true } },
        },
    });
    if (!admin)
        throw new AdminManagementError(404, "Admin not found");
    return admin;
};
export const deleteAdmin = async (requesterAdminId, adminId) => {
    const existing = await adminRepository.findById(adminId);
    if (!existing)
        throw new AdminManagementError(404, "Admin not found");
    if (adminId === requesterAdminId) {
        throw new AdminManagementError(400, "Cannot delete your own account");
    }
    await prisma.admin.delete({ where: { id: adminId } });
    await adminRepository.logActivity(requesterAdminId, "DELETE", "Admin", adminId);
};
