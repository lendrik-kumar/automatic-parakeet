import prisma from "../lib/prisma.js";
import { orderRepository } from "../repositories/order.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
export const getDashboard = async () => {
    const [todayOrdersData, lowStock, topProducts, totalUsers, totalProducts] = await Promise.all([
        orderRepository.todayOrders(),
        inventoryRepository.findLowStock(10),
        prisma.orderItem.groupBy({
            by: ["productId"],
            _sum: { quantity: true, total: true },
            orderBy: { _sum: { total: "desc" } },
            take: 10,
        }),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.product.count({ where: { status: "ACTIVE" } }),
    ]);
    const [ordersToday, salesToday] = todayOrdersData;
    // Enrich top products with names
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, slug: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return {
        salesToday: salesToday._sum.totalAmount || 0,
        ordersToday,
        totalUsers,
        totalProducts,
        topProducts: topProducts.map((p) => ({
            product: productMap.get(p.productId),
            totalQuantity: p._sum.quantity,
            totalRevenue: p._sum.total,
        })),
        lowInventory: lowStock,
    };
};
export const getSalesAnalytics = async (query) => {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const sales = await orderRepository.salesInRange(startDate, endDate);
    // Get daily breakdown
    const dailySales = await prisma.$queryRaw `
    SELECT 
      DATE("placedAt") as date,
      SUM("totalAmount")::float as total,
      COUNT(*)::int as count
    FROM "Order"
    WHERE "placedAt" >= ${startDate}
      AND "placedAt" <= ${endDate}
      AND "paymentStatus" = 'COMPLETED'
    GROUP BY DATE("placedAt")
    ORDER BY date ASC
  `;
    return {
        totalSales: sales._sum.totalAmount || 0,
        totalOrders: sales._count,
        averageOrderValue: sales._count > 0
            ? Math.round(((sales._sum.totalAmount || 0) / sales._count) * 100) / 100
            : 0,
        period: { startDate, endDate },
        dailyBreakdown: dailySales,
    };
};
export const getProductAnalytics = async () => {
    const [statusCounts, topRated, mostOrdered] = await Promise.all([
        prisma.product.groupBy({
            by: ["status"],
            _count: true,
        }),
        prisma.productReview.groupBy({
            by: ["productId"],
            _avg: { rating: true },
            _count: true,
            having: { rating: { _count: { gte: 3 } } },
            orderBy: { _avg: { rating: "desc" } },
            take: 10,
        }),
        prisma.orderItem.groupBy({
            by: ["productId"],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 10,
        }),
    ]);
    // Enrich with product names
    const allProductIds = [
        ...new Set([
            ...topRated.map((r) => r.productId),
            ...mostOrdered.map((o) => o.productId),
        ]),
    ];
    const products = await prisma.product.findMany({
        where: { id: { in: allProductIds } },
        select: { id: true, name: true, slug: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return {
        statusBreakdown: statusCounts.map((s) => ({
            status: s.status,
            count: s._count,
        })),
        topRated: topRated.map((r) => ({
            product: productMap.get(r.productId),
            averageRating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : 0,
            reviewCount: r._count,
        })),
        mostOrdered: mostOrdered.map((o) => ({
            product: productMap.get(o.productId),
            totalQuantity: o._sum.quantity,
        })),
    };
};
export const getCustomerAnalytics = async () => {
    const [totalCustomers, activeCustomers, topCustomersBySpend] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.order.groupBy({
            by: ["customerId"],
            where: { paymentStatus: "COMPLETED" },
            _sum: { totalAmount: true },
            _count: true,
            orderBy: { _sum: { totalAmount: "desc" } },
            take: 10,
        }),
    ]);
    const customerIds = topCustomersBySpend.map((c) => c.customerId);
    const customers = await prisma.user.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        topCustomers: topCustomersBySpend.map((c) => ({
            customer: customerMap.get(c.customerId),
            totalSpent: c._sum.totalAmount || 0,
            totalOrders: c._count,
        })),
    };
};
export const getRevenueAnalytics = async (query) => {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [categoryRevenue, collectionRevenue, topProducts] = await Promise.all([
        prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: {
                    placedAt: { gte: startDate, lte: endDate },
                    paymentStatus: "COMPLETED",
                },
            },
            _sum: { total: true },
            _count: true,
        }),
        prisma.product.groupBy({
            by: ["brand"],
            _count: true,
        }),
        prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                order: {
                    placedAt: { gte: startDate, lte: endDate },
                    paymentStatus: "COMPLETED",
                },
            },
            _sum: { total: true, quantity: true },
            orderBy: { _sum: { total: "desc" } },
            take: 10,
        }),
    ]);
    return {
        period: { startDate, endDate },
        revenueByProductCount: categoryRevenue.length,
        collectionBreakdown: collectionRevenue,
        topProducts,
    };
};
export const getInventoryAnalytics = async () => {
    const [totalVariants, lowStockItems, outOfStockItems, stockValue] = await Promise.all([
        prisma.inventory.count(),
        inventoryRepository.findLowStock(50),
        inventoryRepository.findOutOfStock(50),
        prisma.inventory.aggregate({
            _sum: { stockQuantity: true, availableStock: true },
        }),
    ]);
    return {
        totalVariants,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        totalStockQuantity: stockValue._sum.stockQuantity || 0,
        totalAvailableStock: stockValue._sum.availableStock || 0,
        lowStockItems,
        outOfStockItems,
    };
};
export const getConversionFunnel = async () => {
    const [users, carts, orders, paidOrders] = await Promise.all([
        prisma.user.count(),
        prisma.cart.count({ where: { totalItems: { gt: 0 } } }),
        prisma.order.count(),
        prisma.order.count({ where: { paymentStatus: "COMPLETED" } }),
    ]);
    return {
        visitors: users,
        carts,
        orders,
        paidOrders,
        cartToOrderRate: carts ? (orders / carts) * 100 : 0,
        orderToPaidRate: orders ? (paidOrders / orders) * 100 : 0,
    };
};
export const getAbandonedCarts = async () => {
    const carts = await prisma.cart.findMany({
        where: {
            totalItems: { gt: 0 },
            customer: { orders: { none: {} } },
        },
        include: {
            customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
    });
    return {
        count: carts.length,
        carts,
    };
};
export const getRefundAnalytics = async () => {
    const grouped = await prisma.refund.groupBy({
        by: ["refundStatus"],
        _count: true,
        _sum: { refundAmount: true },
    });
    return {
        byStatus: grouped.map((row) => ({
            status: row.refundStatus,
            count: row._count,
            amount: row._sum.refundAmount || 0,
        })),
    };
};
export const getShippingPerformance = async () => {
    const grouped = await prisma.shipment.groupBy({
        by: ["shippingStatus"],
        _count: true,
    });
    return {
        byStatus: grouped.map((row) => ({
            status: row.shippingStatus,
            count: row._count,
        })),
    };
};
export const getCohorts = async () => {
    const cohorts = await prisma.$queryRaw `
    SELECT
      TO_CHAR(DATE_TRUNC('month', u."createdAt"), 'YYYY-MM') AS cohort_month,
      COUNT(DISTINCT u."id")::int AS users_count,
      COUNT(o."id")::int AS total_orders
    FROM "User" u
    LEFT JOIN "Order" o ON o."customerId" = u."id"
    GROUP BY DATE_TRUNC('month', u."createdAt")
    ORDER BY DATE_TRUNC('month', u."createdAt") DESC
    LIMIT 12
  `;
    return { cohorts };
};
