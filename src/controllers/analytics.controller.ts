import { Request, Response, NextFunction } from "express";
import * as analyticsService from "../services/analytics.service.js";


export const dashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getDashboard();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const salesAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, period } = req.query as {
      startDate?: string;
      endDate?: string;
      period?: "daily" | "weekly" | "monthly";
    };
    const data = await analyticsService.getSalesAnalytics({
      startDate,
      endDate,
      period,
    });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const productAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getProductAnalytics();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const customerAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getCustomerAnalytics();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const revenueAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const data = await analyticsService.getRevenueAnalytics({ startDate, endDate });
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const inventoryAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getInventoryAnalytics();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const conversionFunnelAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await analyticsService.getConversionFunnel();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const abandonedCartsAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await analyticsService.getAbandonedCarts();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const refundsAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getRefundAnalytics();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const shippingPerformanceAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await analyticsService.getShippingPerformance();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};

export const cohortsAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getCohorts();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
    return;
  }
};
