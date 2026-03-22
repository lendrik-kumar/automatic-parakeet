import router from "express";
import {
  createReturn,
  listReturns,
  getReturn,
  cancelReturn,
  getReturnTimeline,
  getReturnReasons,
} from "../controllers/return.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const returnRouter = router.Router();

returnRouter.use(authenticateUser);
returnRouter.use(generalLimiter);

returnRouter.post("/", createReturn);
returnRouter.get("/", listReturns);
returnRouter.get("/reasons", getReturnReasons);
returnRouter.get("/:returnId", getReturn);
returnRouter.patch("/:returnId/cancel", cancelReturn);
returnRouter.get("/:returnId/timeline", getReturnTimeline);

export default returnRouter;
