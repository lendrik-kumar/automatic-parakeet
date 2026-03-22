import { shippingRepository } from "../repositories/shipping.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
export class ShippingError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ShippingError";
    }
}
// ── Shipping Methods ──────────────────────────────────────────────────────────
export const createMethod = async (adminId, data) => {
    const existing = await shippingRepository.findAllMethods();
    if (existing.some((method) => method.name === data.name)) {
        throw new ShippingError(409, "Shipping method with this name already exists");
    }
    const method = await shippingRepository.createMethod(data);
    await adminRepository.logActivity(adminId, "CREATE", "ShippingMethod", method.id);
    return method;
};
export const listMethods = () => shippingRepository.findAllMethods();
export const updateMethod = async (adminId, id, data) => {
    const existing = await shippingRepository.findMethodById(id);
    if (!existing)
        throw new ShippingError(404, "Shipping method not found");
    const method = await shippingRepository.updateMethod(id, data);
    await adminRepository.logActivity(adminId, "UPDATE", "ShippingMethod", id);
    return method;
};
export const deleteMethod = async (adminId, id) => {
    const existing = await shippingRepository.findMethodById(id);
    if (!existing)
        throw new ShippingError(404, "Shipping method not found");
    await shippingRepository.deleteMethod(id);
    await adminRepository.logActivity(adminId, "DELETE", "ShippingMethod", id);
};
// ── Shipments ─────────────────────────────────────────────────────────────────
export const createShipment = async (adminId, orderId, data) => {
    const order = await orderRepository.findById(orderId);
    if (!order)
        throw new ShippingError(404, "Order not found");
    const shipment = await shippingRepository.createShipment({
        orderId,
        ...data,
    });
    // Auto update order status to SHIPPED if applicable
    if (order.orderStatus === "PROCESSING" || order.orderStatus === "CONFIRMED") {
        await orderRepository.updateStatus(orderId, "SHIPPED");
    }
    await adminRepository.logActivity(adminId, "CREATE", "Shipment", shipment.id);
    return shipment;
};
export const updateShipmentStatus = async (adminId, shipmentId, status) => {
    const shipment = await shippingRepository.findShipmentById(shipmentId);
    if (!shipment)
        throw new ShippingError(404, "Shipment not found");
    const extra = {};
    if (status === "IN_TRANSIT" || status === "PICKED_UP")
        extra.shippedAt = new Date();
    if (status === "DELIVERED") {
        extra.deliveredAt = new Date();
        // Update order status
        await orderRepository.updateStatus(shipment.orderId, "DELIVERED");
    }
    const updated = await shippingRepository.updateShipmentStatus(shipmentId, status, extra);
    await adminRepository.logActivity(adminId, "UPDATE", "Shipment", shipmentId);
    return updated;
};
export const listShipments = async (page = 1, limit = 20, search) => {
    const skip = (page - 1) * limit;
    const [shipments, total] = await shippingRepository.findShipments(skip, limit, search);
    return {
        shipments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getShipment = async (shipmentId) => {
    const shipment = await shippingRepository.findShipmentById(shipmentId);
    if (!shipment)
        throw new ShippingError(404, "Shipment not found");
    return shipment;
};
