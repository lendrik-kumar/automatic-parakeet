import router from "express";
import { adminLogin, adminLogout, adminLogoutAll, adminRefreshToken, getCurrentAdmin, listAdminSessions, getAdminActivityLogs, revokeAdminSession, } from "../controllers/admin.controller.js";
import { adminCreateProduct, adminListProducts, adminGetProduct, adminUpdateProduct, adminDeleteProduct, adminUpdateProductStatus, adminBulkUpdateProductStatus, adminBulkToggleFeatured, adminBulkToggleNewArrival, adminBulkUpdateProductPrices, adminProductAnalytics, adminCreateVariant, adminUpdateVariant, adminDeleteVariant, adminAddImages, adminDeleteImage, adminUpdateSpecification, adminCreateSizeGuide, adminDeleteSizeGuide, } from "../controllers/product.controller.js";
import { listInventory, getInventory, updateInventory, bulkUpdateInventory, getInventoryAlerts, } from "../controllers/inventory.controller.js";
import { adminListOrders, adminSearchOrders, adminGetOrder, adminGetOrderTimeline, adminUpdateOrderStatus, adminBulkUpdateOrderStatus, } from "../controllers/order.controller.js";
import { createMethod, listMethods, updateMethod, deleteMethod, listShipments, getShipment, createShipment, updateShipmentStatus, } from "../controllers/shipping.controller.js";
import { createCoupon, listCoupons, getCoupon, updateCoupon, updateCouponStatus, getCouponUsageStats, deleteCoupon, } from "../controllers/coupon.controller.js";
import { adminListReturns, adminGetReturn, adminBulkApproveReturns, adminUpdateReturn, } from "../controllers/return.controller.js";
import { createRefund, getRefund, bulkProcessRefunds, updateRefundStatus, listRefunds, } from "../controllers/refund.controller.js";
import { adminDeleteReview, adminListReviews, adminApproveReview, adminRejectReview, adminFlagReview, adminBulkApproveReviews, adminBulkRejectReviews, adminBulkDeleteReviews, adminReviewStats, } from "../controllers/review.controller.js";
import { listUsers, getUser, updateUser, updateUserStatus, bulkUpdateUserStatus, resetUserPassword, getUserOrders, getUserReviews, getUserAddresses, getUserActivity, } from "../controllers/user-management.controller.js";
import { listAdmins, createAdmin, getAdmin, updateAdmin, updateAdminStatus, deleteAdmin, } from "../controllers/admin-management.controller.js";
import { listActivityLogs, exportActivityLogs, } from "../controllers/activity-log.controller.js";
import { dashboard, salesAnalytics, productAnalytics, customerAnalytics, revenueAnalytics, inventoryAnalytics, } from "../controllers/analytics.controller.js";
import { listCollections, createCollection, getCollection, updateCollection, deleteCollection, updateCollectionStatus, reorderCollections, getCollectionProducts, getCollectionStats, } from "../controllers/collection.controller.js";
import { listCategories, getCategoryTree, createCategory, getCategory, updateCategory, deleteCategory, updateCategoryStatus, reorderCategories, getCategorySubcategories, getCategoryProducts, getCategoryStats, } from "../controllers/category.controller.js";
import { listRoles, createRole, getRole, updateRole, deleteRole, getRoleAdmins, } from "../controllers/role.controller.js";
import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { authLimiter, generalLimiter, } from "../middlewares/rateLimiter.middleware.js";
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
adminRouter.delete("/auth/sessions/:sessionId", authenticateAdmin, revokeAdminSession);
// ─── Products ─────────────────────────────────────────────────────────────────
adminRouter.post("/products", authenticateAdmin, generalLimiter, adminCreateProduct);
adminRouter.get("/products", authenticateAdmin, generalLimiter, adminListProducts);
adminRouter.get("/products/analytics", authenticateAdmin, generalLimiter, adminProductAnalytics);
adminRouter.post("/products/bulk/status", authenticateAdmin, generalLimiter, adminBulkUpdateProductStatus);
adminRouter.post("/products/bulk/feature", authenticateAdmin, generalLimiter, adminBulkToggleFeatured);
adminRouter.post("/products/bulk/new-arrival", authenticateAdmin, generalLimiter, adminBulkToggleNewArrival);
adminRouter.post("/products/bulk/prices", authenticateAdmin, generalLimiter, adminBulkUpdateProductPrices);
adminRouter.get("/products/:productId", authenticateAdmin, generalLimiter, adminGetProduct);
adminRouter.put("/products/:productId", authenticateAdmin, generalLimiter, adminUpdateProduct);
adminRouter.delete("/products/:productId", authenticateAdmin, generalLimiter, adminDeleteProduct);
adminRouter.patch("/products/:productId/status", authenticateAdmin, generalLimiter, adminUpdateProductStatus);
// ─── Product Variants ─────────────────────────────────────────────────────────
adminRouter.post("/products/:productId/variants", authenticateAdmin, generalLimiter, adminCreateVariant);
adminRouter.put("/products/:productId/variants/:variantId", authenticateAdmin, generalLimiter, adminUpdateVariant);
adminRouter.delete("/products/:productId/variants/:variantId", authenticateAdmin, generalLimiter, adminDeleteVariant);
// ─── Product Images ───────────────────────────────────────────────────────────
adminRouter.post("/products/:productId/images", authenticateAdmin, generalLimiter, adminAddImages);
adminRouter.delete("/products/:productId/images/:imageId", authenticateAdmin, generalLimiter, adminDeleteImage);
// ─── Product Specifications ───────────────────────────────────────────────────
adminRouter.put("/products/:productId/specification", authenticateAdmin, generalLimiter, adminUpdateSpecification);
// ─── Product Size Guides ──────────────────────────────────────────────────────
adminRouter.post("/products/:productId/size-guides", authenticateAdmin, generalLimiter, adminCreateSizeGuide);
adminRouter.delete("/products/:productId/size-guides/:guideId", authenticateAdmin, generalLimiter, adminDeleteSizeGuide);
// ─── Inventory ────────────────────────────────────────────────────────────────
adminRouter.get("/inventory", authenticateAdmin, generalLimiter, listInventory);
adminRouter.get("/inventory/alerts", authenticateAdmin, generalLimiter, getInventoryAlerts);
adminRouter.post("/inventory/bulk/update", authenticateAdmin, generalLimiter, bulkUpdateInventory);
adminRouter.get("/inventory/:variantId", authenticateAdmin, generalLimiter, getInventory);
adminRouter.put("/inventory/:variantId", authenticateAdmin, generalLimiter, updateInventory);
// ─── Orders ───────────────────────────────────────────────────────────────────
adminRouter.get("/orders/search", authenticateAdmin, generalLimiter, adminSearchOrders);
adminRouter.get("/orders", authenticateAdmin, generalLimiter, adminListOrders);
adminRouter.post("/orders/bulk/status", authenticateAdmin, generalLimiter, adminBulkUpdateOrderStatus);
adminRouter.get("/orders/:orderId", authenticateAdmin, generalLimiter, adminGetOrder);
adminRouter.get("/orders/:orderId/timeline", authenticateAdmin, generalLimiter, adminGetOrderTimeline);
adminRouter.patch("/orders/:orderId/status", authenticateAdmin, generalLimiter, adminUpdateOrderStatus);
// ─── Shipping Methods ─────────────────────────────────────────────────────────
adminRouter.post("/shipping/methods", authenticateAdmin, generalLimiter, createMethod);
adminRouter.get("/shipping/methods", authenticateAdmin, generalLimiter, listMethods);
adminRouter.put("/shipping/methods/:methodId", authenticateAdmin, generalLimiter, updateMethod);
adminRouter.delete("/shipping/methods/:methodId", authenticateAdmin, generalLimiter, deleteMethod);
// ─── Shipments ────────────────────────────────────────────────────────────────
adminRouter.get("/shipping/shipments", authenticateAdmin, generalLimiter, listShipments);
adminRouter.post("/shipping/shipments", authenticateAdmin, generalLimiter, createShipment);
adminRouter.get("/shipping/shipments/:shipmentId", authenticateAdmin, generalLimiter, getShipment);
adminRouter.patch("/shipping/shipments/:shipmentId", authenticateAdmin, generalLimiter, updateShipmentStatus);
// ─── Coupons ──────────────────────────────────────────────────────────────────
adminRouter.post("/coupons", authenticateAdmin, generalLimiter, createCoupon);
adminRouter.get("/coupons", authenticateAdmin, generalLimiter, listCoupons);
adminRouter.get("/coupons/:couponId", authenticateAdmin, generalLimiter, getCoupon);
adminRouter.put("/coupons/:couponId", authenticateAdmin, generalLimiter, updateCoupon);
adminRouter.patch("/coupons/:couponId/status", authenticateAdmin, generalLimiter, updateCouponStatus);
adminRouter.get("/coupons/:couponId/usage", authenticateAdmin, generalLimiter, getCouponUsageStats);
adminRouter.delete("/coupons/:couponId", authenticateAdmin, generalLimiter, deleteCoupon);
// ─── Returns ──────────────────────────────────────────────────────────────────
adminRouter.get("/returns", authenticateAdmin, generalLimiter, adminListReturns);
adminRouter.get("/returns/:returnId", authenticateAdmin, generalLimiter, adminGetReturn);
adminRouter.post("/returns/bulk/approve", authenticateAdmin, generalLimiter, adminBulkApproveReturns);
adminRouter.patch("/returns/:returnId", authenticateAdmin, generalLimiter, adminUpdateReturn);
// ─── Refunds ──────────────────────────────────────────────────────────────────
adminRouter.post("/refunds", authenticateAdmin, generalLimiter, createRefund);
adminRouter.get("/refunds/:refundId", authenticateAdmin, generalLimiter, getRefund);
adminRouter.patch("/refunds/:refundId", authenticateAdmin, generalLimiter, updateRefundStatus);
adminRouter.get("/refunds", authenticateAdmin, generalLimiter, listRefunds);
adminRouter.post("/refunds/bulk/process", authenticateAdmin, generalLimiter, bulkProcessRefunds);
// ─── Reviews Moderation ───────────────────────────────────────────────────────
adminRouter.get("/reviews/stats", authenticateAdmin, generalLimiter, adminReviewStats);
adminRouter.get("/reviews", authenticateAdmin, generalLimiter, adminListReviews);
adminRouter.patch("/reviews/:reviewId/approve", authenticateAdmin, generalLimiter, adminApproveReview);
adminRouter.patch("/reviews/:reviewId/reject", authenticateAdmin, generalLimiter, adminRejectReview);
adminRouter.patch("/reviews/:reviewId/flag", authenticateAdmin, generalLimiter, adminFlagReview);
adminRouter.post("/reviews/bulk/approve", authenticateAdmin, generalLimiter, adminBulkApproveReviews);
adminRouter.post("/reviews/bulk/reject", authenticateAdmin, generalLimiter, adminBulkRejectReviews);
adminRouter.post("/reviews/bulk/delete", authenticateAdmin, generalLimiter, adminBulkDeleteReviews);
adminRouter.delete("/reviews/:reviewId", authenticateAdmin, generalLimiter, adminDeleteReview);
// ─── User Management ─────────────────────────────────────────────────────────
adminRouter.get("/users", authenticateAdmin, generalLimiter, listUsers);
adminRouter.post("/users/bulk/status", authenticateAdmin, generalLimiter, bulkUpdateUserStatus);
adminRouter.get("/users/:userId", authenticateAdmin, generalLimiter, getUser);
adminRouter.put("/users/:userId", authenticateAdmin, generalLimiter, updateUser);
adminRouter.patch("/users/:userId/status", authenticateAdmin, generalLimiter, updateUserStatus);
adminRouter.post("/users/:userId/reset-password", authenticateAdmin, generalLimiter, resetUserPassword);
adminRouter.get("/users/:userId/orders", authenticateAdmin, generalLimiter, getUserOrders);
adminRouter.get("/users/:userId/reviews", authenticateAdmin, generalLimiter, getUserReviews);
adminRouter.get("/users/:userId/addresses", authenticateAdmin, generalLimiter, getUserAddresses);
adminRouter.get("/users/:userId/activity", authenticateAdmin, generalLimiter, getUserActivity);
// ─── Admin Management ────────────────────────────────────────────────────────
adminRouter.get("/admins", authenticateAdmin, generalLimiter, listAdmins);
adminRouter.post("/admins", authenticateAdmin, generalLimiter, createAdmin);
adminRouter.get("/admins/:adminId", authenticateAdmin, generalLimiter, getAdmin);
adminRouter.put("/admins/:adminId", authenticateAdmin, generalLimiter, updateAdmin);
adminRouter.patch("/admins/:adminId/status", authenticateAdmin, generalLimiter, updateAdminStatus);
adminRouter.delete("/admins/:adminId", authenticateAdmin, generalLimiter, deleteAdmin);
// ─── Role Management ───────────────────────────────────────────────────────────
adminRouter.get("/roles", authenticateAdmin, generalLimiter, listRoles);
adminRouter.post("/roles", authenticateAdmin, generalLimiter, createRole);
adminRouter.get("/roles/:roleId", authenticateAdmin, generalLimiter, getRole);
adminRouter.get("/roles/:roleId/admins", authenticateAdmin, generalLimiter, getRoleAdmins);
adminRouter.put("/roles/:roleId", authenticateAdmin, generalLimiter, updateRole);
adminRouter.delete("/roles/:roleId", authenticateAdmin, generalLimiter, deleteRole);
// ─── Collections ───────────────────────────────────────────────────────────────
adminRouter.get("/collections", authenticateAdmin, generalLimiter, listCollections);
adminRouter.post("/collections", authenticateAdmin, generalLimiter, createCollection);
adminRouter.post("/collections/reorder", authenticateAdmin, generalLimiter, reorderCollections);
adminRouter.get("/collections/:collectionId", authenticateAdmin, generalLimiter, getCollection);
adminRouter.put("/collections/:collectionId", authenticateAdmin, generalLimiter, updateCollection);
adminRouter.delete("/collections/:collectionId", authenticateAdmin, generalLimiter, deleteCollection);
adminRouter.patch("/collections/:collectionId/status", authenticateAdmin, generalLimiter, updateCollectionStatus);
adminRouter.get("/collections/:collectionId/products", authenticateAdmin, generalLimiter, getCollectionProducts);
adminRouter.get("/collections/:collectionId/stats", authenticateAdmin, generalLimiter, getCollectionStats);
// ─── Categories ────────────────────────────────────────────────────────────────
adminRouter.get("/categories", authenticateAdmin, generalLimiter, listCategories);
adminRouter.get("/categories/tree", authenticateAdmin, generalLimiter, getCategoryTree);
adminRouter.post("/categories", authenticateAdmin, generalLimiter, createCategory);
adminRouter.post("/categories/reorder", authenticateAdmin, generalLimiter, reorderCategories);
adminRouter.get("/categories/:categoryId", authenticateAdmin, generalLimiter, getCategory);
adminRouter.put("/categories/:categoryId", authenticateAdmin, generalLimiter, updateCategory);
adminRouter.delete("/categories/:categoryId", authenticateAdmin, generalLimiter, deleteCategory);
adminRouter.patch("/categories/:categoryId/status", authenticateAdmin, generalLimiter, updateCategoryStatus);
adminRouter.get("/categories/:categoryId/subcategories", authenticateAdmin, generalLimiter, getCategorySubcategories);
adminRouter.get("/categories/:categoryId/products", authenticateAdmin, generalLimiter, getCategoryProducts);
adminRouter.get("/categories/:categoryId/stats", authenticateAdmin, generalLimiter, getCategoryStats);
// ─── Activity Logs ───────────────────────────────────────────────────────────
adminRouter.get("/activity-logs/export", authenticateAdmin, generalLimiter, exportActivityLogs);
adminRouter.get("/activity-logs", authenticateAdmin, generalLimiter, listActivityLogs);
// ─── Analytics ────────────────────────────────────────────────────────────────
adminRouter.get("/analytics/dashboard", authenticateAdmin, generalLimiter, dashboard);
adminRouter.get("/analytics/sales", authenticateAdmin, generalLimiter, salesAnalytics);
adminRouter.get("/analytics/products", authenticateAdmin, generalLimiter, productAnalytics);
adminRouter.get("/analytics/customers", authenticateAdmin, generalLimiter, customerAnalytics);
adminRouter.get("/analytics/revenue", authenticateAdmin, generalLimiter, revenueAnalytics);
adminRouter.get("/analytics/inventory", authenticateAdmin, generalLimiter, inventoryAnalytics);
export default adminRouter;
