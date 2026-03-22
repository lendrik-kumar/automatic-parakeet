import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "../services/refund.service.js";


const createRefundSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  refundAmount: z.number().positive(),
  refundReason: z.string().min(1),
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
});

const bulkRefundSchema = z.object({
  refundIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
});

const exportQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/** POST /admin/refunds */
export const createRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = createRefundSchema.parse(req.body);
    const refund = await svc.createRefund(req.admin!.id, data);
    res
      .status(201)
      .json({ success: true, message: "Refund created", data: { refund } });
  } catch (e) {
    next(e);
  }
};

/** PATCH /admin/refunds/:refundId */
export const updateRefundStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const refund = await svc.updateRefundStatus(
      req.admin!.id,
      req.params.refundId,
      status,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Refund status updated",
        data: { refund },
      });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/refunds */
export const listRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.listRefunds(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
      req.query.status as never,
      req.query.search as string,
      req.query.startDate as string,
      req.query.endDate as string,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/refunds/:refundId */
export const getRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refund = await svc.getRefund(req.params.refundId);
    res.status(200).json({ success: true, data: { refund } });
  } catch (e) {
    next(e);
  }
};

/** POST /admin/refunds/bulk/process */
export const bulkProcessRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refundIds, status } = bulkRefundSchema.parse(req.body);
    const result = await svc.bulkProcessRefunds(req.admin!.id, refundIds, status);
    res.status(200).json({
      success: true,
      message: "Refunds processed",
      data: { updatedCount: result.count },
    });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/refunds/analytics */
export const refundAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const analytics = await svc.getRefundAnalytics();
    res.status(200).json({ success: true, data: analytics });
  } catch (e) {
    next(e);
  }
};

/** POST /admin/refunds/:refundId/retry */
export const retryRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refund = await svc.retryRefund(req.admin!.id, req.params.refundId);
    res.status(200).json({
      success: true,
      message: "Refund retry initiated",
      data: { refund },
    });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/refunds/export */
export const exportRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters = exportQuerySchema.parse(req.query);
    const rows = await svc.exportRefunds(filters);
    res.status(200).json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    next(e);
  }
};
