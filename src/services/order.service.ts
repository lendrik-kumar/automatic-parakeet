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
import { AppError } from "../utils/AppError.js";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
} from "../generated/prisma/enums.js";

export class OrderError extends AppError {}

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

// ─── New 3-Step Checkout Flow ───────────────────────────────────────────────

/**
 * Step 1: Validate checkout - Pre-flight checks
 */
export const validateCheckout = async (
  userId: string,
  data: {
    addressId: string;
    couponCode?: string;
  },
) => {
  // 1. Validate address
  const address = await prisma.address.findUnique({
    where: { id: data.addressId },
  });
  if (!address || address.userId !== userId) {
    throw new OrderError(400, "Invalid address");
  }

  // 2. Get user's cart
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart || !cart.items.length) {
    throw new OrderError(400, "Cart is empty");
  }

  // 3. Validate inventory for each item
  const stockIssues = [];
  for (const item of cart.items) {
    const inv = await inventoryRepository.findByVariantId(item.variantId);
    if (!inv || inv.availableStock < item.quantity) {
      stockIssues.push({
        productName: item.product.name,
        requestedQuantity: item.quantity,
        availableStock: inv?.availableStock || 0,
      });
    }
  }

  if (stockIssues.length > 0) {
    return {
      valid: false,
      message: "Some items are out of stock",
      stockIssues,
    };
  }

  // 4. Calculate totals
  const subtotal = cart.items.reduce(
    (sum: number, item) => sum + item.totalPrice,
    0,
  );
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const shippingCost = 10.0; // Default shipping, can be dynamic
  let discountAmount = 0;
  let couponDetails = null;

  // 5. Validate coupon if provided
  if (data.couponCode) {
    const coupon = await couponRepository.findByCode(data.couponCode);
    if (!coupon) {
      return { valid: false, message: "Invalid coupon code" };
    }
    if (coupon.status !== "ACTIVE") {
      return { valid: false, message: "Coupon is not active" };
    }
    if (coupon.expiryDate < new Date()) {
      return { valid: false, message: "Coupon has expired" };
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, message: "Coupon usage limit reached" };
    }
    if (coupon.minimumOrderValue && subtotal < coupon.minimumOrderValue) {
      return {
        valid: false,
        message: `Minimum order value is $${coupon.minimumOrderValue}`,
      };
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

    couponDetails = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    };
  }

  const totalAmount =
    Math.round((subtotal + taxAmount + shippingCost - discountAmount) * 100) /
    100;

  return {
    valid: true,
    message: "Checkout validation successful",
    summary: {
      subtotal,
      taxAmount,
      shippingCost,
      discountAmount,
      totalAmount,
      itemCount: cart.items.length,
    },
    coupon: couponDetails,
    address: {
      id: address.id,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    },
  };
};

/**
 * Step 2: Create order - Reserve stock and create order
 */
export const createCheckoutOrder = async (
  userId: string,
  data: {
    addressId: string;
    couponCode?: string;
    shippingMethod?: string;
  },
) => {
  // 1. Get cart
  const cart = await cartRepository.findByCustomerId(userId);
  if (!cart || !cart.items.length) {
    throw new OrderError(400, "Cart is empty");
  }

  // 2. Final inventory check
  for (const item of cart.items) {
    const inv = await inventoryRepository.findByVariantId(item.variantId);
    if (!inv || inv.availableStock < item.quantity) {
      throw new OrderError(400, `Insufficient stock for ${item.product.name}`);
    }
  }

  // 3. Get shipping method
  const shippingMethodName = data.shippingMethod || "Standard";
  const shippingMethod = await prisma.shippingMethod.findUnique({
    where: { name: shippingMethodName },
  });
  const shippingCost = shippingMethod?.cost || 10.0;

  // 4. Calculate totals
  const subtotal = cart.items.reduce(
    (sum: number, item) => sum + item.totalPrice,
    0,
  );
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  let discountAmount = 0;

  // 5. Apply coupon
  if (data.couponCode) {
    const coupon = await couponRepository.findByCode(data.couponCode);
    if (
      coupon &&
      coupon.status === "ACTIVE" &&
      coupon.expiryDate >= new Date()
    ) {
      if (coupon.discountType === "PERCENTAGE") {
        discountAmount =
          Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
      await couponRepository.incrementUsage(coupon.id);
    }
  }

  const totalAmount =
    Math.round((subtotal + taxAmount + shippingCost - discountAmount) * 100) /
    100;

  // 6. Get address
  const address = await prisma.address.findUnique({
    where: { id: data.addressId },
  });
  if (!address || address.userId !== userId) {
    throw new OrderError(400, "Invalid address");
  }

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

  // 7. Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: userId,
        subtotal,
        taxAmount,
        shippingCost,
        discountAmount,
        totalAmount,
      },
    });

    // Create order items
    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productNameSnapshot: item.product.name,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.totalPrice,
        },
      });
    }

    // Create order address
    await tx.orderAddress.create({
      data: {
        orderId: newOrder.id,
        shippingAddress: addressSnapshot,
        billingAddress: addressSnapshot,
      },
    });

    // Reserve stock
    for (const item of cart.items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: { availableStock: { decrement: item.quantity } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        totalItems: 0,
        totalPrice: 0,
        appliedDiscount: 0,
        appliedCouponId: null,
      },
    });

    return newOrder;
  });

  return await orderRepository.findById(order.id);
};

/**
 * Step 3: Process payment - Razorpay integration or COD handling
 */
export const processOrderPayment = async (
  userId: string,
  orderId: string,
  data: {
    paymentMethod: PaymentMethod;
  },
) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");

  // Check if payment already exists
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId },
  });

  if (existingPayment && existingPayment.paymentStatus === "COMPLETED") {
    throw new OrderError(400, "Order already paid");
  }

  // Handle COD separately (no Razorpay needed)
  if (data.paymentMethod === "COD") {
    const payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            paymentMethod: "COD",
            paymentProvider: "INTERNAL" as PaymentProvider,
            paymentStatus: "PENDING", // Will be COMPLETED on delivery
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: order.id,
            paymentMethod: "COD",
            paymentProvider: "INTERNAL" as PaymentProvider,
            amount: order.totalAmount,
            currency: order.currency,
            paymentStatus: "PENDING",
          },
        });

    // Mark order as CONFIRMED (no payment gateway needed)
    await orderRepository.updateStatus(orderId, "CONFIRMED");

    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: order.totalAmount,
      currency: order.currency,
      paymentMethod: "COD",
      status: "PENDING",
      message: "Order confirmed. Payment will be collected on delivery.",
    };
  }

  // For online payments: Create Razorpay order
  const { createRazorpayPaymentSession } = await import("./payment.service.js");

  // Detect currency (could be enhanced with geo-detection)
  const currency = (order.currency || "USD") as "USD" | "INR";

  // Get customer details
  const customer = order.customer;
  
  // Try to get phone from shipping address if available
  const shippingAddress = order.addresses?.shippingAddress 
    ? JSON.parse(order.addresses.shippingAddress)
    : null;
  const customerPhone = shippingAddress?.phoneNumber || "+1234567890"; // Default fallback

  // Create Razorpay payment session
  const paymentSession = await createRazorpayPaymentSession({
    orderId: order.id,
    amount: order.totalAmount,
    currency,
    customerDetails: {
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customerPhone,
    },
    orderNumber: order.orderNumber,
  });

  return {
    ...paymentSession,
    message: "Payment session created. Complete payment on Razorpay checkout.",
  };
};

// ─── Reorder Functionality ──────────────────────────────────────────────────

export const reorderFromOrder = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");

  // Get or create user's cart
  const cartData = await cartRepository.findByCustomerId(userId);
  const cart = cartData || (await cartRepository.findOrCreate(userId));

  // Add items from order to cart
  const addedItems = [];
  const unavailableItems = [];

  for (const orderItem of order.items) {
    // Check if product and variant still exist and are available
    const variant = await prisma.productVariant.findUnique({
      where: { id: orderItem.variantId },
      include: { product: true },
    });

    if (!variant || variant.product.status !== "ACTIVE") {
      unavailableItems.push({
        productName: orderItem.productNameSnapshot,
        reason: "Product no longer available",
      });
      continue;
    }

    // Check stock
    const inventory = await inventoryRepository.findByVariantId(variant.id);
    if (!inventory || inventory.availableStock < orderItem.quantity) {
      unavailableItems.push({
        productName: orderItem.productNameSnapshot,
        reason: "Insufficient stock",
        availableStock: inventory?.availableStock || 0,
      });
      continue;
    }

    // Check if item already in cart
    const existingItem = await cartRepository.findExistingItem(
      cart.id,
      orderItem.variantId,
      orderItem.size,
      orderItem.color,
    );

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + orderItem.quantity;
      const totalPrice = newQuantity * variant.price;
      await cartRepository.updateItemQuantity(
        existingItem.id,
        newQuantity,
        totalPrice,
      );
    } else {
      // Add new item
      await cartRepository.addItem({
        cartId: cart.id,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        size: orderItem.size,
        color: orderItem.color,
        quantity: orderItem.quantity,
        unitPrice: variant.price,
        totalPrice: orderItem.quantity * variant.price,
      });
    }

    addedItems.push({
      productName: variant.product.name,
      quantity: orderItem.quantity,
    });
  }

  // Recalculate cart totals
  await cartRepository.updateCartTotals(cart.id);

  return {
    message: "Items added to cart",
    addedItems,
    unavailableItems,
    cartId: cart.id,
  };
};

// ─── Order Tracking ─────────────────────────────────────────────────────────

export const getOrderTracking = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");

  const tracking = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    placedAt: order.placedAt,
    estimatedDelivery: null, // Add this field to schema if needed
    timeline: [
      {
        status: "ORDER_PLACED",
        timestamp: order.placedAt,
        completed: true,
        message: "Order placed successfully",
      },
      {
        status: "CONFIRMED",
        timestamp: order.orderStatus === "CONFIRMED" ? order.updatedAt : null,
        completed: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
          order.orderStatus,
        ),
        message: "Order confirmed and being prepared",
      },
      {
        status: "PROCESSING",
        timestamp: order.orderStatus === "PROCESSING" ? order.updatedAt : null,
        completed: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(
          order.orderStatus,
        ),
        message: "Order is being processed",
      },
      {
        status: "SHIPPED",
        timestamp:
          order.shipments[0]?.shippedAt ||
          (order.orderStatus === "SHIPPED" ? order.updatedAt : null),
        completed: ["SHIPPED", "DELIVERED"].includes(order.orderStatus),
        message: "Order has been shipped",
      },
      {
        status: "DELIVERED",
        timestamp:
          order.shipments[0]?.deliveredAt ||
          (order.orderStatus === "DELIVERED" ? order.updatedAt : null),
        completed: order.orderStatus === "DELIVERED",
        message: "Order delivered successfully",
      },
    ],
    shipments: order.shipments.map((s) => ({
      id: s.id,
      carrier: s.courierName,
      trackingNumber: s.trackingNumber,
      trackingUrl: s.trackingNumber
        ? `https://tracking.example.com/${s.trackingNumber}`
        : null,
      shippedAt: s.shippedAt,
      deliveredAt: s.deliveredAt,
      status: s.shippingStatus,
    })),
  };

  return tracking;
};

// ─── Invoice Generation ─────────────────────────────────────────────────────

export const generateOrderInvoice = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");

  // Parse address from snapshot
  const shippingAddress = order.addresses
    ? JSON.parse(order.addresses.shippingAddress)
    : null;

  // Generate invoice data (for now, return structured data)
  // In production, this would generate a PDF
  const invoice = {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    orderDate: order.placedAt,
    customer: {
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      email: order.customer.email,
    },
    shippingAddress,
    items: order.items.map((item) => ({
      name: item.productNameSnapshot,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
    })),
    summary: {
      subtotal: order.subtotal,
      tax: order.taxAmount,
      shipping: order.shippingCost,
      discount: order.discountAmount,
      total: order.totalAmount,
    },
    payment: {
      method: order.payments[0]?.paymentMethod || "N/A",
      status: order.payments[0]?.paymentStatus || "PENDING",
    },
  };

  return invoice;
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

export const getUserOrderStats = async (userId: string) => {
  const [orders] = await orderRepository.findByCustomer(userId, 0, 1000);
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const deliveredOrders = orders.filter((o) => o.orderStatus === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.orderStatus === "CANCELLED").length;

  return {
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    totalSpent,
    averageOrderValue: totalOrders ? totalSpent / totalOrders : 0,
  };
};

export const getUpcomingOrders = async (userId: string) => {
  const [orders] = await orderRepository.findByCustomer(userId, 0, 100);
  return orders.filter((order) =>
    ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.orderStatus),
  );
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

export const updateOrderAddress = async (
  userId: string,
  orderId: string,
  addressId: string,
) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");
  if (order.customerId !== userId) throw new OrderError(403, "Not your order");
  if (!["PENDING", "CONFIRMED", "PROCESSING"].includes(order.orderStatus)) {
    throw new OrderError(400, "Order address cannot be changed at this stage");
  }

  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new OrderError(400, "Invalid address");
  }

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

  await prisma.orderAddress.update({
    where: { orderId },
    data: {
      shippingAddress: addressSnapshot,
    },
  });

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

export const listAdminOrdersAdvanced = async (query: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  productId?: string;
  search?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [orders, total] = await orderRepository.findManyAdvanced({
    skip,
    take: limit,
    status: query.status,
    paymentStatus: query.paymentStatus,
    fulfillmentStatus: query.fulfillmentStatus,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    customerId: query.customerId,
    productId: query.productId,
    search: query.search,
  });

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const bulkUpdateOrderStatus = async (
  adminId: string,
  orderIds: string[],
  status: OrderStatus,
) => {
  if (!orderIds.length) throw new OrderError(400, "Order IDs are required");

  const result = await orderRepository.bulkUpdateStatus(orderIds, status);
  await adminRepository.logActivity(adminId, "UPDATE", "Order", "bulk-status");
  return result;
};

export const searchOrders = async (query: string, page = 1, limit = 20) => {
  if (!query.trim()) throw new OrderError(400, "Search query is required");

  const skip = (page - 1) * limit;
  const [orders, total] = await orderRepository.searchMany(query, skip, limit);

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getOrderTimeline = async (orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new OrderError(404, "Order not found");

  const timeline = [
    { event: "ORDER_PLACED", at: order.placedAt, status: order.orderStatus },
    ...order.payments
      .filter((p) => p.paidAt)
      .map((p) => ({
        event: "PAYMENT_COMPLETED",
        at: p.paidAt as Date,
        status: p.paymentStatus,
      })),
    ...order.shipments
      .filter((s) => s.shippedAt)
      .map((s) => ({
        event: "SHIPPED",
        at: s.shippedAt as Date,
        status: s.shippingStatus,
      })),
    ...order.shipments
      .filter((s) => s.deliveredAt)
      .map((s) => ({
        event: "DELIVERED",
        at: s.deliveredAt as Date,
        status: s.shippingStatus,
      })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return { orderId: order.id, orderNumber: order.orderNumber, timeline };
};

export const getFulfillmentQueue = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await orderRepository.findManyAdvanced({
    skip,
    take: limit,
    fulfillmentStatus: "PROCESSING",
  });

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getDelayedOrders = async (delayedDays = 5) => {
  const threshold = new Date(Date.now() - delayedDays * 24 * 60 * 60 * 1000);
  const [orders] = await orderRepository.findManyAdvanced({
    skip: 0,
    take: 200,
    fulfillmentStatus: "SHIPPED",
    endDate: threshold,
  });

  return orders;
};

export const bulkAssignCourier = async (
  adminId: string,
  orderIds: string[],
  courierName: string,
) => {
  if (!orderIds.length) throw new OrderError(400, "Order IDs are required");

  const result = await prisma.shipment.updateMany({
    where: { orderId: { in: orderIds } },
    data: { courierName },
  });

  await adminRepository.logActivity(adminId, "UPDATE", "Order", "bulk-assign-courier");

  return { updatedCount: result.count };
};

export const exportOrders = async (page = 1, limit = 100) => {
  const skip = (page - 1) * limit;
  const [orders] = await orderRepository.findManyAdvanced({
    skip,
    take: limit,
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customer.email,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    totalAmount: order.totalAmount,
    placedAt: order.placedAt,
  }));
};
