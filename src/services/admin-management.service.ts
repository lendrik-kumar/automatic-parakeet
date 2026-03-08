import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { adminRepository } from "../repositories/admin.repository.js";
import type { AdminAccountStatus } from "../generated/prisma/enums.js";

export class AdminManagementError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
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

export const createAdmin = async (
  creatorAdminId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleId: string;
    profileImage?: string;
  },
) => {
  const existing = await adminRepository.findByEmail(data.email);
  if (existing)
    throw new AdminManagementError(409, "Admin with this email already exists");

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) throw new AdminManagementError(400, "Invalid role ID");

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

  await adminRepository.logActivity(
    creatorAdminId,
    "CREATE",
    "Admin",
    admin.id,
  );
  return admin;
};

export const updateAdmin = async (
  requesterAdminId: string,
  adminId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roleId?: string;
    profileImage?: string;
  },
) => {
  const existing = await adminRepository.findById(adminId);
  if (!existing) throw new AdminManagementError(404, "Admin not found");

  if (data.roleId) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new AdminManagementError(400, "Invalid role ID");
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

  await adminRepository.logActivity(
    requesterAdminId,
    "UPDATE",
    "Admin",
    adminId,
  );
  return admin;
};

export const updateAdminStatus = async (
  requesterAdminId: string,
  adminId: string,
  status: AdminAccountStatus,
) => {
  const existing = await adminRepository.findById(adminId);
  if (!existing) throw new AdminManagementError(404, "Admin not found");

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
