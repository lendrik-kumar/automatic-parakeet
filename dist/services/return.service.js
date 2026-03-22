import { returnRepository } from "../repositories/return.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
export class ReturnError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ReturnError";
    }
}
/** POST /orders/:orderId/returns */
export const createReturn = async (userId, orderId, data) => {
    const order = await orderRepository.findById(orderId);
    if (!order)
        throw new ReturnError(404, "Order not found");
    if (order.customerId !== userId)
        throw new ReturnError(403, "Not your order");
    if (order.orderStatus !== "DELIVERED") {
        throw new ReturnError(400, "Returns can only be requested for delivered orders");
    }
    const returnReq = await returnRepository.create({
        orderId,
        customerId: userId,
        reason: data.reason,
    });
    // Create return items
    for (const item of data.items) {
        const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
        if (!orderItem)
            throw new ReturnError(400, `Order item ${item.orderItemId} not found`);
        if (item.quantity > orderItem.quantity) {
            throw new ReturnError(400, `Cannot return more than ordered quantity`);
        }
        await returnRepository.createItem({
            returnId: returnReq.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            refundAmount: orderItem.price * item.quantity,
        });
    }
    return returnRepository.findById(returnReq.id);
};
/** GET /returns — user return requests */
export const listUserReturns = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const [returns, total] = await returnRepository.findByCustomer(userId, skip, limit);
    return {
        returns,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
/** GET /admin/returns */
export const listAdminReturns = async (page = 1, limit = 20, status, search, startDate, endDate) => {
    const skip = (page - 1) * limit;
    const [returns, total] = await returnRepository.findManyAdvanced(skip, limit, {
        status,
        search,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
    });
    return {
        returns,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
export const getAdminReturn = async (returnId) => {
    const returnReq = await returnRepository.findById(returnId);
    if (!returnReq)
        throw new ReturnError(404, "Return request not found");
    return returnReq;
};
/** PATCH /admin/returns/:returnId */
export const updateReturnStatus = async (adminId, returnId, status) => {
    const returnReq = await returnRepository.findById(returnId);
    if (!returnReq)
        throw new ReturnError(404, "Return request not found");
    // If approved, restock items
    if (status === "APPROVED" || status === "RECEIVED") {
        for (const item of returnReq.items) {
            const orderItem = returnReq.order.items.find((oi) => oi.id === item.orderItemId);
            if (orderItem) {
                await inventoryRepository.restockItem(orderItem.variantId, item.quantity);
            }
        }
    }
    const updated = await returnRepository.updateStatus(returnId, status);
    await adminRepository.logActivity(adminId, "UPDATE", "ReturnRequest", returnId);
    return updated;
};
export const bulkApproveReturns = async (adminId, returnIds) => {
    if (!returnIds.length)
        throw new ReturnError(400, "Return IDs are required");
    const result = await returnRepository.bulkUpdateStatus(returnIds, "APPROVED");
    await adminRepository.logActivity(adminId, "UPDATE", "ReturnRequest", "bulk-approve");
    return result;
};
