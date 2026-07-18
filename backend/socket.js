/**
 * Socket.IO realtime bridge for support chat + wallet sync + chart resync.
 */
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { isStaffRole } from "./lib/roles.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "nexus-dev-secret-change-me-in-production";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization", "Content-Type"],
    },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      null;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = {
        id: String(payload.sub),
        role: payload.role || "user",
        adminId: payload.adminId || null,
      };
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (isStaffRole(socket.user.role)) {
      socket.join("admins");
      if (socket.user.adminId) {
        socket.join(`tenant:${socket.user.adminId}`);
      } else if (socket.user.role === "admin") {
        socket.join(`tenant:${socket.user.id}`);
      }
    }
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitChatMessage(threadUserId, message) {
  if (!io || !threadUserId || !message) return;
  const uid = String(threadUserId);
  const payload = { userId: uid, message };
  io.to(`user:${uid}`).emit("chat:message", payload);
  io.to("admins").emit("chat:message", payload);
}

export function emitWalletUpdate(userId, wallet, meta = {}) {
  if (!io || !userId) return;
  const uid = String(userId);
  const payload = { userId: uid, wallet, ...meta };
  io.to(`user:${uid}`).emit("wallet:update", payload);
  io.to("admins").emit("wallet:update", payload);
}

export function emitDepositStatus(userId, payload = {}) {
  if (!io || !userId) return;
  const uid = String(userId);
  const body = { userId: uid, ...payload };
  io.to(`user:${uid}`).emit("deposit:status", body);
  io.to("admins").emit("deposit:status", body);
}

/** Release chart override lock and snap terminal back to live public feed. */
export function emitChartResync(userId, payload = {}) {
  if (!io || !userId) return;
  const uid = String(userId);
  const body = {
    userId: uid,
    resync: true,
    at: new Date().toISOString(),
    ...payload,
  };
  io.to(`user:${uid}`).emit("chart:resync", body);
}

export default {
  initSocket,
  getIO,
  emitChatMessage,
  emitWalletUpdate,
  emitDepositStatus,
  emitChartResync,
};

