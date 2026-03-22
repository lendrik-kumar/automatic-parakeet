import { refundRepository } from "../repositories/refund.repository.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type { RefundStatus } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";

export class RefundError extends AppError {}

/** POST /admin/refunds */
export const createRefund = async (
  adminId: string,
  data: {
    paymentId: string;
    orderId: string;
    refundAmount: number;
    refundReason: string;
  },
) => {
  const payment = await paymentRepository.findById(data.paymentId);
  if (!payment) throw new RefundError(404, "Payment not found");
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
export const updateRefundStatus = async (
  adminId: string,
  refundId: string,
  status: RefundStatus,
) => {
  const refund = await refundRepository.findById(refundId);
  if (!refund) throw new RefundError(404, "Refund not found");

  const extra: { processedAt?: Date } = {};
  if (status === "COMPLETED") extra.processedAt = new Date();

  const updated = await refundRepository.updateStatus(refundId, status, extra);
  await adminRepository.logActivity(adminId, "UPDATE", "Refund", refundId);
  return updated;
};

export const listRefunds = async (
  page = 1,
  limit = 20,
  status?: RefundStatus,
  search?: string,
  startDate?: string,
  endDate?: string,
) => {
  const skip = (page - 1) * limit;
  const [refunds, total] = await refundRepository.findManyAdvanced(skip, limit, {
    status,
    search,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
  return {
    refunds,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getRefund = async (refundId: string) => {
  const refund = await refundRepository.findById(refundId);
  if (!refund) throw new RefundError(404, "Refund not found");
  return refund;
};

export const bulkProcessRefunds = async (
  adminId: string,
  refundIds: string[],
  status: RefundStatus,
) => {
  if (!refundIds.length) throw new RefundError(400, "Refund IDs are required");

  const result = await refundRepository.bulkUpdateStatus(refundIds, status);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "Refund",
    "bulk-process",
  );
  return result;
};

export const getRefundAnalytics = async () => {
  const grouped = await refundRepository.aggregateByStatus();

  return {
    byStatus: grouped.map((row) => ({
      status: row.refundStatus,
      count: row._count._all,
      amount: row._sum.refundAmount ?? 0,
    })),
    totalCount: grouped.reduce((sum, row) => sum + row._count._all, 0),
    totalAmount: grouped.reduce((sum, row) => sum + (row._sum.refundAmount ?? 0), 0),
  };
};

export const retryRefund = async (adminId: string, refundId: string) => {
  const refund = await refundRepository.findById(refundId);
  if (!refund) throw new RefundError(404, "Refund not found");
  if (refund.refundStatus !== "FAILED") {
    throw new RefundError(400, "Only failed refunds can be retried");
  }

  const updated = await refundRepository.updateStatus(refundId, "PROCESSING");
  await adminRepository.logActivity(adminId, "UPDATE", "Refund", refundId);
  return updated;
};

export const exportRefunds = async (filters?: {
  status?: RefundStatus;
  startDate?: string;
  endDate?: string;
}) => {
  const rows = await refundRepository.findForExport({
    status: filters?.status,
    startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
  });

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order.orderNumber,
    customerEmail: row.order.customer.email,
    transactionId: row.payment.transactionId,
    amount: row.refundAmount,
    reason: row.refundReason,
    status: row.refundStatus,
    createdAt: row.createdAt,
    processedAt: row.processedAt,
  }));
};
