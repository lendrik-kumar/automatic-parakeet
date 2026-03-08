import prisma from "../lib/prisma.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type { UserStatus } from "../generated/prisma/enums.js";

export class UserManagementError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}

export const listUsers = async (
  page = 1,
  limit = 20,
  search?: string,
  status?: UserStatus,
) => {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as never,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
        _count: { select: { orders: true, reviews: true } },
      },
    }),
    prisma.user.count({ where: where as never }),
  ]);

  return {
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      addresses: true,
      _count: { select: { orders: true, reviews: true, sessions: true } },
    },
  });
  if (!user) throw new UserManagementError(404, "User not found");
  return user;
};

export const updateUserStatus = async (
  adminId: string,
  userId: string,
  status: UserStatus,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserManagementError(404, "User not found");

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
