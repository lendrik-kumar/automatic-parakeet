import { z } from "zod";
import * as svc from "../services/user-management.service.js";
import { UserManagementError } from "../services/user-management.service.js";
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
    if (error instanceof UserManagementError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[UserManagementController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
const statusSchema = z.object({
    status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});
/** GET /admin/users */
export const listUsers = async (req, res) => {
    try {
        const result = await svc.listUsers(Number(req.query.page) || 1, Number(req.query.limit) || 20, req.query.search, req.query.status);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/users/:userId */
export const getUser = async (req, res) => {
    try {
        const user = await svc.getUser(req.params.userId);
        res.status(200).json({ success: true, data: { user } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** PATCH /admin/users/:userId/status */
export const updateUserStatus = async (req, res) => {
    try {
        const { status } = statusSchema.parse(req.body);
        const user = await svc.updateUserStatus(req.admin.id, req.params.userId, status);
        res
            .status(200)
            .json({ success: true, message: "User status updated", data: { user } });
    }
    catch (e) {
        handleError(res, e);
    }
};
