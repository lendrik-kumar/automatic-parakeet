import prisma from "../lib/prisma.js";
import { UserStatus, Gender } from "../generated/prisma/enums.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  gender: Gender;
  dateOfBirth: Date;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  status?: UserStatus;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  passwordHash?: string;
  phoneNumber?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  status?: UserStatus;
  lastLogin?: Date;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const userRepository = {
  /** Find a user by primary key */
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  /** Find a user by email (case-insensitive via DB unique index) */
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  /** Find a user by phone number */
  findByPhone: (phoneNumber: string) =>
    prisma.user.findUnique({ where: { phoneNumber } }),

  /** Create a new user */
  create: (data: CreateUserInput) =>
    prisma.user.create({
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
  update: (id: string, data: UpdateUserInput) =>
    prisma.user.update({
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
  touchLastLogin: (id: string) =>
    prisma.user.update({ where: { id }, data: { lastLogin: new Date() } }),

  /** Fetch public profile fields */
  getProfile: (id: string) =>
    prisma.user.findUnique({
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

  listOrders: (userId: string, skip: number, take: number) =>
    Promise.all([
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

  listReviews: (userId: string, skip: number, take: number) =>
    Promise.all([
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

  listAddresses: (userId: string) =>
    prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),

  listSessions: (userId: string, skip: number, take: number) =>
    Promise.all([
      prisma.userSession.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.userSession.count({ where: { userId } }),
    ]),

  bulkUpdateStatus: (userIds: string[], status: UserStatus) =>
    prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status },
    }),
};
