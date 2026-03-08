import router from "express";
import {
  adminLogin,
  adminLogout,
  adminRefreshToken,
  getCurrentAdmin,
  getAdminActivityLogs,
  revokeAdminSession,
} from "../controllers/admin.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";

const adminRouter = router.Router();

// Admin authentication routes
adminRouter.post("/auth/login", authLimiter, adminLogin);
adminRouter.post("/auth/logout", adminLogout);
adminRouter.post("/auth/refresh", adminRefreshToken);

// Protected admin routes (require authentication)
adminRouter.get("/auth/me", authenticateAdmin, getCurrentAdmin);
adminRouter.get("/auth/activity-logs", authenticateAdmin, getAdminActivityLogs);
adminRouter.delete(
  "/auth/sessions/:sessionId",
  authenticateAdmin,
  revokeAdminSession,
);

export default adminRouter;
