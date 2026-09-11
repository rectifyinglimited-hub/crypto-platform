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
import { tenantDocFilter, tenantUserFilter } from "../middleware/tenant.js";
import { emitWalletUpdate, emitSmartCopySubmitted } from "../socket.js";
import {
  normalizeSmartCopy,
  serializeSmartCopy,
  persistSmartCopy,
  USER_SMART_COPY_SELECT,
  isSlotOpen,
  isSignalCopy,
  releaseLegacyFollowLocks,
  refreshSmartCopyCycle,
  smartCopyCycleOpen,
  smartCopyLiveRate,
  smartCopyUnlocked,
  aiFuturesPrincipal,
  smartCopyHeldOf,
  SMART_COPY_CYCLE_MS,
  mergeSlotState,
  normalizeSlotDefaults,
} from "../lib/smartCopy.js";
import { loadCommissionTiers, loadSlotDefaults } from "../lib/commissionConfig.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { walletObj } from "../lib/ledger.js";

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
    if (!smartCopyUnlocked(userCheck)) {
      return res.status(403).json({
        success: false,
        message:
          "Smart Spot Trade opens after you subscribe to AI Futures Strategy.",
      });
    }
    const activeCount = (
      await SpotCopyLock.find({
        user: req.auth.sub,
        status: "active",
      })
    ).filter(isSignalCopy).length;
    const maxSlots = Number(userCheck?.smartCopyMaxSlots || 0);
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
    await User.updateOne(
      { _id: user._id },
      { $set: { wallet: walletObj(user.wallet) } }
    );

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

function usdtOf(user) {
  if (user?.wallet instanceof Map) return Number(user.wallet.get("USDT") || 0);
  return Number(user?.wallet?.USDT || 0);
}

function setUsdt(user, amount) {
  const n = Number(Number(amount || 0).toFixed(8));
  if (user.wallet instanceof Map) {
    user.wallet.set("USDT", n);
  } else {
    user.wallet = { ...(user.wallet || {}), USDT: n };
  }
}

function serializePendingCommission(tx) {
  if (!tx) return null;
  return {
    id: String(tx._id),
    amount: Number(tx.amount || 0),
    status: tx.status,
    createdAt: tx.createdAt,
    note: tx.reviewerNote || "",
  };
}

async function latestPendingCommission(userId) {
  return Transaction.findOne({
    user: userId,
    source: "smart_copy",
    status: "pending",
  }).sort({ createdAt: -1 });
}

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
    const user = await User.findById(req.auth.sub).select(USER_SMART_COPY_SELECT);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    normalizeSmartCopy(user);
    await releaseLegacyFollowLocks(user._id);
    await refreshSmartCopyCycle(user);
    const copies = (
      await SpotCopyLock.find({
        user: user._id,
        status: "active",
      }).populate("bot")
    ).filter(isSignalCopy);
    const pending = await latestPendingCommission(user._id);
    await persistSmartCopy(user);
    const [tiers, slotDefaults] = await Promise.all([
      loadCommissionTiers(),
      loadSlotDefaults(),
    ]);
    res.json({
      success: true,
      desk: serializeSmartCopy(user, copies, {
        pendingCommission: serializePendingCommission(pending),
        tiers,
        slotDefaults,
      }),
      copies: copies.map(serializeCopy),
    });
  })
);

// POST /spot/copy — submit a signal block; credits daily commission once per 24h
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

    const user = await User.findById(req.auth.sub).select(USER_SMART_COPY_SELECT);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    normalizeSmartCopy(user);
    await releaseLegacyFollowLocks(user._id);
    await refreshSmartCopyCycle(user);
    if (!smartCopyUnlocked(user)) {
      return res.status(403).json({
        success: false,
        message:
          "Smart Spot Trade opens after you subscribe to AI Futures Strategy.",
      });
    }
    const maxSlots = Number(user.smartCopyMaxSlots || 0);
    const [tiers, slotDefaults] = await Promise.all([
      loadCommissionTiers(),
      loadSlotDefaults(),
    ]);
    const slotDoc = mergeSlotState(
      user.smartCopySlots.find((s) => Number(s.slot) === slot),
      slotDefaults
    );
    if (slot >= maxSlots) {
      return res.status(403).json({
        success: false,
        message: `Your AI Futures Strategy lock ($${aiFuturesPrincipal(user).toFixed(0)}) unlocks ${maxSlots} block${maxSlots === 1 ? "" : "s"}.`,
      });
    }
    if (!isSlotOpen(slotDoc)) {
      return res.status(403).json({
        success: false,
        message: slotDoc?.readyAt
          ? `This signal opens at ${new Date(slotDoc.readyAt).toLocaleString()}.`
          : "This signal is closed by admin.",
      });
    }

    const activeLocks = (
      await SpotCopyLock.find({
        user: user._id,
        status: "active",
      })
    ).filter(isSignalCopy);
    if (activeLocks.some((row) => Number(row.slot) === slot)) {
      return res.status(400).json({
        success: false,
        message: "This block is already copying.",
      });
    }

    const activeCount = activeLocks.length;
    if (activeCount >= maxSlots) {
      return res.status(400).json({
        success: false,
        message: `You can copy ${maxSlots} block${maxSlots > 1 ? "s" : ""} only.`,
      });
    }

    const startDate = new Date();
    const paying = smartCopyCycleOpen(user, startDate);
    const rate = smartCopyLiveRate(user, startDate, tiers);
    const principal = aiFuturesPrincipal(user);
    const credit = paying
      ? Number(((principal * rate) / 100).toFixed(8))
      : 0;

    const lock = await SpotCopyLock.create({
      user: user._id,
      bot: null,
      slot,
      adminId: user.adminId || null,
      principal: 0,
      lockDays: 1,
      yieldPct: rate,
      startDate,
      endDate: new Date(startDate.getTime() + SMART_COPY_CYCLE_MS),
      status: "active",
      assetType: pair,
      selectedAsset: asset,
      selectedAssetType: assetType,
      selectedPair: pair,
      signalAtFollow: "Copy",
      confidenceAtFollow: null,
    });

    let pendingCommission = await latestPendingCommission(user._id);
    let credited = 0;
    let requested = 0;
    let message = `Copying ${pair || asset}.`;

    if (paying) {
      user.smartCopyLastSubmitAt = startDate;
      if (credit > 0) {
        const lockActive = Boolean(user.aiBotActive);
        if (lockActive) {
          user.smartCopyHeldUsdt = Number(
            (smartCopyHeldOf(user) + credit).toFixed(8)
          );
        } else {
          setUsdt(user, usdtOf(user) + credit);
        }
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              ...(lockActive
                ? { smartCopyHeldUsdt: user.smartCopyHeldUsdt }
                : { wallet: walletObj(user.wallet) }),
            },
          }
        );
        await Transaction.create({
          user: user._id,
          adminId: user.adminId || null,
          kind: "trade",
          side: "buy",
          symbol: "USDT",
          amount: credit,
          usdValue: credit,
          ledgerDelta: credit,
          status: "completed",
          source: "smart_copy",
          reviewerNote: lockActive
            ? `Smart Spot Trade · ${rate}% of AI Futures $${principal.toFixed(2)} = $${credit.toFixed(2)} · locked on Smart Spot until AI Futures ends · ${pair || asset}`
            : `Smart Spot Trade · ${rate}% of AI Futures $${principal.toFixed(2)} = $${credit.toFixed(2)} · credited instantly · ${pair || asset}`,
        });
        credited = credit;
        requested = credit;
        message = lockActive
          ? `Commission $${credit.toFixed(2)} added to Smart Spot locked balance.`
          : `Commission $${credit.toFixed(2)} added to your account.`;
        try {
          emitWalletUpdate(user._id, walletObj(user.wallet), {
            reason: "smart_copy_credit",
            amount: credit,
            locked: lockActive,
            smartCopyHeldUsdt: Number(user.smartCopyHeldUsdt || 0),
          });
        } catch {
          /* ignore */
        }
      }
      await persistSmartCopy(user);
    } else if (user.isModified?.()) {
      await persistSmartCopy(user);
    }

    try {
      emitSmartCopySubmitted(
        lock,
        {
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          adminId: user.adminId,
        },
        {
          commission:
            credited > 0
              ? { amount: credited, rate, status: "completed" }
              : null,
        }
      );
    } catch {
      /* ignore socket failures */
    }

    const copies = await SpotCopyLock.find({
      user: user._id,
      status: "active",
    });
    res.status(201).json({
      success: true,
      message,
      credited,
      requested,
      rate: paying ? rate : 0,
      copy: serializeCopy(lock),
      wallet: walletObj(user.wallet),
      smartCopyHeldUsdt: Number(user.smartCopyHeldUsdt || 0),
      desk: serializeSmartCopy(user, copies, {
        pendingCommission: serializePendingCommission(pendingCommission),
        tiers,
        slotDefaults,
      }),
    });
  })
);

// ---- Admin ----
router.use(requireAuth, requireAdmin, requireDatabase);

router.get(
  "/admin/slot-defaults",
  asyncHandler(async (_req, res) => {
    const slots = await loadSlotDefaults();
    return res.json({
      success: true,
      slots: slots.map((s) => ({
        slot: s.slot,
        accuracy: s.accuracy,
        readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
        title: s.title,
        prediction: s.prediction,
        followers: s.followers,
        defaultAsset: s.defaultAsset,
        defaultType: s.defaultType,
      })),
    });
  })
);

router.put(
  "/admin/slot-defaults",
  asyncHandler(async (req, res) => {
    const slots = normalizeSlotDefaults(req.body?.slots);
    const platform = await PlatformConfig.getSingleton();
    platform.smartCopyDefaults = {
      slots: slots.map((s) => ({
        slot: s.slot,
        accuracy: s.accuracy,
        readyAt: s.readyAt || null,
        title: s.title,
        prediction: s.prediction,
        followers: s.followers,
        defaultAsset: s.defaultAsset,
        defaultType: s.defaultType,
      })),
    };
    platform.markModified("smartCopyDefaults");
    platform.updatedBy = req.auth.sub;
    await platform.save();

    const nextSlots = slots.map((s) => ({
      slot: s.slot,
      enabled: true,
      accuracy: s.accuracy,
      readyAt: s.readyAt || null,
      title: s.title,
      prediction: s.prediction,
      followers: s.followers,
      defaultAsset: s.defaultAsset,
      defaultType: s.defaultType,
    }));
    const updated = await User.updateMany(tenantUserFilter(req), {
      $set: { smartCopySlots: nextSlots },
    });

    return res.json({
      success: true,
      message: `Smart Spot blocks saved for all users (${Number(updated.modifiedCount || 0)} accounts).`,
      slots: nextSlots.map((s) => ({
        slot: s.slot,
        accuracy: s.accuracy,
        readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
        title: s.title,
        prediction: s.prediction,
        followers: s.followers,
        defaultAsset: s.defaultAsset,
        defaultType: s.defaultType,
      })),
    });
  })
);

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
