import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;
const app = express();
app.use(helmet({
    contentSecurityPolicy: envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: envMode !== "DEVELOPMENT",
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
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
import couponRouter from "./routes/coupon.routes.js";
import paymentRouter from "./routes/payment.routes.js";
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
app.use("/api/coupons", couponRouter);
app.use("/api/payments", paymentRouter);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Page not found",
    });
});
app.listen(port, () => console.log("Server is working on Port:" + port + " in " + envMode + " Mode."));
