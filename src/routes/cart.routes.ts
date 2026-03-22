import router from "express";
import * as ctrl from "../controllers/cart.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const cartRouter = router.Router();

cartRouter.use(authenticateUser);
cartRouter.use(generalLimiter);

cartRouter.get("/", ctrl.getCart);
cartRouter.delete("/", ctrl.clearCart);

cartRouter.post("/items", ctrl.addItem);
cartRouter.patch("/items/:itemId", ctrl.updateItem);
cartRouter.delete("/items/:itemId", ctrl.removeItem);

cartRouter.post("/items/bulk", ctrl.bulkAddItems);
cartRouter.patch("/items/bulk", ctrl.bulkUpdateItems);
cartRouter.delete("/items/bulk", ctrl.bulkRemoveItems);

cartRouter.post("/coupon", ctrl.applyCoupon);
cartRouter.delete("/coupon", ctrl.removeCoupon);

cartRouter.get("/summary", ctrl.getCartSummary);
cartRouter.post("/validate", ctrl.validateCart);

cartRouter.post("/move-to-wishlist/:itemId", ctrl.moveItemToWishlist);
cartRouter.post("/add-from-wishlist/:wishlistItemId", ctrl.addItemFromWishlist);

cartRouter.post("/save-for-later/:itemId", ctrl.saveItemForLater);
cartRouter.get("/saved-items", ctrl.listSavedItems);
cartRouter.post("/restore-saved-item/:savedItemId", ctrl.restoreSavedItem);
cartRouter.delete("/saved-items/:savedItemId", ctrl.removeSavedItem);

cartRouter.post("/sync", ctrl.syncCart);

export default cartRouter;
