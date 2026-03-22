import { Request, Response, NextFunction } from "express";
import * as svc from "../services/activity-log.service.js";

/** GET /admin/activity-logs */
export const listActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.listActivityLogs({
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
      adminId: req.query.adminId as string,
      entityType: req.query.entityType as string,
      action: req.query.action as never,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/activity-logs/export */
export const exportActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.exportActivityLogs({
      adminId: req.query.adminId as string,
      entityType: req.query.entityType as string,
      action: req.query.action as never,
    });
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
