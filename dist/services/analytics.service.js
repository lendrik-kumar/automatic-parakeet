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
