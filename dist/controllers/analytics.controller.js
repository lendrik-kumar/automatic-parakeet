import * as analyticsService from "../services/analytics.service.js";
const handleError = (res, err) => {
    console.error(err);
    return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
};
export const dashboard = async (_req, res) => {
    try {
        const data = await analyticsService.getDashboard();
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
export const salesAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        const data = await analyticsService.getSalesAnalytics({
            startDate,
            endDate,
            period,
        });
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
export const productAnalytics = async (_req, res) => {
    try {
        const data = await analyticsService.getProductAnalytics();
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
export const customerAnalytics = async (_req, res) => {
    try {
        const data = await analyticsService.getCustomerAnalytics();
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
export const revenueAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await analyticsService.getRevenueAnalytics({ startDate, endDate });
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
export const inventoryAnalytics = async (_req, res) => {
    try {
        const data = await analyticsService.getInventoryAnalytics();
        return res.json({ success: true, data });
    }
    catch (err) {
        return handleError(res, err);
    }
};
