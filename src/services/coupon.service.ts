import { couponRepository } from "../repositories/coupon.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import type { CouponStatus, DiscountType } from "../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";

export class CouponError extends AppError {}

export const createCoupon = async (
  adminId: string,
  data: {
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    minimumOrderValue?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    startDate: string;
    expiryDate: string;
  },
) => {
  const existing = await couponRepository.findByCode(data.code);
  if (existing) throw new CouponError(409, "Coupon code already exists");

  const coupon = await couponRepository.create({
    ...data,
    startDate: new Date(data.startDate),
    expiryDate: new Date(data.expiryDate),
  });
  await adminRepository.logActivity(adminId, "CREATE", "Coupon", coupon.id);
  return coupon;
};

export const listCoupons = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [coupons, total] = await couponRepository.findMany(skip, limit);
  return {
    coupons,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getCoupon = async (couponId: string) => {
  const coupon = await couponRepository.findById(couponId);
  if (!coupon) throw new CouponError(404, "Coupon not found");
  return coupon;
};

export const updateCoupon = async (
  adminId: string,
  couponId: string,
  data: {
    code?: string;
    description?: string;
    discountType?: DiscountType;
    discountValue?: number;
    minimumOrderValue?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    startDate?: string;
    expiryDate?: string;
    status?: CouponStatus;
  },
) => {
  const existing = await couponRepository.findById(couponId);
  if (!existing) throw new CouponError(404, "Coupon not found");

  const updateData: Record<string, unknown> = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);

  const coupon = await couponRepository.update(couponId, updateData as never);
  await adminRepository.logActivity(adminId, "UPDATE", "Coupon", couponId);
  return coupon;
};

export const deleteCoupon = async (adminId: string, couponId: string) => {
  const existing = await couponRepository.findById(couponId);
  if (!existing) throw new CouponError(404, "Coupon not found");

  await couponRepository.delete(couponId);
  await adminRepository.logActivity(adminId, "DELETE", "Coupon", couponId);
};

export const updateCouponStatus = async (
  adminId: string,
  couponId: string,
  status: CouponStatus,
) => {
  const existing = await couponRepository.findById(couponId);
  if (!existing) throw new CouponError(404, "Coupon not found");

  const coupon = await couponRepository.updateStatus(couponId, status);
  await adminRepository.logActivity(adminId, "UPDATE", "Coupon", couponId);
  return coupon;
};

export const getCouponUsageStats = async (couponId: string) => {
  const stats = await couponRepository.usageStats(couponId);
  if (!stats) throw new CouponError(404, "Coupon not found");
  return stats;
};

/** POST /coupons/validate — client validates a coupon before checkout */
export const validateCoupon = async (code: string, orderTotal: number) => {
  const coupon = await couponRepository.findByCode(code);
  if (!coupon) throw new CouponError(404, "Coupon not found");
  if (coupon.status !== "ACTIVE")
    throw new CouponError(400, "Coupon is not active");
  if (coupon.expiryDate < new Date())
    throw new CouponError(400, "Coupon has expired");
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponError(400, "Coupon usage limit reached");
  }
  if (coupon.minimumOrderValue && orderTotal < coupon.minimumOrderValue) {
    throw new CouponError(
      400,
      `Minimum order value is $${coupon.minimumOrderValue}`,
    );
  }

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round(orderTotal * (coupon.discountValue / 100) * 100) / 100
      : coupon.discountValue;
  if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
    discount = coupon.maximumDiscount;
  }

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    calculatedDiscount: discount,
    newTotal: Math.round((orderTotal - discount) * 100) / 100,
  };
};
