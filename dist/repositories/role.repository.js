import prisma from "../lib/prisma.js";
export const roleRepository = {
    findAll: () => prisma.role.findMany({
        orderBy: { roleName: "asc" },
        include: {
            _count: {
                select: { admins: true },
            },
        },
    }),
    findById: (id) => prisma.role.findUnique({
        where: { id },
        include: {
            _count: {
                select: { admins: true },
            },
        },
    }),
    findByName: (roleName) => prisma.role.findUnique({
        where: { roleName },
        include: {
            _count: {
                select: { admins: true },
            },
        },
    }),
    create: (data) => prisma.role.create({
        data,
        include: {
            _count: {
                select: { admins: true },
            },
        },
    }),
    update: (id, data) => prisma.role.update({
        where: { id },
        data,
        include: {
            _count: {
                select: { admins: true },
            },
        },
    }),
    delete: (id) => prisma.role.delete({
        where: { id },
    }),
    countAdmins: (roleId) => prisma.admin.count({
        where: { roleId },
    }),
    getAdmins: (roleId) => prisma.admin.findMany({
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
