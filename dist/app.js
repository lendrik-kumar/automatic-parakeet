import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { validateEnvironmentOrExit, getEnvironmentSummary } from "./utils/environmentValidation.js";
import { createLogger } from "./utils/secureLogger.js";
dotenv.config({ path: "./.env" });
// Validate environment before starting server
validateEnvironmentOrExit();
const logger = createLogger("Application");
export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;
logger.info("Starting Sprint Shoes API", {
    mode: envMode,
    port,
    environment: getEnvironmentSummary(),
});
const app = express();
app.use(helmet({
    contentSecurityPolicy: envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: envMode !== "DEVELOPMENT",
}));
// IMPORTANT: Raw body parsing for webhook signature verification
// This must come BEFORE express.json() middleware
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ── Secure CORS Configuration ───────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL,
    // Development origins
    ...(envMode === "DEVELOPMENT"
        ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
        : []),
].filter(Boolean);
logger.info("CORS configuration", { allowedOrigins });
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            logger.warn("CORS request blocked", {
                origin,
                allowedOrigins,
                userAgent: "unknown" // Will be set by middleware
            });
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
    },
    credentials: true,
}));
app.use(morgan("dev"));
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import orderRouter from "./routes/order.routes.js";
import returnRouter from "./routes/return.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import addressRouter from "./routes/address.routes.js";
import paymentMethodRouter from "./routes/payment-method.routes.js";
import reviewRouter from "./routes/review.routes.js";
import { globalErrorHandler } from "./middlewares/errorHandler.middleware.js";
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
// API routes
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/orders", orderRouter);
app.use("/api/returns", returnRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/payment-methods", paymentMethodRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/user/addresses", addressRouter);
// 404 handler (before error handler)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});
// Global error handler (MUST be last)
app.use(globalErrorHandler);
app.listen(port, () => console.log("Server is working on Port:" + port + " in " + envMode + " Mode."));
