import prisma from "../lib/prisma.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateAddressInput {
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface UpdateAddressInput {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

// ─── Repository ─────────────────────────────────────────────────────────────

export const addressRepository = {
  /**
   * Find all addresses for a user
   */
  findByUserId: (userId: string) =>
    prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefaultShipping: "desc" },
        { isDefaultBilling: "desc" },
        { createdAt: "desc" },
      ],
    }),

  /**
   * Find a single address by ID
   */
  findById: (id: string) =>
    prisma.address.findUnique({
      where: { id },
    }),

  /**
   * Create a new address
   */
  create: (data: CreateAddressInput) =>
    prisma.address.create({
      data,
    }),

  /**
   * Update an address
   */
  update: (id: string, data: UpdateAddressInput) =>
    prisma.address.update({
      where: { id },
      data,
    }),

  /**
   * Delete an address
   */
  delete: (id: string) =>
    prisma.address.delete({
      where: { id },
    }),

  /**
   * Find the current default shipping address for a user
   */
  findDefaultShipping: (userId: string) =>
    prisma.address.findFirst({
      where: {
        userId,
        isDefaultShipping: true,
      },
    }),

  /**
   * Find the current default billing address for a user
   */
  findDefaultBilling: (userId: string) =>
    prisma.address.findFirst({
      where: {
        userId,
        isDefaultBilling: true,
      },
    }),

  /**
   * Unset default shipping for all addresses of a user
   */
  unsetDefaultShipping: (userId: string) =>
    prisma.address.updateMany({
      where: {
        userId,
        isDefaultShipping: true,
      },
      data: {
        isDefaultShipping: false,
      },
    }),

  /**
   * Unset default billing for all addresses of a user
   */
  unsetDefaultBilling: (userId: string) =>
    prisma.address.updateMany({
      where: {
        userId,
        isDefaultBilling: true,
      },
      data: {
        isDefaultBilling: false,
      },
    }),

  /**
   * Set an address as default shipping
   */
  setDefaultShipping: (id: string) =>
    prisma.address.update({
      where: { id },
      data: { isDefaultShipping: true },
    }),

  /**
   * Set an address as default billing
   */
  setDefaultBilling: (id: string) =>
    prisma.address.update({
      where: { id },
      data: { isDefaultBilling: true },
    }),

  /**
   * Count addresses for a user
   */
  countByUserId: (userId: string) =>
    prisma.address.count({
      where: { userId },
    }),
};
