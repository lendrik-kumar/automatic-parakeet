import { z } from "zod";
import * as svc from "../services/role.service.js";
import { RoleError } from "../services/role.service.js";
const handleError = (res, error) => {
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
    if (error instanceof RoleError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[RoleController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
// ─── Zod Schemas ──────────────────────────────────────────────────────────────
const createRoleSchema = z.object({
    roleName: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
});
const updateRoleSchema = createRoleSchema.partial();
// ─── Handlers ─────────────────────────────────────────────────────────────────
/** GET /admin/roles */
export const listRoles = async (req, res) => {
    try {
        const roles = await svc.listRoles();
        res.status(200).json({ success: true, data: { roles } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/roles */
export const createRole = async (req, res) => {
    try {
        const data = createRoleSchema.parse(req.body);
        const role = await svc.createRole(req.admin.id, data);
        res.status(201).json({
            success: true,
            message: "Role created",
            data: { role },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/roles/:roleId */
export const getRole = async (req, res) => {
    try {
        const role = await svc.getRole(req.params.roleId);
        res.status(200).json({ success: true, data: { role } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PUT /admin/roles/:roleId */
export const updateRole = async (req, res) => {
    try {
        const data = updateRoleSchema.parse(req.body);
        const role = await svc.updateRole(req.admin.id, req.params.roleId, data);
        res.status(200).json({
            success: true,
            message: "Role updated",
            data: { role },
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/roles/:roleId */
export const deleteRole = async (req, res) => {
    try {
        await svc.deleteRole(req.admin.id, req.params.roleId);
        res.status(200).json({ success: true, message: "Role deleted" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/roles/:roleId/admins */
export const getRoleAdmins = async (req, res) => {
    try {
        const result = await svc.getRoleAdmins(req.params.roleId);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
