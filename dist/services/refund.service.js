import { refundRepository } from "../repositories/refund.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
export class RefundError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "RefundError";
    }
}
/** POST /admin/refunds */
export const createRefund = async (adminId, data) => {
    const payment = await paymentRepository.findById(data.paymentId);
    if (!payment)
        throw new RefundError(404, "Payment not found");
    if (payment.paymentStatus !== "COMPLETED") {
        throw new RefundError(400, "Can only refund completed payments");
    }
    const refund = await refundRepository.create(data);
    // Update payment status to REFUNDED
    await paymentRepository.updateStatus(data.paymentId, "REFUNDED");
    await orderRepository.updatePaymentStatus(data.orderId, "REFUNDED");
    await adminRepository.logActivity(adminId, "CREATE", "Refund", refund.id);
    return refundRepository.findById(refund.id);
};
/** PATCH /admin/refunds/:refundId */
export const updateRefundStatus = async (adminId, refundId, status) => {
    const refund = await refundRepository.findById(refundId);
    if (!refund)
        throw new RefundError(404, "Refund not found");
    const extra = {};
    if (status === "COMPLETED")
        extra.processedAt = new Date();
    const updated = await refundRepository.updateStatus(refundId, status, extra);
    await adminRepository.logActivity(adminId, "UPDATE", "Refund", refundId);
    return updated;
};
export const listRefunds = async (page = 1, limit = 20, status) => {
    const skip = (page - 1) * limit;
    const where = {};
    if (status)
        where.refundStatus = status;
    const [refunds, total] = await refundRepository.findMany(skip, limit, where);
    return {
        refunds,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};
