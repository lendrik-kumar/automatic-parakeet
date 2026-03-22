import prisma from "../lib/prisma.js";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "../generated/prisma/enums.js";

export const orderRepository = {
  create: (data: {
    orderNumber: string;
    customerId: string;
    subtotal: number;
    taxAmount: number;
    shippingCost: number;
    discountAmount: number;
    totalAmount: number;
  }) => prisma.order.create({ data }),

  findById: (id: string) =>
    prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: {
              select: { id: true, sku: true, size: true, color: true },
            },
          },
        },
        addresses: true,
        payments: true,
        shipments: true,
        returnRequests: { include: { items: true } },
        refunds: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),

  findByOrderNumber: (orderNumber: string) =>
    prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        addresses: true,
        payments: true,
        shipments: true,
      },
    }),

  findByCustomer: (customerId: string, skip: number, take: number) =>
    Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take,
        orderBy: { placedAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
          payments: { select: { paymentStatus: true } },
          shipments: { select: { shippingStatus: true } },
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]),

  findMany: (params: {
    skip: number;
    take: number;
    where?: Record<string, unknown>;
  }) =>
    Promise.all([
      prisma.order.findMany({
        where: params.where as never,
        skip: params.skip,
        take: params.take,
        orderBy: { placedAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: {
            select: {
              id: true,
              productNameSnapshot: true,
              quantity: true,
              total: true,
            },
          },
          payments: { select: { paymentStatus: true, amount: true } },
        },
      }),
      prisma.order.count({ where: params.where as never }),
    ]),

  findManyAdvanced: (params: {
    skip: number;
    take: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    productId?: string;
    search?: string;
  }) => {
    const where: Record<string, unknown> = {};

    if (params.status) where.orderStatus = params.status;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.fulfillmentStatus)
      where.fulfillmentStatus = params.fulfillmentStatus;
    if (params.customerId) where.customerId = params.customerId;
    if (params.productId) {
      where.items = { some: { productId: params.productId } };
    }
    if (params.startDate || params.endDate) {
      where.placedAt = {};
      if (params.startDate)
        (where.placedAt as Record<string, unknown>).gte = params.startDate;
      if (params.endDate)
        (where.placedAt as Record<string, unknown>).lte = params.endDate;
    }
    if (params.search) {
      where.OR = [
        {
          orderNumber: { contains: params.search, mode: "insensitive" },
        },
        {
          customer: { email: { contains: params.search, mode: "insensitive" } },
        },
        {
          customer: {
            firstName: { contains: params.search, mode: "insensitive" },
          },
        },
        {
          customer: {
            lastName: { contains: params.search, mode: "insensitive" },
          },
        },
      ];
    }

    return Promise.all([
      prisma.order.findMany({
        where: where as never,
        skip: params.skip,
        take: params.take,
        orderBy: { placedAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: {
            select: {
              id: true,
              productId: true,
              productNameSnapshot: true,
              quantity: true,
              total: true,
            },
          },
          payments: { select: { paymentStatus: true, amount: true } },
          shipments: { select: { shippingStatus: true } },
        },
      }),
      prisma.order.count({ where: where as never }),
    ]);
  },

  bulkUpdateStatus: (orderIds: string[], orderStatus: OrderStatus) =>
    prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { orderStatus },
    }),

  searchMany: (query: string, skip: number, take: number) =>
    Promise.all([
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customer: { email: { contains: query, mode: "insensitive" } } },
            {
              customer: {
                firstName: { contains: query, mode: "insensitive" },
              },
            },
            {
              customer: {
                lastName: { contains: query, mode: "insensitive" },
              },
            },
          ],
        },
        skip,
        take,
        orderBy: { placedAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: {
            select: {
              id: true,
              productNameSnapshot: true,
              quantity: true,
              total: true,
            },
          },
          payments: { select: { paymentStatus: true, amount: true } },
        },
      }),
      prisma.order.count({
        where: {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customer: { email: { contains: query, mode: "insensitive" } } },
            {
              customer: {
                firstName: { contains: query, mode: "insensitive" },
              },
            },
            {
              customer: {
                lastName: { contains: query, mode: "insensitive" },
              },
            },
          ],
        },
      }),
    ]),

  updateStatus: (id: string, orderStatus: OrderStatus) =>
    prisma.order.update({ where: { id }, data: { orderStatus } }),

  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus) =>
    prisma.order.update({ where: { id }, data: { paymentStatus } }),

  createOrderItem: (data: {
    orderId: string;
    productId: string;
    variantId: string;
    productNameSnapshot: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    total: number;
  }) => prisma.orderItem.create({ data }),

  createOrderAddress: (data: {
    orderId: string;
    shippingAddress: string;
    billingAddress: string;
  }) => prisma.orderAddress.create({ data }),

  // ── Analytics helpers ─────────────────────────────────────────────────────

  countByStatus: (status: OrderStatus) =>
    prisma.order.count({ where: { orderStatus: status } }),

  todayOrders: () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return Promise.all([
      prisma.order.count({ where: { placedAt: { gte: startOfDay } } }),
      prisma.order.aggregate({
        where: { placedAt: { gte: startOfDay }, paymentStatus: "COMPLETED" },
        _sum: { totalAmount: true },
      }),
    ]);
  },

  salesInRange: (startDate: Date, endDate: Date) =>
    prisma.order.aggregate({
      where: {
        placedAt: { gte: startDate, lte: endDate },
        paymentStatus: "COMPLETED",
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
};
