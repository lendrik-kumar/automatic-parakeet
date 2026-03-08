import router from "express";
import {
  adminLogin,
  adminLogout,
  adminLogoutAll,
  adminRefreshToken,
  getCurrentAdmin,
  listAdminSessions,
  getAdminActivityLogs,
  revokeAdminSession,
} from "../controllers/admin.controller.js";
import {
  adminCreateProduct,
  adminListProducts,
  adminGetProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminUpdateProductStatus,
  adminCreateVariant,
  adminUpdateVariant,
  adminDeleteVariant,
  adminAddImages,
  adminDeleteImage,
  adminUpdateSpecification,
  adminCreateSizeGuide,
  adminDeleteSizeGuide,
} from "../controllers/product.controller.js";
import {
  listInventory,
  getInventory,
  updateInventory,
} from "../controllers/inventory.controller.js";
import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
} from "../controllers/order.controller.js";
import {
  createMethod,
  listMethods,
  updateMethod,
  deleteMethod,
  createShipment,
  updateShipmentStatus,
} from "../controllers/shipping.controller.js";
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from "../controllers/coupon.controller.js";
import {
  adminListReturns,
  adminUpdateReturn,
} from "../controllers/return.controller.js";
import {
  createRefund,
  updateRefundStatus,
  listRefunds,
} from "../controllers/refund.controller.js";
import { adminDeleteReview } from "../controllers/review.controller.js";
import {
  listUsers,
  getUser,
  updateUserStatus,
} from "../controllers/user-management.controller.js";
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  updateAdminStatus,
} from "../controllers/admin-management.controller.js";
import { listActivityLogs } from "../controllers/activity-log.controller.js";
import {
  dashboard,
  salesAnalytics,
  productAnalytics,
} from "../controllers/analytics.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import {
  authLimiter,
  generalLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const adminRouter = router.Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
adminRouter.post("/auth/login", authLimiter, adminLogin);
adminRouter.post("/auth/logout", adminLogout);
adminRouter.post("/auth/logout/all", authenticateAdmin, adminLogoutAll);
adminRouter.post("/auth/refresh", adminRefreshToken);

// ─── Profile & Sessions ───────────────────────────────────────────────────────
adminRouter.get("/auth/me", authenticateAdmin, getCurrentAdmin);
adminRouter.get("/auth/sessions", authenticateAdmin, listAdminSessions);
adminRouter.get("/auth/activity-logs", authenticateAdmin, getAdminActivityLogs);
adminRouter.delete(
  "/auth/sessions/:sessionId",
  authenticateAdmin,
  revokeAdminSession,
);

// ─── Products ─────────────────────────────────────────────────────────────────
adminRouter.post(
  "/products",
  authenticateAdmin,
  generalLimiter,
  adminCreateProduct,
);
adminRouter.get(
  "/products",
  authenticateAdmin,
  generalLimiter,
  adminListProducts,
);
adminRouter.get(
  "/products/:productId",
  authenticateAdmin,
  generalLimiter,
  adminGetProduct,
);
adminRouter.put(
  "/products/:productId",
  authenticateAdmin,
  generalLimiter,
  adminUpdateProduct,
);
adminRouter.delete(
  "/products/:productId",
  authenticateAdmin,
  generalLimiter,
  adminDeleteProduct,
);
adminRouter.patch(
  "/products/:productId/status",
  authenticateAdmin,
  generalLimiter,
  adminUpdateProductStatus,
);

// ─── Product Variants ─────────────────────────────────────────────────────────
adminRouter.post(
  "/products/:productId/variants",
  authenticateAdmin,
  generalLimiter,
  adminCreateVariant,
);
adminRouter.put(
  "/products/:productId/variants/:variantId",
  authenticateAdmin,
  generalLimiter,
  adminUpdateVariant,
);
adminRouter.delete(
  "/products/:productId/variants/:variantId",
  authenticateAdmin,
  generalLimiter,
  adminDeleteVariant,
);

// ─── Product Images ───────────────────────────────────────────────────────────
adminRouter.post(
  "/products/:productId/images",
  authenticateAdmin,
  generalLimiter,
  adminAddImages,
);
adminRouter.delete(
  "/products/:productId/images/:imageId",
  authenticateAdmin,
  generalLimiter,
  adminDeleteImage,
);

// ─── Product Specifications ───────────────────────────────────────────────────
adminRouter.put(
  "/products/:productId/specification",
  authenticateAdmin,
  generalLimiter,
  adminUpdateSpecification,
);

// ─── Product Size Guides ──────────────────────────────────────────────────────
adminRouter.post(
  "/products/:productId/size-guides",
  authenticateAdmin,
  generalLimiter,
  adminCreateSizeGuide,
);
adminRouter.delete(
  "/products/:productId/size-guides/:guideId",
  authenticateAdmin,
  generalLimiter,
  adminDeleteSizeGuide,
);

// ─── Inventory ────────────────────────────────────────────────────────────────
adminRouter.get("/inventory", authenticateAdmin, generalLimiter, listInventory);
adminRouter.get(
  "/inventory/:variantId",
  authenticateAdmin,
  generalLimiter,
  getInventory,
);
adminRouter.put(
  "/inventory/:variantId",
  authenticateAdmin,
  generalLimiter,
  updateInventory,
);

// ─── Orders ───────────────────────────────────────────────────────────────────
adminRouter.get("/orders", authenticateAdmin, generalLimiter, adminListOrders);
adminRouter.get(
  "/orders/:orderId",
  authenticateAdmin,
  generalLimiter,
  adminGetOrder,
);
adminRouter.patch(
  "/orders/:orderId/status",
  authenticateAdmin,
  generalLimiter,
  adminUpdateOrderStatus,
);

// ─── Shipping Methods ─────────────────────────────────────────────────────────
adminRouter.post(
  "/shipping/methods",
  authenticateAdmin,
  generalLimiter,
  createMethod,
);
adminRouter.get(
  "/shipping/methods",
  authenticateAdmin,
  generalLimiter,
  listMethods,
);
adminRouter.put(
  "/shipping/methods/:methodId",
  authenticateAdmin,
  generalLimiter,
  updateMethod,
);
adminRouter.delete(
  "/shipping/methods/:methodId",
  authenticateAdmin,
  generalLimiter,
  deleteMethod,
);

// ─── Shipments ────────────────────────────────────────────────────────────────
adminRouter.post(
  "/shipping/shipments",
  authenticateAdmin,
  generalLimiter,
  createShipment,
);
adminRouter.patch(
  "/shipping/shipments/:shipmentId",
  authenticateAdmin,
  generalLimiter,
  updateShipmentStatus,
);

// ─── Coupons ──────────────────────────────────────────────────────────────────
adminRouter.post("/coupons", authenticateAdmin, generalLimiter, createCoupon);
adminRouter.get("/coupons", authenticateAdmin, generalLimiter, listCoupons);
adminRouter.put(
  "/coupons/:couponId",
  authenticateAdmin,
  generalLimiter,
  updateCoupon,
);
adminRouter.delete(
  "/coupons/:couponId",
  authenticateAdmin,
  generalLimiter,
  deleteCoupon,
);

// ─── Returns ──────────────────────────────────────────────────────────────────
adminRouter.get(
  "/returns",
  authenticateAdmin,
  generalLimiter,
  adminListReturns,
);
adminRouter.patch(
  "/returns/:returnId",
  authenticateAdmin,
  generalLimiter,
  adminUpdateReturn,
);

// ─── Refunds ──────────────────────────────────────────────────────────────────
adminRouter.post("/refunds", authenticateAdmin, generalLimiter, createRefund);
adminRouter.patch(
  "/refunds/:refundId",
  authenticateAdmin,
  generalLimiter,
  updateRefundStatus,
);
adminRouter.get("/refunds", authenticateAdmin, generalLimiter, listRefunds);

// ─── Reviews Moderation ───────────────────────────────────────────────────────
adminRouter.delete(
  "/reviews/:reviewId",
  authenticateAdmin,
  generalLimiter,
  adminDeleteReview,
);

// ─── User Management ─────────────────────────────────────────────────────────
adminRouter.get("/users", authenticateAdmin, generalLimiter, listUsers);
adminRouter.get("/users/:userId", authenticateAdmin, generalLimiter, getUser);
adminRouter.patch(
  "/users/:userId/status",
  authenticateAdmin,
  generalLimiter,
  updateUserStatus,
);

// ─── Admin Management ────────────────────────────────────────────────────────
adminRouter.get("/admins", authenticateAdmin, generalLimiter, listAdmins);
adminRouter.post("/admins", authenticateAdmin, generalLimiter, createAdmin);
adminRouter.put(
  "/admins/:adminId",
  authenticateAdmin,
  generalLimiter,
  updateAdmin,
);
adminRouter.patch(
  "/admins/:adminId/status",
  authenticateAdmin,
  generalLimiter,
  updateAdminStatus,
);

// ─── Activity Logs ───────────────────────────────────────────────────────────
adminRouter.get(
  "/activity-logs",
  authenticateAdmin,
  generalLimiter,
  listActivityLogs,
);

// ─── Analytics ────────────────────────────────────────────────────────────────
adminRouter.get(
  "/analytics/dashboard",
  authenticateAdmin,
  generalLimiter,
  dashboard,
);
adminRouter.get(
  "/analytics/sales",
  authenticateAdmin,
  generalLimiter,
  salesAnalytics,
);
adminRouter.get(
  "/analytics/products",
  authenticateAdmin,
  generalLimiter,
  productAnalytics,
);

export default adminRouter;
