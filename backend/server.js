/**
 * =============================================================================
 *  NEXUS BACKEND — server.js
 * =============================================================================
 *  Production-clean Express bootstrap for the Nexus crypto platform.
 *    Routers: auth, admin, chat, trade, wallet, staking.
 * =============================================================================
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";
import tradeRoutes from "./routes/trade.js";
import walletRoutes from "./routes/wallet.js";
import stakingRoutes from "./routes/staking.js";
import gatewayRoutes from "./routes/gateway.js";
import secondsTradeRoutes, {
  settleExpiredTrades,
} from "./routes/secondsTrade.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexus_dev";
const NODE_ENV = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DB_READY = false;

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);
app.options("*", cors());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "nexus-api",
    env: NODE_ENV,
    uptime: process.uptime(),
    database: DB_READY ? "connected" : "offline",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Nexus API is online.",
    docs: "/health",
    version: "1.3.0",
  });
});

// Feature routers
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/staking", stakingRoutes);
app.use("/api/gateway", gatewayRoutes);
app.use("/api/seconds-trade", secondsTradeRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "NotFound",
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const payload = {
    success: false,
    error: err.name || "InternalServerError",
    message: err.message || "An unexpected error occurred.",
  };
  if (NODE_ENV !== "production" && err.stack) payload.stack = err.stack;
  res.status(status).json(payload);
});

const connectDatabase = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: NODE_ENV !== "production",
    });
    DB_READY = true;
    console.log(`\x1b[32m[db]\x1b[0m MongoDB connected.`);

    mongoose.connection.on("disconnected", () => {
      DB_READY = false;
      console.warn("\x1b[33m[db]\x1b[0m MongoDB disconnected.");
    });
    mongoose.connection.on("reconnected", () => {
      DB_READY = true;
      console.log("\x1b[32m[db]\x1b[0m MongoDB reconnected.");
    });
  } catch (err) {
    DB_READY = false;
    console.warn(
      "\x1b[33m[db]\x1b[0m ⚠️  MongoDB connection failed — running in DEGRADED mode.\n" +
        `      reason: ${err?.message || err}`
    );
  }
};

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `\x1b[36m[api]\x1b[0m Nexus server listening on http://0.0.0.0:${PORT}`
  );
  console.log(`\x1b[36m[api]\x1b[0m Environment: ${NODE_ENV}`);
  connectDatabase();
});

// Settle expired seconds trades every 3s
const settler = setInterval(() => {
  settleExpiredTrades().catch(() => {});
}, 3000);
settler.unref?.();

process.on("unhandledRejection", (reason) => {
  console.error("\x1b[31m[unhandledRejection]\x1b[0m", reason);
});
process.on("uncaughtException", (err) => {
  console.error("\x1b[31m[uncaughtException]\x1b[0m", err);
});

const shutdown = (signal) => {
  console.log(`\n\x1b[36m[api]\x1b[0m Received ${signal}. Shutting down...`);
  server.close(() => {
    mongoose.connection
      .close(false)
      .catch(() => {})
      .finally(() => process.exit(0));
  });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
