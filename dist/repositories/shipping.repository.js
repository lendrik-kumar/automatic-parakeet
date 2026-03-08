import prisma from "../lib/prisma.js";
export const shippingRepository = {
    // ── Shipping Methods ────────────────────────────────────────────────────────
    createMethod: (data) => prisma.shippingMethod.create({ data }),
    findAllMethods: () => prisma.shippingMethod.findMany({ orderBy: { cost: "asc" } }),
    findMethodById: (id) => prisma.shippingMethod.findUnique({ where: { id } }),
    updateMethod: (id, data) => prisma.shippingMethod.update({ where: { id }, data }),
    deleteMethod: (id) => prisma.shippingMethod.delete({ where: { id } }),
    // ── Shipments ─────────────────────────────────────────────────────────────
    createShipment: (data) => prisma.shipment.create({ data }),
    findShipmentById: (id) => prisma.shipment.findUnique({
        where: { id },
        include: {
            order: { select: { id: true, orderNumber: true, orderStatus: true } },
        },
    }),
    updateShipmentStatus: (id, shippingStatus, extra) => prisma.shipment.update({
        where: { id },
        data: { shippingStatus, ...extra },
    }),
};
