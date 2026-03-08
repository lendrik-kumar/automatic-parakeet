import router from "express";
import { createReturn, listReturns } from "../controllers/return.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const returnRouter = router.Router();

returnRouter.use(authenticateUser);
returnRouter.use(generalLimiter);

returnRouter.post("/", createReturn);
returnRouter.get("/", listReturns);

export default returnRouter;
