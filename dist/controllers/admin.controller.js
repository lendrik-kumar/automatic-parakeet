import { z } from "zod";
import * as svc from "../services/admin-auth.service.js";
import { AdminAuthError, extractRequestInfo, } from "../services/admin-auth.service.js";
// ─── Zod Schemas ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});
const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});
// ─── Error Handler Helper ────────────────────────────────────────────────────────────────
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
    if (error instanceof AdminAuthError) {
        res
            .status(error.statusCode)
            .json({ success: false, message: error.message });
        return;
    }
    console.error("[AdminController]", error);
    res.status(500).json({ success: false, message: "Internal server error" });
};
// ─── Auth Handlers ────────────────────────────────────────────────────────────────
/** POST /admin/auth/login */
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const info = extractRequestInfo(req);
        const result = await svc.adminLogin(email, password, info);
        res
            .status(200)
            .json({ success: true, message: "Login successful", data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/auth/logout */
export const adminLogout = async (req, res) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        await svc.adminLogout(req.admin?.id, refreshToken);
        res.status(200).json({ success: true, message: "Logged out successfully" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/auth/logout/all */
export const adminLogoutAll = async (req, res) => {
    try {
        if (!req.admin) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        await svc.adminLogoutAll(req.admin.id);
        res
            .status(200)
            .json({ success: true, message: "Logged out from all devices" });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** POST /admin/auth/refresh */
export const adminRefreshToken = async (req, res) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        const result = await svc.adminRefreshToken(refreshToken);
        res
            .status(200)
            .json({
            success: true,
            message: "Token refreshed successfully",
            data: result,
        });
    }
    catch (e) {
        handleError(res, e);
    }
};
// ─── Profile & Session Handlers ─────────────────────────────────────────────────────────
/** GET /admin/auth/me */
export const getCurrentAdmin = async (req, res) => {
    try {
        if (!req.admin) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const admin = await svc.getCurrentAdmin(req.admin.id);
        if (!admin) {
            res.status(404).json({ success: false, message: "Admin not found" });
            return;
        }
        const { passwordHash: _ph, ...adminResponse } = admin;
        void _ph;
        res.status(200).json({ success: true, data: { admin: adminResponse } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/auth/sessions */
export const listAdminSessions = async (req, res) => {
    try {
        if (!req.admin) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const sessions = await svc.listAdminSessions(req.admin.id);
        res.status(200).json({ success: true, data: { sessions } });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** GET /admin/auth/activity-logs */
export const getAdminActivityLogs = async (req, res) => {
    try {
        if (!req.admin) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const result = await svc.getAdminActivityLogs(req.admin.id, page, limit);
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        handleError(res, e);
    }
};
/** DELETE /admin/auth/sessions/:sessionId */
export const revokeAdminSession = async (req, res) => {
    try {
        if (!req.admin) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        await svc.revokeAdminSession(req.params.sessionId, req.admin.id);
        res
            .status(200)
            .json({ success: true, message: "Session revoked successfully" });
    }
    catch (e) {
        handleError(res, e);
    }
};
