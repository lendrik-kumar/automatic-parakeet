import prisma from "../lib/prisma.js";
import type { ShippingStatus } from "../generated/prisma/enums.js";

export const shippingRepository = {
  // ── Shipping Methods ────────────────────────────────────────────────────────

  createMethod: (data: {
    name: string;
    description?: string;
    cost: number;
    estimatedDeliveryDays: number;
  }) => prisma.shippingMethod.create({ data }),

  findAllMethods: () =>
    prisma.shippingMethod.findMany({ orderBy: { cost: "asc" } }),

  findMethodById: (id: string) =>
    prisma.shippingMethod.findUnique({ where: { id } }),

  updateMethod: (
    id: string,
    data: {
      name?: string;
      description?: string;
      cost?: number;
      estimatedDeliveryDays?: number;
    },
  ) => prisma.shippingMethod.update({ where: { id }, data }),

  deleteMethod: (id: string) => prisma.shippingMethod.delete({ where: { id } }),

  // ── Shipments ─────────────────────────────────────────────────────────────

  createShipment: (data: {
    orderId: string;
    courierName: string;
    trackingNumber?: string;
    shippingMethod: string;
  }) => prisma.shipment.create({ data }),

  findShipmentById: (id: string) =>
    prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, orderNumber: true, orderStatus: true } },
      },
    }),

  updateShipmentStatus: (
    id: string,
    shippingStatus: ShippingStatus,
    extra?: { shippedAt?: Date; deliveredAt?: Date },
  ) =>
    prisma.shipment.update({
      where: { id },
      data: { shippingStatus, ...extra },
    }),
};
