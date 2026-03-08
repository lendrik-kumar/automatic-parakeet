import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: envMode !== "DEVELOPMENT",
  }),
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(morgan("dev"));

import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// API routes
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

app.listen(port, () =>
  console.log(
    "Server is working on Port:" + port + " in " + envMode + " Mode.",
  ),
);
