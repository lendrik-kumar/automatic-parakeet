import prisma from "../lib/prisma.js";
import { UserStatus } from "../generated/prisma/enums.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  phoneVerified?: boolean;
  status?: UserStatus;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  passwordHash?: string;
  phoneNumber?: string;
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
    prisma.user.findFirst({ where: { phoneNumber } }),

  /** Find a user by username */
  findByUsername: (username: string) =>
    prisma.user.findUnique({ where: { username } }),

  /** Check uniqueness before registration */
  findByUsernameOrEmail: (username: string, email: string) =>
    prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    }),

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
  update: (id: string, data: UpdateUserInput) =>
    prisma.user.update({ where: { id }, data }),

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
