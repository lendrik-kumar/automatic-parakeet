import { Router } from "express";
import * as ctrl from "../controllers/address.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication to all address routes
router.use(authenticateUser);

// ─── Address CRUD ───────────────────────────────────────────────────────────

router.get("/", ctrl.listAddresses);
router.post("/", ctrl.createAddress);
router.get("/:addressId", ctrl.getAddress);
router.patch("/:addressId", ctrl.updateAddress);
router.delete("/:addressId", ctrl.deleteAddress);

// ─── Default Address Actions ────────────────────────────────────────────────

router.patch("/:addressId/set-default-shipping", ctrl.setDefaultShipping);
router.patch("/:addressId/set-default-billing", ctrl.setDefaultBilling);

export default router;
