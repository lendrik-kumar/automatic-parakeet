import prisma from "../lib/prisma.js";

export interface CreateRoleInput {
  roleName: string;
  description?: string;
}

export interface UpdateRoleInput {
  roleName?: string;
  description?: string;
}

export const roleRepository = {
  findAll: () =>
    prisma.role.findMany({
      orderBy: { roleName: "asc" },
      include: {
        _count: {
          select: { admins: true },
        },
      },
    }),

  findById: (id: string) =>
    prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { admins: true },
        },
      },
    }),

  findByName: (roleName: string) =>
    prisma.role.findUnique({
      where: { roleName },
      include: {
        _count: {
          select: { admins: true },
        },
      },
    }),

  create: (data: CreateRoleInput) =>
    prisma.role.create({
      data,
      include: {
        _count: {
          select: { admins: true },
        },
      },
    }),

  update: (id: string, data: UpdateRoleInput) =>
    prisma.role.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { admins: true },
        },
      },
    }),

  delete: (id: string) =>
    prisma.role.delete({
      where: { id },
    }),

  countAdmins: (roleId: string) =>
    prisma.admin.count({
      where: { roleId },
    }),

  getAdmins: (roleId: string) =>
    prisma.admin.findMany({
      where: { roleId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        accountStatus: true,
        lastLogin: true,
        createdAt: true,
      },
    }),
};
