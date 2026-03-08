/**
 * Order Service
 *
 * Handles checkout flow, order management, and status transitions.
 */

import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { orderRepository } from "../repositories/order.repository.js";
import { cartRepository } from "../repositories/cart.repository.js";
import { inventoryRepository } from "../repositories/inventory.repository.js";
import { couponRepository } from "../repositories/coupon.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
} from "../generated/prisma/enums.js";

export class OrderError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

const generateOrderNumber = (): string => {
  const prefix = "ORD";
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ts}-${rand}`;
};

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const checkout = async (
  userId: string,
  data: {
    cartId: string;
    addressId: string;
    couponCode?: string;
    paymentMethod: PaymentMethod;
    shippingMethod: string;
  },
) => {
  // 1. Validate cart
  const cart = await cartRepository.getCartWithItems(data.cartId);
  if (!cart || cart.customerId !== userId)
    throw new OrderError(400, "Invalid cart");
  if (!cart.items.length) throw new OrderError(400, "Cart is empty");

  // 2. Validate inventory for each item
  for (const item of cart.items) {
    const inv = await inventoryRepository.findByVariantId(item.variantId);
    if (!inv || inv.availableStock + item.quantity < item.quantity) {
      throw new OrderError(400, `Insufficient stock for ${item.product.name}`);
    }
  }

  // 3. Get shipping method
  const shippingMethod = await prisma.shippingMethod.findUnique({
    where: { name: data.shippingMethod },
  });
  if (!shippingMethod) throw new OrderError(400, "Invalid shipping method");

  // 4. Calculate totals
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const shippingCost = shippingMethod.cost;
  let discountAmount = 0;

  // 5. Apply coupon
  if (data.couponCode) {
    const coupon = await couponRepository.findByCode(data.couponCode);
    if (!coupon) throw new OrderError(400, "Invalid coupon code");
    if (coupon.status !== "ACTIVE")
      throw new OrderError(400, "Coupon is not active");
    if (coupon.expiryDate < new Date())
      throw new OrderError(400, "Coupon has expired");
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new OrderError(400, "Coupon usage limit reached");
    }
    if (coupon.minimumOrderValue && subtotal < coupon.minimumOrderValue) {
      throw new OrderError(
        400,
        `Minimum order value is $${coupon.minimumOrderValue}`,
      );
    }

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount =
        Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }
    if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
      discountAmount = coupon.maximumDiscount;
    }

    // Increment usage count
    await couponRepository.incrementUsage(coupon.id);
  }

  const totalAmount =
    Math.round((subtotal + taxAmount + shippingCost - discountAmount) * 100) /
    100;

  // 6. Get address
  const address = await prisma.address.findUnique({
    where: { id: data.addressId },
  });
  if (!address || address.userId !== userId)
    throw new OrderError(400, "Invalid address");

  const addressSnapshot = JSON.stringify({
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    landmark: address.landmark,
  });

  // 7. Create order
  const order = await orderRepository.create({
    orderNumber: generateOrderNumber(),
    customerId: userId,
    subtotal,
    taxAmount,
    shippingCost,
    discountAmount,
    totalAmount,
  });

  // 8. Create order items snapshot
  for (const item of cart.items) {
    await orderRepository.createOrderItem({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.product.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.totalPrice,
    });
  }

  // 9. Create order address snapshot
  await orderRepository.createOrderAddress({
    orderId: order.id,
    shippingAddress: addressSnapshot,
    billingAddress: addressSnapshot,
  });

  // 10. Create payment record
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      paymentMethod: data.paymentMethod,
      paymentProvider: "RAZORPAY" as PaymentProvider,
      amount: totalAmount,
      paymentStatus: "PENDING",
    },
  });

  // 11. Stock is already reserved from cart — confirm it
  for (const item of cart.items) {
    await inventoryRepository.confirmStock(item.variantId, item.quantity);
  }

  // 12. Clear the cart
  await cartRepository.clearCart(cart.id);
  await cartRepository.updateCartTotals(cart.id);

  return {
    order: await orderRepository.findById(order.id),
    paymentSession: {
      paymentId: payment.id,
      amount: totalAmount,
      currency: "USD",
      status: payment.paymentStatus,
    },
  };
};

// ─── Client Order Endpoints ───────────────────────────────────────────────────

export const listUserOrders = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await orderRepository.findByCustomer(
    userId,
    skip,
    limit,
  );
  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUserOrder = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");
  return order;
};

export const cancelOrder = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");

  const cancellable: OrderStatus[] = ["PENDING", "CONFIRMED"];
  if (!cancellable.includes(order.orderStatus)) {
    throw new OrderError(400, "Order cannot be cancelled at this stage");
  }

  // Release stock for all items
  for (const item of order.items) {
    await inventoryRepository.restockItem(item.variantId, item.quantity);
  }

  await orderRepository.updateStatus(orderId, "CANCELLED");
  return orderRepository.findById(orderId);
};

// ─── Admin Order Endpoints ────────────────────────────────────────────────────

export const listAdminOrders = async (query: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: string;
  search?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) where.orderStatus = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { customer: { email: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await orderRepository.findMany({
    skip,
    take: limit,
    where,
  });
  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAdminOrder = async (orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  return order;
};

export const updateOrderStatus = async (
  adminId: string,
  orderId: string,
  status: OrderStatus,
) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");

  const validTransitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["RETURNED"],
    CANCELLED: [],
    RETURNED: [],
  };

  if (!validTransitions[order.orderStatus]?.includes(status)) {
    throw new OrderError(
      400,
      `Cannot transition from ${order.orderStatus} to ${status}`,
    );
  }

  // If cancelling, release stock
  if (status === "CANCELLED") {
    for (const item of order.items) {
      await inventoryRepository.restockItem(item.variantId, item.quantity);
    }
  }

  const updated = await orderRepository.updateStatus(orderId, status);
  await adminRepository.logActivity(adminId, "UPDATE", "Order", orderId);
  return updated;
};
