import router from "express";
import {
  getWishlist,
  addItem,
  removeItem,
  moveToCart,
} from "../controllers/wishlist.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const wishlistRouter = router.Router();

wishlistRouter.use(authenticateUser);
wishlistRouter.use(generalLimiter);

wishlistRouter.get("/", getWishlist);
wishlistRouter.post("/items", addItem);
wishlistRouter.delete("/items/:itemId", removeItem);
wishlistRouter.post("/items/:itemId/move-to-cart", moveToCart);

export default wishlistRouter;
