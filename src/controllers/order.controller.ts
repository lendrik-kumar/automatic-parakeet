import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/order.service.js";
import { OrderError } from "../services/order.service.js";

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof z.ZodError) {
    res
      .status(400)
      .json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    return;
  }
  if (error instanceof OrderError) {
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
    return;
  }
  console.error("[OrderController]", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};

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

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /orders/checkout */
export const checkout = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = checkoutSchema.parse(req.body);
    const result = await svc.checkout(req.user!.id, data);
    res
      .status(201)
      .json({ success: true, message: "Order placed", data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /orders */
export const listOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listUserOrders(
      req.user!.id,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 10,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /orders/:orderId */
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await svc.getUserOrder(req.user!.id, req.params.orderId);
    res.status(200).json({ success: true, data: { order } });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /orders/:orderId/cancel */
export const cancelOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const order = await svc.cancelOrder(req.user!.id, req.params.orderId);
    res
      .status(200)
      .json({ success: true, message: "Order cancelled", data: { order } });
  } catch (e) {
    handleError(res, e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /admin/orders */
export const adminListOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listAdminOrders({
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
      status: req.query.status as never,
      paymentStatus: req.query.paymentStatus as string,
      search: req.query.search as string,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** GET /admin/orders/:orderId */
export const adminGetOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const order = await svc.getAdminOrder(req.params.orderId);
    res.status(200).json({ success: true, data: { order } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/orders/:orderId/status */
export const adminUpdateOrderStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const order = await svc.updateOrderStatus(
      req.admin!.id,
      req.params.orderId,
      status,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Order status updated",
        data: { order },
      });
  } catch (e) {
    handleError(res, e);
  }
};
