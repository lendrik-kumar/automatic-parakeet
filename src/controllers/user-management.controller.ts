import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "../services/user-management.service.js";


const statusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(6).optional(),
  gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).optional(),
  dateOfBirth: z.string().optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
});

const bulkStatusSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});

/** GET /admin/users */
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await svc.listUsers(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
      req.query.search as string,
      req.query.status as never,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId */
export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await svc.getUser(req.params.userId);
    res.status(200).json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

/** PATCH /admin/users/:userId/status */
export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const user = await svc.updateUserStatus(
      req.admin!.id,
      req.params.userId,
      status,
    );
    res
      .status(200)
      .json({ success: true, message: "User status updated", data: { user } });
  } catch (e) {
    next(e);
  }
};

/** PUT /admin/users/:userId */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await svc.updateUserProfile(req.admin!.id, req.params.userId, {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    });
    res
      .status(200)
      .json({ success: true, message: "User updated", data: { user } });
  } catch (e) {
    next(e);
  }
};

/** POST /admin/users/:userId/reset-password */
export const resetUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.resetUserPassword(req.admin!.id, req.params.userId);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (e) {
    next(e);
  }
};

/** POST /admin/users/bulk/status */
export const bulkUpdateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userIds, status } = bulkStatusSchema.parse(req.body);
    const result = await svc.bulkUpdateUserStatus(req.admin!.id, userIds, status);
    res.status(200).json({
      success: true,
      message: "User statuses updated",
      data: { updatedCount: result.count },
    });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId/orders */
export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.getUserOrders(
      req.params.userId,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId/reviews */
export const getUserReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.getUserReviews(
      req.params.userId,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId/addresses */
export const getUserAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.getUserAddresses(req.params.userId);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId/activity */
export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.getUserActivity(
      req.params.userId,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/export */
export const exportUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await svc.exportUsers();
    res.status(200).json({ success: true, data: { users, count: users.length } });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/segments */
export const getUserSegments = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const segments = await svc.getUserSegments();
    res.status(200).json({ success: true, data: segments });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/stats */
export const getUserStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await svc.getUserStats();
    res.status(200).json({ success: true, data: stats });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/users/:userId/lifetime-value */
export const getUserLifetimeValue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const value = await svc.getUserLifetimeValue(req.params.userId);
    res.status(200).json({ success: true, data: value });
  } catch (e) {
    next(e);
  }
};
