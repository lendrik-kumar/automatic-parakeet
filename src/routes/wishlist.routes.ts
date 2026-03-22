import router from "express";
import {
  getWishlist,
  addItem,
  removeItem,
  moveToCart,
  clearWishlist,
  checkItemInWishlist,
  addMultipleItems,
} from "../controllers/wishlist.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const wishlistRouter = router.Router();

wishlistRouter.use(authenticateUser);
wishlistRouter.use(generalLimiter);

// ─── Core Operations ────────────────────────────────────────────────────────
wishlistRouter.get("/", getWishlist);
wishlistRouter.delete("/", clearWishlist);

// ─── Item Operations ────────────────────────────────────────────────────────
wishlistRouter.post("/items", addItem);
wishlistRouter.post("/items/bulk", addMultipleItems);
wishlistRouter.delete("/items/:itemId", removeItem);

// ─── Actions ────────────────────────────────────────────────────────────────
wishlistRouter.post("/items/:itemId/move-to-cart", moveToCart);

// ─── Utility ────────────────────────────────────────────────────────────────
wishlistRouter.get("/check/:productId", checkItemInWishlist);

export default wishlistRouter;
