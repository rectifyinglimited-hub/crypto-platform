/**
 * AI Spot Copy / Future catalog + Spot follow locks.
 * Existing /api/ai-bot stays as AI Future Trade (testing).
 */
import { Router } from "express";
import mongoose from "mongoose";
import CopyBot from "../models/CopyBot.js";
import SpotCopyLock from "../models/SpotCopyLock.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { tenantDocFilter } from "../middleware/tenant.js";
import { emitWalletUpdate, emitSmartCopySubmitted } from "../socket.js";
import {
  normalizeSmartCopy,
  serializeSmartCopy,
  isSlotOpen,
} from "../lib/smartCopy.js";

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "DatabaseUnavailable",
      message: "Database is offline.",
    });
  }
  return next();
}

function walletObj(w) {
  if (w instanceof Map) return Object.fromEntries(w);
  return { ...(w || {}) };
}

async function ensureSeedBots() {
  const count = await CopyBot.countDocuments({ tradeType: "spot_copy" });
  if (count > 0) return;
  await CopyBot.create([
    {
      name: "Oil Pulse AI",
      tradeType: "spot_copy",
      assetType: "Crude Oil (WTI)",
      predictionConfidence: 78,
      accuracyHistorical: "70%",
      totalFollowers: 1240,
      topSignalDirection: "Bullish",
      summary:
        "Multi-timeframe momentum model focused on energy markets. Historical hit rate measured on closed spot signals.",
      lockDays: 30,
      yieldPct: 8,
      minPrincipal: 50,
      enabled: true,
      isTesting: false,
    },
    {
      name: "Gold Sentinel",
      tradeType: "spot_copy",
      assetType: "XAU/USD",
      predictionConfidence: 72,
      accuracyHistorical: "68%",
      totalFollowers: 890,
      topSignalDirection: "Bullish",
      summary: "Macro + volatility filter for precious metals spot copy.",
      lockDays: 21,
      yieldPct: 7,
      minPrincipal: 50,
      enabled: true,
      isTesting: false,
    },
    {
      name: "BTC Momentum AI",
      tradeType: "spot_copy",
      assetType: "BTC/USDT",
      predictionConfidence: 74,
      accuracyHistorical: "71%",
      totalFollowers: 2100,
      topSignalDirection: "Bullish",
      summary: "Spot BTC copy desk — session momentum plus volatility bands.",
      lockDays: 14,
      yieldPct: 9,
      minPrincipal: 50,
      enabled: true,
      isTesting: false,
    },
  ]);
}

async function ensureCoreSpotAssets() {
  await ensureSeedBots();
  const existing = await CopyBot.find({ tradeType: "spot_copy" }).select(
    "assetType"
  );
  const blob = existing.map((b) => String(b.assetType || "").toUpperCase()).join(" ");
  if (!/BTC/.test(blob)) {
    await CopyBot.create({
      name: "BTC Momentum AI",
      tradeType: "spot_copy",
      assetType: "BTC/USDT",
      predictionConfidence: 62,
      accuracyHistorical: "62%",
      totalFollowers: 1800,
      topSignalDirection: "Bearish",
      summary: "Volatile Dip",
      lockDays: 14,
      yieldPct: 9,
      minPrincipal: 50,
      enabled: true,
      isTesting: false,
    });
  }
  if (!/EUR/.test(blob)) {
    await CopyBot.create({
      name: "EUR Range AI",
      tradeType: "spot_copy",
      assetType: "EUR/USD",
      predictionConfidence: 70,
      accuracyHistorical: "70%",
      totalFollowers: 3500,
      topSignalDirection: "Neutral",
      summary: "Ranging Market",
      lockDays: 21,
      yieldPct: 6,
      minPrincipal: 50,
      enabled: true,
      isTesting: false,
    });
  }
}

function serializeBot(b) {
  const doc = typeof b.toObject === "function" ? b.toObject() : { ...b };
  return {
    id: String(doc._id),
    _id: doc._id,
    name: doc.name,
    tradeType: doc.tradeType,
    isTesting: !!doc.isTesting,
    enabled: doc.enabled !== false,
    assetType: doc.assetType,
    predictionConfidence: Number(doc.predictionConfidence || 0),
    accuracyHistorical: doc.accuracyHistorical || "—",
    totalFollowers: Number(doc.totalFollowers || 0),
    topSignalDirection: doc.topSignalDirection || "Neutral",
    summary: doc.summary || "",
    lockDays: Number(doc.lockDays || 30),
    yieldPct: Number(doc.yieldPct || 8),
    minPrincipal: Number(doc.minPrincipal || 50),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// GET /bots?tradeType=spot_copy|future_ai
router.get(
  "/bots",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    await ensureCoreSpotAssets();
    const tradeType = String(req.query.tradeType || "spot_copy").toLowerCase();
    const filter = {
      enabled: true,
      ...(tradeType === "future_ai" || tradeType === "spot_copy"
        ? { tradeType }
        : {}),
    };
    const bots = await CopyBot.find(filter).sort({ totalFollowers: -1 }).limit(50);
    const top = bots[0] ? serializeBot(bots[0]) : null;
    res.json({
      success: true,
      bots: bots.map(serializeBot),
      topPrediction: top
        ? {
            assetType: top.assetType,
            direction: top.topSignalDirection,
            confidence: top.predictionConfidence,
            botId: top.id,
            name: top.name,
          }
        : null,
    });
  })
);

// GET /spot/my-lock
router.get(
  "/spot/my-lock",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const lock = await SpotCopyLock.findOne({
      user: req.auth.sub,
      status: "active",
    }).populate("bot");
    res.json({
      success: true,
      lock: lock
        ? {
            id: String(lock._id),
            principal: lock.principal,
            lockDays: lock.lockDays,
            yieldPct: lock.yieldPct,
            startDate: lock.startDate,
            endDate: lock.endDate,
            assetType: lock.assetType,
            signalAtFollow: lock.signalAtFollow,
            confidenceAtFollow: lock.confidenceAtFollow,
            bot: lock.bot ? serializeBot(lock.bot) : null,
          }
        : null,
    });
  })
);

// POST /spot/follow — lock Trading Wallet into spot strategy
router.post(
  "/spot/follow",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const botId = req.body.botId;
    const principal = Number(req.body.principal);
    if (!mongoose.isValidObjectId(botId)) {
      return res.status(400).json({ success: false, message: "Invalid bot." });
    }
    const bot = await CopyBot.findOne({
      _id: botId,
      tradeType: "spot_copy",
      enabled: true,
    });
    if (!bot) {
      return res.status(404).json({ success: false, message: "Bot not found." });
    }
    if (!Number.isFinite(principal) || principal < Number(bot.minPrincipal || 50)) {
      return res.status(422).json({
        success: false,
        message: `Minimum lock is $${bot.minPrincipal || 50}.`,
      });
    }

    const userCheck = await User.findById(req.auth.sub);
    if (userCheck) normalizeSmartCopy(userCheck);
    const activeCount = await SpotCopyLock.countDocuments({
      user: req.auth.sub,
      status: "active",
    });
    const maxSlots = Number(userCheck?.smartCopyMaxSlots || 1);
    if (activeCount >= maxSlots) {
      return res.status(400).json({
        success: false,
        message: `Copy limit reached (${maxSlots} block${maxSlots > 1 ? "s" : ""}).`,
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (!(user.wallet instanceof Map)) user.wallet = new Map();
    const usdt = Number(user.wallet.get("USDT") || 0);
    if (principal > usdt) {
      return res.status(422).json({
        success: false,
        message: "Insufficient Trading Wallet balance.",
      });
    }

    const lockDays = Number(bot.lockDays || 30);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + lockDays * 86400000);

    user.wallet.set("USDT", Number((usdt - principal).toFixed(8)));
    user.markModified("wallet");
    await user.save();

    bot.totalFollowers = Number(bot.totalFollowers || 0) + 1;
    await bot.save();

    const lock = await SpotCopyLock.create({
      user: user._id,
      bot: bot._id,
      adminId: user.adminId || null,
      principal,
      lockDays,
      yieldPct: Number(bot.yieldPct || 8),
      startDate,
      endDate,
      status: "active",
      assetType: bot.assetType,
      signalAtFollow: bot.topSignalDirection,
      confidenceAtFollow: bot.predictionConfidence,
    });

    await Transaction.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "trade",
      side: "buy",
      symbol: "USDT",
      amount: principal,
      usdValue: principal,
      status: "completed",
      source: "smart_copy",
      ledgerDelta: -principal,
      reviewerNote: `Smart Spot Trade lock · ${bot.name} · ${bot.assetType}`,
    });

    try {
      emitWalletUpdate(user._id, walletObj(user.wallet), {
        reason: "spot_copy_follow",
      });
    } catch {
      /* ignore */
    }

    res.status(201).json({
      success: true,
      message: `Following ${bot.name} · ${bot.assetType}`,
      lock: {
        id: String(lock._id),
        principal,
        lockDays,
        endDate,
        assetType: bot.assetType,
      },
      user: { id: user._id, wallet: walletObj(user.wallet) },
    });
  })
);

function serializeCopy(lock) {
  return {
    id: String(lock._id),
    slot: Number(lock.slot || 0),
    principal: Number(lock.principal || 0),
    lockDays: lock.lockDays,
    yieldPct: lock.yieldPct,
    startDate: lock.startDate,
    endDate: lock.endDate,
    assetType: lock.assetType,
    selectedAsset: lock.selectedAsset || "",
    selectedAssetType: lock.selectedAssetType || "crypto",
    selectedPair: lock.selectedPair || lock.assetType || "",
    signalAtFollow: lock.signalAtFollow,
    confidenceAtFollow: lock.confidenceAtFollow,
    bot: lock.bot ? serializeBot(lock.bot) : null,
  };
}

// GET /spot/desk — Smart Copy Trade state (slots + copies)
router.get(
  "/spot/desk",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    normalizeSmartCopy(user);
    const copies = await SpotCopyLock.find({
      user: user._id,
      status: "active",
    }).populate("bot");
    if (user.isModified()) await user.save();
    res.json({
      success: true,
      desk: serializeSmartCopy(user, copies),
      copies: copies.map(serializeCopy),
    });
  })
);

// POST /spot/copy — activate a signal block (no wallet lock; admin credits later)
router.post(
  "/spot/copy",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const slot = Number(req.body.slot);
    const asset = String(req.body.asset || "").toUpperCase().trim();
    const assetType = ["forex", "stock"].includes(
      String(req.body.assetType || "").toLowerCase()
    )
      ? String(req.body.assetType).toLowerCase()
      : "crypto";
    const pair = String(req.body.pair || asset).trim();

    if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
      return res.status(400).json({ success: false, message: "Invalid signal block." });
    }
    if (!asset) {
      return res.status(400).json({ success: false, message: "Select a coin first." });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    normalizeSmartCopy(user);
    const slotDoc = user.smartCopySlots.find((s) => Number(s.slot) === slot);
    if (!isSlotOpen(slotDoc)) {
      return res.status(403).json({
        success: false,
        message: slotDoc?.readyAt
          ? `This signal opens at ${new Date(slotDoc.readyAt).toLocaleString()}.`
          : "This signal is closed by admin.",
      });
    }

    const existingSlot = await SpotCopyLock.findOne({
      user: user._id,
      slot,
      status: "active",
    });
    if (existingSlot) {
      return res.status(400).json({
        success: false,
        message: "This block is already copying.",
      });
    }

    const activeCount = await SpotCopyLock.countDocuments({
      user: user._id,
      status: "active",
    });
    const maxSlots = Number(user.smartCopyMaxSlots || 1);
    if (activeCount >= maxSlots) {
      return res.status(400).json({
        success: false,
        message: `You can copy ${maxSlots} block${maxSlots > 1 ? "s" : ""} only.`,
      });
    }

    const startDate = new Date();
    const lock = await SpotCopyLock.create({
      user: user._id,
      bot: null,
      slot,
      adminId: user.adminId || null,
      principal: 0,
      lockDays: 30,
      yieldPct: Number(user.smartCopyCommissionPct || 0),
      startDate,
      endDate: new Date(startDate.getTime() + 30 * 86400000),
      status: "active",
      assetType: pair,
      selectedAsset: asset,
      selectedAssetType: assetType,
      selectedPair: pair,
      signalAtFollow: "Copy",
      confidenceAtFollow: null,
    });

    if (user.isModified()) await user.save();

    try {
      emitSmartCopySubmitted(lock, {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        adminId: user.adminId,
      });
    } catch {
      /* ignore socket failures */
    }

    const copies = await SpotCopyLock.find({
      user: user._id,
      status: "active",
    });
    res.status(201).json({
      success: true,
      message: `Copying ${pair || asset}.`,
      copy: serializeCopy(lock),
      desk: serializeSmartCopy(user, copies),
    });
  })
);

// ---- Admin ----
router.use(requireAuth, requireAdmin, requireDatabase);

router.get(
  "/admin/bots",
  asyncHandler(async (req, res) => {
    await ensureCoreSpotAssets();
    const tradeType = req.query.tradeType;
    const tenant = tenantDocFilter(req);
    const filter = Object.keys(tenant).length
      ? {
          $or: [tenant, { adminId: null }],
          ...(tradeType ? { tradeType } : {}),
        }
      : tradeType
        ? { tradeType }
        : {};
    const bots = await CopyBot.find(filter).sort({ updatedAt: -1 }).limit(200);
    res.json({ success: true, bots: bots.map(serializeBot) });
  })
);

router.post(
  "/admin/bots",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const tradeType =
      body.tradeType === "future_ai" ? "future_ai" : "spot_copy";
    const bot = await CopyBot.create({
      name: String(body.name || "Untitled Bot").trim(),
      tradeType,
      isTesting: Boolean(body.isTesting),
      enabled: body.enabled !== false,
      assetType: String(body.assetType || "BTC/USDT").trim(),
      predictionConfidence: Number(body.predictionConfidence ?? 70),
      accuracyHistorical: String(body.accuracyHistorical || "70%"),
      totalFollowers: Number(body.totalFollowers ?? 0),
      topSignalDirection: ["Bullish", "Bearish", "Neutral"].includes(
        body.topSignalDirection
      )
        ? body.topSignalDirection
        : "Bullish",
      summary: String(body.summary || ""),
      lockDays: Number(body.lockDays || 30),
      yieldPct: Number(body.yieldPct || 8),
      minPrincipal: Number(body.minPrincipal || 50),
      adminId: req.auth.adminId || req.auth.sub,
    });
    res.status(201).json({ success: true, bot: serializeBot(bot) });
  })
);

router.patch(
  "/admin/bots/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    const bot = await CopyBot.findById(req.params.id);
    if (!bot) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    const body = req.body || {};
    const fields = [
      "name",
      "assetType",
      "summary",
      "accuracyHistorical",
      "topSignalDirection",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) bot[f] = body[f];
    }
    if (body.tradeType === "spot_copy" || body.tradeType === "future_ai") {
      bot.tradeType = body.tradeType;
    }
    if (body.isTesting !== undefined) bot.isTesting = Boolean(body.isTesting);
    if (body.enabled !== undefined) bot.enabled = Boolean(body.enabled);
    if (body.predictionConfidence !== undefined) {
      bot.predictionConfidence = Number(body.predictionConfidence);
    }
    if (body.totalFollowers !== undefined) {
      bot.totalFollowers = Number(body.totalFollowers);
    }
    if (body.lockDays !== undefined) bot.lockDays = Number(body.lockDays);
    if (body.yieldPct !== undefined) bot.yieldPct = Number(body.yieldPct);
    if (body.minPrincipal !== undefined) {
      bot.minPrincipal = Number(body.minPrincipal);
    }
    await bot.save();
    res.json({ success: true, bot: serializeBot(bot) });
  })
);

router.delete(
  "/admin/bots/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    await CopyBot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
