import * as svc from "../services/activity-log.service.js";
/** GET /admin/activity-logs */
export const listActivityLogs = async (req, res) => {
    try {
        const result = await svc.listActivityLogs({
            page: Number(req.query.page) || undefined,
            limit: Number(req.query.limit) || undefined,
            adminId: req.query.adminId,
            entityType: req.query.entityType,
            action: req.query.action,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (e) {
        console.error("[ActivityLogController]", e);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
