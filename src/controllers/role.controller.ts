import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as svc from "../services/role.service.js";


// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createRoleSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
});

const updateRoleSchema = createRoleSchema.partial();

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** GET /admin/roles */
export const listRoles = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roles = await svc.listRoles();
    res.status(200).json({ success: true, data: { roles } });
  } catch (e) {
    next(e);
  }
};

/** POST /admin/roles */
export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await svc.createRole(req.admin!.id, data);
    res.status(201).json({
      success: true,
      message: "Role created",
      data: { role },
    });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/roles/:roleId */
export const getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await svc.getRole(req.params.roleId);
    res.status(200).json({ success: true, data: { role } });
  } catch (e) {
    next(e);
  }
};

/** PUT /admin/roles/:roleId */
export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = updateRoleSchema.parse(req.body);
    const role = await svc.updateRole(req.admin!.id, req.params.roleId, data);
    res.status(200).json({
      success: true,
      message: "Role updated",
      data: { role },
    });
  } catch (e) {
    next(e);
  }
};

/** DELETE /admin/roles/:roleId */
export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await svc.deleteRole(req.admin!.id, req.params.roleId);
    res.status(200).json({ success: true, message: "Role deleted" });
  } catch (e) {
    next(e);
  }
};

/** GET /admin/roles/:roleId/admins */
export const getRoleAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await svc.getRoleAdmins(req.params.roleId);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
