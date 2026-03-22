import { returnRepository } from "../repositories/return.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type { ReturnStatus } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";

export class ReturnError extends AppError {}

/** POST /orders/:orderId/returns */
export const createReturn = async (
  userId: string,
  orderId: string,
  data: {
    reason: string;
    items: { orderItemId: string; quantity: number }[];
  },
) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new ReturnError(404, "Order not found");
  if (order.customerId !== userId) throw new ReturnError(403, "Not your order");
  if (order.orderStatus !== "DELIVERED") {
    throw new ReturnError(
      400,
      "Returns can only be requested for delivered orders",
    );
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
export const listUserReturns = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [returns, total] = await returnRepository.findByCustomer(
    userId,
    skip,
    limit,
  );
  return {
    returns,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUserReturnById = async (userId: string, returnId: string) => {
  const returnReq = await returnRepository.findById(returnId);
  if (!returnReq) throw new ReturnError(404, "Return request not found");
  if (returnReq.customerId !== userId) {
    throw new ReturnError(403, "Not your return request");
  }
  return returnReq;
};

export const cancelUserReturn = async (userId: string, returnId: string) => {
  const returnReq = await returnRepository.findById(returnId);
  if (!returnReq) throw new ReturnError(404, "Return request not found");
  if (returnReq.customerId !== userId) {
    throw new ReturnError(403, "Not your return request");
  }
  if (returnReq.returnStatus !== "PENDING") {
    throw new ReturnError(400, "Only pending return requests can be cancelled");
  }

  return returnRepository.updateStatus(returnId, "REJECTED");
};

export const getReturnTimeline = async (userId: string, returnId: string) => {
  const returnReq = await getUserReturnById(userId, returnId);
  const timeline = [
    {
      key: "REQUESTED",
      at: returnReq.requestedAt,
      status: "Return requested",
    },
    {
      key: "CURRENT_STATUS",
      at: returnReq.updatedAt,
      status: `Current status: ${returnReq.returnStatus}`,
    },
  ];

  return {
    returnId: returnReq.id,
    currentStatus: returnReq.returnStatus,
    timeline,
  };
};

/** GET /admin/returns */
export const listAdminReturns = async (
  page = 1,
  limit = 20,
  status?: ReturnStatus,
  search?: string,
  startDate?: string,
  endDate?: string,
) => {
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

export const getAdminReturn = async (returnId: string) => {
  const returnReq = await returnRepository.findById(returnId);
  if (!returnReq) throw new ReturnError(404, "Return request not found");
  return returnReq;
};

/** PATCH /admin/returns/:returnId */
export const updateReturnStatus = async (
  adminId: string,
  returnId: string,
  status: ReturnStatus,
) => {
  const returnReq = await returnRepository.findById(returnId);
  if (!returnReq) throw new ReturnError(404, "Return request not found");

  // If approved, restock items
  if (status === "APPROVED" || status === "RECEIVED") {
    for (const item of returnReq.items) {
      const orderItem = returnReq.order.items.find(
        (oi) => oi.id === item.orderItemId,
      );
      if (orderItem) {
        await inventoryRepository.restockItem(
          orderItem.variantId,
          item.quantity,
        );
      }
    }
  }

  const updated = await returnRepository.updateStatus(returnId, status);
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ReturnRequest",
    returnId,
  );
  return updated;
};

export const bulkApproveReturns = async (adminId: string, returnIds: string[]) => {
  if (!returnIds.length) throw new ReturnError(400, "Return IDs are required");

  const result = await returnRepository.bulkUpdateStatus(returnIds, "APPROVED");
  await adminRepository.logActivity(
    adminId,
    "UPDATE",
    "ReturnRequest",
    "bulk-approve",
  );
  return result;
};

export const getReturnAnalytics = async () => {
  const grouped = await returnRepository.aggregateByStatus();
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const byStatus = grouped.map((row) => ({
    status: row.returnStatus,
    count: row._count._all,
  }));

  return {
    total,
    byStatus,
  };
};

export const bulkProcessReturns = async (
  adminId: string,
  returnIds: string[],
  status: ReturnStatus,
) => {
  if (!returnIds.length) {
    throw new ReturnError(400, "Return IDs are required");
  }

  const result = await returnRepository.bulkUpdateStatus(returnIds, status);
  await adminRepository.logActivity(adminId, "UPDATE", "ReturnRequest", "bulk-process");
  return result;
};

export const exportReturns = async (filters?: {
  status?: ReturnStatus;
  startDate?: string;
  endDate?: string;
}) => {
  const rows = await returnRepository.findForExport({
    status: filters?.status,
    startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
  });

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order.orderNumber,
    customerEmail: row.customer.email,
    reason: row.reason,
    status: row.returnStatus,
    itemCount: row.items.length,
    requestedAt: row.requestedAt,
    updatedAt: row.updatedAt,
  }));
};

export const listReturnReasons = async () => ({
  reasons: [
    "Product is defective",
    "Wrong size/fit",
    "Color differs from pictures",
    "Changed my mind",
    "Arrived too late",
    "Quality not as expected",
  ],
});
