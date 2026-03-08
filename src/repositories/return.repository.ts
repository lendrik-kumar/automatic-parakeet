import prisma from "../lib/prisma.js";
import type { ReturnStatus } from "../generated/prisma/enums.js";

export const returnRepository = {
  create: (data: { orderId: string; customerId: string; reason: string }) =>
    prisma.returnRequest.create({ data }),

  createItem: (data: {
    returnId: string;
    orderItemId: string;
    quantity: number;
    refundAmount: number;
  }) => prisma.returnItem.create({ data }),

  findById: (id: string) =>
    prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: true,
        order: {
          select: { id: true, orderNumber: true, orderStatus: true },
          include: { items: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),

  findByCustomer: (customerId: string, skip: number, take: number) =>
    Promise.all([
      prisma.returnRequest.findMany({
        where: { customerId },
        skip,
        take,
        orderBy: { requestedAt: "desc" },
        include: {
          order: { select: { id: true, orderNumber: true } },
          items: true,
        },
      }),
      prisma.returnRequest.count({ where: { customerId } }),
    ]),

  findMany: (skip: number, take: number, where?: Record<string, unknown>) =>
    Promise.all([
      prisma.returnRequest.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { requestedAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          order: { select: { id: true, orderNumber: true } },
          items: true,
        },
      }),
      prisma.returnRequest.count({ where: where as never }),
    ]),

  updateStatus: (id: string, returnStatus: ReturnStatus) =>
    prisma.returnRequest.update({ where: { id }, data: { returnStatus } }),
};
