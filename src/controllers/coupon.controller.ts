import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "../services/coupon.service.js";

const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  minimumOrderValue: z.number().positive().optional(),
  maximumDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  startDate: z.string(),
  expiryDate: z.string(),
});

const updateCouponSchema = createCouponSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
});

const couponStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]),
});

const validateCouponSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().positive(),
});

// ── Admin ─────────────────────────────────────────────────────────────────────

/** POST /admin/coupons */
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = createCouponSchema.parse(req.body);
    const coupon = await svc.createCoupon(req.admin!.id, data);
    res
      .status(201)
      .json({ success: true, message: "Coupon created", data: { coupon } });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/coupons */
export const listCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.listCoupons(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/coupons/:couponId */
export const getCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupon = await svc.getCoupon(req.params.couponId);
    res.status(200).json({ success: true, data: { coupon } });
  } catch (e) {
    next(e);
  }
};

/** PATCH /admin/coupons/:couponId */
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = updateCouponSchema.parse(req.body);
    const coupon = await svc.updateCoupon(
      req.admin!.id,
      req.params.couponId,
      data,
    );
    res
      .status(200)
      .json({ success: true, message: "Coupon updated", data: { coupon } });
  } catch (e) {
    next(e);
  }
};

/** DELETE /admin/coupons/:couponId */
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await svc.deleteCoupon(req.admin!.id, req.params.couponId);
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (e) {
    next(e);
  }
};

/** PATCH /admin/coupons/:couponId/status */
export const updateCouponStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = couponStatusSchema.parse(req.body);
    const coupon = await svc.updateCouponStatus(
      req.admin!.id,
      req.params.couponId,
      status,
    );
    res
      .status(200)
      .json({ success: true, message: "Coupon status updated", data: { coupon } });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/coupons/:couponId/usage */
export const getCouponUsageStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await svc.getCouponUsageStats(req.params.couponId);
    res.status(200).json({ success: true, data: { stats } });
  } catch (e) {
    next(e);
  }
};

// ── Client ────────────────────────────────────────────────────────────────────

/** POST /coupons/validate */
export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code, orderTotal } = validateCouponSchema.parse(req.body);
    const result = await svc.validateCoupon(code, orderTotal);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
