/**
 * Socket.IO realtime bridge for support chat + wallet sync + chart resync.
 */
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { isStaffRole, isSuperAdminRole } from "./lib/roles.js";

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
      if (isSuperAdminRole(socket.user.role)) {
        socket.join("super_admins");
      }
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

/**
 * New chat message — deliver to the thread user + owning tenant admin + Super Admin.
 * Never broadcast to global `admins` (would leak across tenants).
 */
export function emitChatMessage(threadUserId, message, opts = {}) {
  if (!io || !threadUserId || !message) return;
  const uid = String(threadUserId);
  const tidRaw = opts.adminId ?? message.adminId ?? null;
  const tid = tidRaw ? String(tidRaw) : null;
  const payload = {
    userId: uid,
    adminId: tid,
    message,
    user: opts.user || null,
  };
  io.to(`user:${uid}`).emit("chat:message", payload);
  if (tid) {
    io.to(`tenant:${tid}`).emit("chat:message", payload);
    io.to(`user:${tid}`).emit("chat:message", payload);
  }
  io.to("super_admins").emit("chat:message", payload);
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

/** Admin switched the quote the user sees on the trade desk (USDT ↔ USDC). */
export function emitChartQuote(userId, quote) {
  if (!io || !userId) return;
  const uid = String(userId);
  const body = {
    userId: uid,
    quote: quote || null,
    at: new Date().toISOString(),
  };
  io.to(`user:${uid}`).emit("chart:quote", body);
}

/**
 * Client opened a seconds trade — notify owning tenant admin + Super Admin only.
 * Never broadcast to the global `admins` room (would leak across tenants).
 */
export function emitTradeOpened(trade, userSummary = {}) {
  if (!io || !trade) return;
  const tid = trade.adminId ? String(trade.adminId) : null;
  const uid = trade.user ? String(trade.user._id || trade.user) : null;
  const payload = {
    type: "opened",
    at: new Date().toISOString(),
    adminId: tid,
    userId: uid,
    user: {
      id: uid,
      username: userSummary.username || null,
      email: userSummary.email || null,
      fullName: userSummary.fullName || null,
    },
    trade: {
      _id: String(trade._id),
      asset: trade.asset,
      quote: trade.quote || "USDT",
      assetType: trade.assetType,
      direction: trade.direction,
      stake: trade.stake,
      durationSec: trade.durationSec,
      entryPrice: trade.entryPrice,
      openedAt: trade.openedAt,
      expiresAt: trade.expiresAt,
      status: trade.status || "open",
      adminId: tid,
    },
  };
  if (uid) io.to(`user:${uid}`).emit("trade:opened", payload);
  if (tid) {
    io.to(`tenant:${tid}`).emit("trade:opened", payload);
    io.to(`user:${tid}`).emit("trade:opened", payload);
  }
  io.to("super_admins").emit("trade:opened", payload);
}

/** User submitted a Smart Spot Trade copy — notify tenant admin + Super Admin. */
export function emitSmartCopySubmitted(copy, userSummary = {}, extra = {}) {
  if (!io || !copy) return;
  const tid =
    (copy.adminId && String(copy.adminId)) ||
    (userSummary.adminId && String(userSummary.adminId)) ||
    null;
  const uid = copy.user ? String(copy.user._id || copy.user) : null;
  const payload = {
    type: "smartcopy",
    at: new Date().toISOString(),
    adminId: tid,
    userId: uid,
    user: {
      id: uid,
      username: userSummary.username || null,
      email: userSummary.email || null,
      fullName: userSummary.fullName || null,
    },
    copy: {
      id: String(copy._id),
      slot: Number(copy.slot || 0),
      asset: copy.selectedAsset || "",
      assetType: copy.selectedAssetType || "crypto",
      pair: copy.selectedPair || "",
    },
    commission: extra.commission || null,
  };
  if (tid) {
    io.to(`tenant:${tid}`).emit("smartcopy:submitted", payload);
    io.to(`user:${tid}`).emit("smartcopy:submitted", payload);
  }
  io.to("super_admins").emit("smartcopy:submitted", payload);
}

/** User asked to start AI Futures — notify tenant admin + Super Admin. */
export function emitAiBotLockRequest(request, userSummary = {}, extra = {}) {
  if (!io || !request) return;
  const tid =
    (request.adminId && String(request.adminId)) ||
    (userSummary.adminId && String(userSummary.adminId)) ||
    null;
  const uid = request.user ? String(request.user._id || request.user) : null;
  const payload = {
    type: extra.type || "requested",
    at: new Date().toISOString(),
    adminId: tid,
    userId: uid,
    user: {
      id: uid,
      username: userSummary.username || null,
      email: userSummary.email || null,
      fullName: userSummary.fullName || null,
    },
    request: {
      id: String(request._id),
      requestedDays: Number(request.requestedDays || 0),
      approvedDays:
        request.approvedDays != null ? Number(request.approvedDays) : null,
      principal: Number(request.principal || 0),
      status: request.status || "pending",
    },
    ...extra,
  };
  if (uid) io.to(`user:${uid}`).emit("aibot:lock", payload);
  if (tid) {
    io.to(`tenant:${tid}`).emit("aibot:lock", payload);
    io.to(`user:${tid}`).emit("aibot:lock", payload);
  }
  io.to("super_admins").emit("aibot:lock", payload);
}

/** Trade settled — notify the trading user (win/loss toast). Tenant staff optional. */
export function emitTradeSettled(trade) {
  if (!io || !trade) return;
  const uid = trade.user ? String(trade.user._id || trade.user) : null;
  if (!uid) return;
  const tid = trade.adminId ? String(trade.adminId) : null;
  const payload = {
    type: "settled",
    at: new Date().toISOString(),
    adminId: tid,
    userId: uid,
    trade: {
      _id: String(trade._id),
      asset: trade.asset,
      quote: trade.quote || "USDT",
      assetType: trade.assetType,
      direction: trade.direction,
      stake: trade.stake,
      payout: trade.payout,
      lossAmount: trade.lossAmount,
      exitPrice: trade.exitPrice,
      entryPrice: trade.entryPrice,
      status: trade.status,
      settledAt: trade.settledAt,
      adminId: tid,
    },
  };
  io.to(`user:${uid}`).emit("trade:settled", payload);
}

export default {
  initSocket,
  getIO,
  emitChatMessage,
  emitWalletUpdate,
  emitDepositStatus,
  emitChartResync,
  emitTradeOpened,
  emitTradeSettled,
  emitSmartCopySubmitted,
  emitAiBotLockRequest,
};

