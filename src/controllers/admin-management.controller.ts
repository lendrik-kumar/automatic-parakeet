import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/admin-management.service.js";
import { AdminManagementError } from "../services/admin-management.service.js";

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
  if (error instanceof AdminManagementError) {
    res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
    return;
  }
  console.error("[AdminManagementController]", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};

const createAdminSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  profileImage: z.string().url().optional(),
});

const updateAdminSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roleId: z.string().uuid().optional(),
  profileImage: z.string().url().optional(),
});

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

/** GET /admin/admins */
export const listAdmins = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await svc.listAdmins(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
    );
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    handleError(res, e);
  }
};

/** POST /admin/admins */
export const createAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = createAdminSchema.parse(req.body);
    const admin = await svc.createAdmin(req.admin!.id, data);
    res
      .status(201)
      .json({ success: true, message: "Admin created", data: { admin } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/admins/:adminId */
export const updateAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = updateAdminSchema.parse(req.body);
    const admin = await svc.updateAdmin(
      req.admin!.id,
      req.params.adminId,
      data,
    );
    res
      .status(200)
      .json({ success: true, message: "Admin updated", data: { admin } });
  } catch (e) {
    handleError(res, e);
  }
};

/** PATCH /admin/admins/:adminId/status */
export const updateAdminStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status } = statusSchema.parse(req.body);
    const admin = await svc.updateAdminStatus(
      req.admin!.id,
      req.params.adminId,
      status,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Admin status updated",
        data: { admin },
      });
  } catch (e) {
    handleError(res, e);
  }
};
