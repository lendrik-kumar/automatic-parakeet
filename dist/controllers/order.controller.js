import { z } from "zod";
import * as svc from "../services/order.service.js";
const checkoutSchema = z.object({
    cartId: z.string().uuid(),
    addressId: z.string().uuid(),
    couponCode: z.string().optional(),
    paymentMethod: z.enum([
        "CREDIT_CARD",
        "DEBIT_CARD",
        "NET_BANKING",
        "WALLET",
        "UPI",
        "COD",
    ]),
    shippingMethod: z.string().min(1),
});
const validateCheckoutSchema = z.object({
    addressId: z.string().uuid("Invalid address ID"),
    couponCode: z.string().optional(),
});
const createOrderSchema = z.object({
    addressId: z.string().uuid("Invalid address ID"),
    couponCode: z.string().optional(),
    shippingMethod: z.string().optional(),
});
const processPaymentSchema = z.object({
    paymentMethod: z.enum([
        "CREDIT_CARD",
        "DEBIT_CARD",
        "NET_BANKING",
        "WALLET",
        "UPI",
        "COD",
    ]),
});
const statusSchema = z.object({
    status: z.enum([
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
    ]),
});
const bulkStatusSchema = z.object({
    orderIds: z.array(z.string().uuid()).min(1),
    status: z.enum([
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
    ]),
});
const updateOrderAddressSchema = z.object({
    addressId: z.string().uuid("Invalid address ID"),
});
const assignCourierSchema = z.object({
    orderIds: z.array(z.string().uuid()).min(1),
    courierName: z.string().min(1),
});
// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
/** POST /orders/checkout */
export const checkout = async (req, res, next) => {
    try {
        const data = checkoutSchema.parse(req.body);
        const result = await svc.checkout(req.user.id, data);
        res
            .status(201)
            .json({ success: true, message: "Order placed", data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /orders */
export const listOrders = async (req, res, next) => {
    try {
        const result = await svc.listUserOrders(req.user.id, Number(req.query.page) || 1, Number(req.query.limit) || 10);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /orders/stats */
export const getOrderStats = async (req, res, next) => {
    try {
        const stats = await svc.getUserOrderStats(req.user.id);
        res.status(200).json({ success: true, data: stats });
    }
    catch (e) {
        next(e);
    }
};
/** GET /orders/upcoming */
export const getUpcomingOrders = async (req, res, next) => {
    try {
        const orders = await svc.getUpcomingOrders(req.user.id);
        res.status(200).json({ success: true, data: { orders } });
    }
    catch (e) {
        next(e);
    }
};
/** GET /orders/:orderId */
export const getOrder = async (req, res, next) => {
    try {
        const order = await svc.getUserOrder(req.user.id, req.params.orderId);
        res.status(200).json({ success: true, data: { order } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /orders/:orderId/cancel */
export const cancelOrder = async (req, res, next) => {
    try {
        const order = await svc.cancelOrder(req.user.id, req.params.orderId);
        res
            .status(200)
            .json({ success: true, message: "Order cancelled", data: { order } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /orders/:orderId/address */
export const updateOrderAddress = async (req, res, next) => {
    try {
        const { addressId } = updateOrderAddressSchema.parse(req.body);
        const order = await svc.updateOrderAddress(req.user.id, req.params.orderId, addressId);
        res.status(200).json({
            success: true,
            message: "Order address updated",
            data: { order },
        });
    }
    catch (e) {
        next(e);
    }
};
// ─── New 3-Step Checkout Flow ────────────────────────────────────────────────
/** POST /orders/checkout/validate */
export const validateCheckout = async (req, res, next) => {
    try {
        const data = validateCheckoutSchema.parse(req.body);
        const result = await svc.validateCheckout(req.user.id, data);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** POST /orders/checkout/create */
export const createCheckoutOrder = async (req, res, next) => {
    try {
        const data = createOrderSchema.parse(req.body);
        const order = await svc.createCheckoutOrder(req.user.id, data);
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: { order },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /orders/checkout/pay */
export const processPayment = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const data = processPaymentSchema.parse(req.body);
        const paymentSession = await svc.processOrderPayment(req.user.id, orderId, data);
        res.status(200).json({
            success: true,
            message: "Payment initiated",
            data: paymentSession,
        });
    }
    catch (e) {
        next(e);
    }
};
// ─── Order Tracking & Actions ────────────────────────────────────────────────
/** GET /orders/:orderId/tracking */
export const getOrderTracking = async (req, res, next) => {
    try {
        const tracking = await svc.getOrderTracking(req.user.id, req.params.orderId);
        res.status(200).json({ success: true, data: tracking });
    }
    catch (e) {
        next(e);
    }
};
/** POST /orders/:orderId/reorder */
export const reorderOrder = async (req, res, next) => {
    try {
        const result = await svc.reorderFromOrder(req.user.id, req.params.orderId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /orders/:orderId/invoice */
export const getOrderInvoice = async (req, res, next) => {
    try {
        const invoice = await svc.generateOrderInvoice(req.user.id, req.params.orderId);
        res.status(200).json({ success: true, data: invoice });
    }
    catch (e) {
        next(e);
    }
};
// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
/** GET /admin/orders */
export const adminListOrders = async (req, res, next) => {
    try {
        const result = await svc.listAdminOrdersAdvanced({
            page: Number(req.query.page) || undefined,
            limit: Number(req.query.limit) || undefined,
            status: req.query.status,
            paymentStatus: req.query.paymentStatus,
            fulfillmentStatus: req.query.fulfillmentStatus,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            customerId: req.query.customerId,
            productId: req.query.productId,
            search: req.query.search,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/:orderId */
export const adminGetOrder = async (req, res, next) => {
    try {
        const order = await svc.getAdminOrder(req.params.orderId);
        res.status(200).json({ success: true, data: { order } });
    }
    catch (e) {
        next(e);
    }
};
/** PATCH /admin/orders/:orderId/status */
export const adminUpdateOrderStatus = async (req, res, next) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const order = await svc.updateOrderStatus(req.admin.id, req.params.orderId, status);
        res
            .status(200)
            .json({
            success: true,
            message: "Order status updated",
            data: { order },
        });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/orders/bulk/status */
export const adminBulkUpdateOrderStatus = async (req, res, next) => {
    try {
        const { orderIds, status } = bulkStatusSchema.parse(req.body);
        const result = await svc.bulkUpdateOrderStatus(req.admin.id, orderIds, status);
        res.status(200).json({
            success: true,
            message: "Order statuses updated",
            data: { updatedCount: result.count },
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/search */
export const adminSearchOrders = async (req, res, next) => {
    try {
        const query = req.query.q || "";
        const result = await svc.searchOrders(query, Number(req.query.page) || 1, Number(req.query.limit) || 20);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/:orderId/timeline */
export const adminGetOrderTimeline = async (req, res, next) => {
    try {
        const timeline = await svc.getOrderTimeline(req.params.orderId);
        res.status(200).json({ success: true, data: timeline });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/fulfillment-queue */
export const adminFulfillmentQueue = async (req, res, next) => {
    try {
        const result = await svc.getFulfillmentQueue(Number(req.query.page) || 1, Number(req.query.limit) || 20);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/delayed */
export const adminDelayedOrders = async (req, res, next) => {
    try {
        const orders = await svc.getDelayedOrders(Number(req.query.days) || 5);
        res.status(200).json({ success: true, data: { orders } });
    }
    catch (e) {
        next(e);
    }
};
/** POST /admin/orders/bulk/assign-courier */
export const adminBulkAssignCourier = async (req, res, next) => {
    try {
        const { orderIds, courierName } = assignCourierSchema.parse(req.body);
        const result = await svc.bulkAssignCourier(req.admin.id, orderIds, courierName);
        res.status(200).json({
            success: true,
            message: "Courier assigned",
            data: result,
        });
    }
    catch (e) {
        next(e);
    }
};
/** GET /admin/orders/export */
export const adminExportOrders = async (req, res, next) => {
    try {
        const rows = await svc.exportOrders(Number(req.query.page) || 1, Number(req.query.limit) || 100);
        res.status(200).json({ success: true, data: { rows, count: rows.length } });
    }
    catch (e) {
        next(e);
    }
};
