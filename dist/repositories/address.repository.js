import prisma from "../lib/prisma.js";
// ─── Repository ─────────────────────────────────────────────────────────────
export const addressRepository = {
    /**
     * Find all addresses for a user
     */
    findByUserId: (userId) => prisma.address.findMany({
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
    findById: (id) => prisma.address.findUnique({
        where: { id },
    }),
    /**
     * Create a new address
     */
    create: (data) => prisma.address.create({
        data,
    }),
    /**
     * Update an address
     */
    update: (id, data) => prisma.address.update({
        where: { id },
        data,
    }),
    /**
     * Delete an address
     */
    delete: (id) => prisma.address.delete({
        where: { id },
    }),
    /**
     * Find the current default shipping address for a user
     */
    findDefaultShipping: (userId) => prisma.address.findFirst({
        where: {
            userId,
            isDefaultShipping: true,
        },
    }),
    /**
     * Find the current default billing address for a user
     */
    findDefaultBilling: (userId) => prisma.address.findFirst({
        where: {
            userId,
            isDefaultBilling: true,
        },
    }),
    /**
     * Unset default shipping for all addresses of a user
     */
    unsetDefaultShipping: (userId) => prisma.address.updateMany({
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
    unsetDefaultBilling: (userId) => prisma.address.updateMany({
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
    setDefaultShipping: (id) => prisma.address.update({
        where: { id },
        data: { isDefaultShipping: true },
    }),
    /**
     * Set an address as default billing
     */
    setDefaultBilling: (id) => prisma.address.update({
        where: { id },
        data: { isDefaultBilling: true },
    }),
    /**
     * Count addresses for a user
     */
    countByUserId: (userId) => prisma.address.count({
        where: { userId },
    }),
};
