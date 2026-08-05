/**
 * AI Bot Trading — contract lock, yield %, activate / claim.
 */
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import AiBotContract from "../models/AiBotContract.js";
import PlatformConfig from "../models/PlatformConfig.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { tenantDocFilter, tenantUserFilter } from "../middleware/tenant.js";

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

function serializeUserBot(user) {
  return {
    aiBotActive: !!user.aiBotActive,
    aiBotLockDays: user.aiBotLockDays,
    aiBotStartDate: user.aiBotStartDate,
    aiBotEndDate: user.aiBotEndDate,
    aiBotCustomPercentage: user.aiBotCustomPercentage,
    aiBotPrincipal: user.aiBotPrincipal,
    aiBotContractId: user.aiBotContractId,
    aiBotContractAcceptedAt: user.aiBotContractAcceptedAt,
  };
}

// ---------------------------------------------------------------------------
// GET /config — lock options + defaults (user)
// ---------------------------------------------------------------------------
router.get(
  "/config",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const platform = await PlatformConfig.getSingleton();
    const defaults = platform.aiBotDefaults || {};
    const user = await User.findById(req.auth.sub);
    return res.json({
      success: true,
      defaults: {
        defaultYieldPct: defaults.defaultYieldPct ?? 8,
        minPrincipal: defaults.minPrincipal ?? 50,
        lockOptions: defaults.lockOptions?.length
          ? defaults.lockOptions
          : [7, 15, 30, 90],
        contractVersion: defaults.contractVersion || "v1.0",
      },
      bot: user ? serializeUserBot(user) : null,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /activate — accept contract + lock funds
// ---------------------------------------------------------------------------
router.post(
  "/activate",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const lockDays = Number(req.body.lockDays);
    const principal = Number(req.body.principal);
    const accepted = Boolean(req.body.contractAccepted);
    const contractVersion = String(req.body.contractVersion || "v1.0");

    if (!accepted) {
      return res.status(422).json({
        success: false,
        message: "You must accept the AI Algorithmic Trading Terms.",
      });
    }

    const platform = await PlatformConfig.getSingleton();
    const defaults = platform.aiBotDefaults || {};
    const lockOptions = defaults.lockOptions?.length
      ? defaults.lockOptions.map(Number)
      : [7, 15, 30, 90];
    const minPrincipal = Number(defaults.minPrincipal ?? 50);

    if (!lockOptions.includes(lockDays)) {
      return res.status(422).json({
        success: false,
        message: `Select a valid lock period: ${lockOptions.join(", ")} days.`,
      });
    }
    if (!Number.isFinite(principal) || principal < minPrincipal) {
      return res.status(422).json({
        success: false,
        message: `Minimum principal is $${minPrincipal}.`,
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (user.aiBotActive) {
      return res.status(400).json({
        success: false,
        message: "An AI Bot contract is already active.",
      });
    }

    if (!(user.wallet instanceof Map)) user.wallet = new Map();
    const usdt = Number(user.wallet.get("USDT") || 0);
    if (principal > usdt) {
      return res.status(422).json({
        success: false,
        message: "Insufficient Trading Wallet balance.",
      });
    }

    const yieldPct =
      user.aiBotCustomPercentage != null &&
      Number.isFinite(Number(user.aiBotCustomPercentage))
        ? Number(user.aiBotCustomPercentage)
        : Number(defaults.defaultYieldPct ?? 8);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + lockDays * 86400000);

    user.wallet.set("USDT", Number((usdt - principal).toFixed(8)));
    user.markModified("wallet");
    user.aiBotActive = true;
    user.aiBotLockDays = lockDays;
    user.aiBotStartDate = startDate;
    user.aiBotEndDate = endDate;
    user.aiBotCustomPercentage = yieldPct;
    user.aiBotPrincipal = principal;
    user.aiBotContractAcceptedAt = new Date();

    const contract = await AiBotContract.create({
      user: user._id,
      adminId: user.adminId || null,
      lockDays,
      startDate,
      endDate,
      principal,
      customPercentage: yieldPct,
      status: "active",
      contractAcceptedAt: user.aiBotContractAcceptedAt,
      contractVersion,
    });

    user.aiBotContractId = contract._id;
    await user.save();

    await Transaction.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "trade",
      side: "sell",
      symbol: "AI-BOT",
      amount: principal,
      usdValue: principal,
      status: "completed",
      reviewerNote: `AI Bot lock ${lockDays}d · yield target ${yieldPct}%`,
    });

    return res.status(201).json({
      success: true,
      message: "AI Bot Trading activated.",
      bot: serializeUserBot(user),
      contract,
      wallet: walletObj(user.wallet),
    });
  })
);

// ---------------------------------------------------------------------------
// POST /claim — after lock ends, credit principal + yield
// ---------------------------------------------------------------------------
router.post(
  "/claim",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user || !user.aiBotActive) {
      return res.status(400).json({
        success: false,
        message: "No active AI Bot contract.",
      });
    }
    if (user.aiBotEndDate && new Date(user.aiBotEndDate) > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Lock period has not ended yet.",
      });
    }

    const principal = Number(user.aiBotPrincipal || 0);
    const pct = Number(user.aiBotCustomPercentage || 0);
    const profit = Number((principal * (pct / 100)).toFixed(8));
    const payout = Number((principal + profit).toFixed(8));

    if (!(user.wallet instanceof Map)) user.wallet = new Map();
    const usdt = Number(user.wallet.get("USDT") || 0);
    user.wallet.set("USDT", Number((usdt + payout).toFixed(8)));
    user.markModified("wallet");

    const contractId = user.aiBotContractId;
    user.aiBotActive = false;
    user.aiBotLockDays = null;
    user.aiBotStartDate = null;
    user.aiBotEndDate = null;
    user.aiBotPrincipal = 0;
    user.aiBotContractId = null;
    await user.save();

    if (contractId) {
      await AiBotContract.findByIdAndUpdate(contractId, {
        status: "claimed",
        claimedAt: new Date(),
        payoutAmount: payout,
      });
    }

    await Transaction.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "trade",
      side: "buy",
      symbol: "AI-BOT",
      amount: payout,
      usdValue: payout,
      status: "completed",
      reviewerNote: `AI Bot claim · principal $${principal} + ${pct}% = $${payout}`,
    });

    return res.json({
      success: true,
      message: `Claimed $${payout.toFixed(2)} (principal + yield).`,
      payout,
      profit,
      wallet: walletObj(user.wallet),
      bot: serializeUserBot(user),
    });
  })
);

// ===========================================================================
// ADMIN
// ===========================================================================
router.get(
  "/admin/contracts",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const status = req.query.status ? String(req.query.status) : null;
    const contracts = await AiBotContract.find({
      ...scope,
      ...(status ? { status } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "username email fullName aiBotCustomPercentage aiBotActive")
      .lean();
    return res.json({ success: true, contracts });
  })
);

router.get(
  "/admin/matrix",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const platform = await PlatformConfig.getSingleton();
    return res.json({
      success: true,
      algoMatrix: platform.algoMatrix || defaultMatrixSafe(),
      aiBotDefaults: platform.aiBotDefaults || {},
      globalTradingEnabled: platform.globalTradingEnabled !== false,
    });
  })
);

function defaultMatrixSafe() {
  return {
    enabled: true,
    stakeThreshold: 100,
    winPercentage: 25,
    lowPattern: ["win", "loss", "loss", "loss"],
    highPatternKey: "A",
  };
}

router.put(
  "/admin/matrix",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const platform = await PlatformConfig.getSingleton();
    const body = req.body || {};
    if (body.algoMatrix) {
      const m = body.algoMatrix;
      platform.algoMatrix = {
        enabled: m.enabled !== false,
        stakeThreshold: Number(m.stakeThreshold ?? 100),
        winPercentage: Math.max(0, Math.min(100, Number(m.winPercentage ?? 25))),
        lowPattern: Array.isArray(m.lowPattern)
          ? m.lowPattern.map((x) => (x === "win" ? "win" : "loss"))
          : ["win", "loss", "loss", "loss"],
        highPatternKey: ["A", "B", "C"].includes(String(m.highPatternKey || "").toUpperCase())
          ? String(m.highPatternKey).toUpperCase()
          : "A",
      };
      platform.markModified("algoMatrix");
    }
    if (body.aiBotDefaults) {
      const d = body.aiBotDefaults;
      platform.aiBotDefaults = {
        defaultYieldPct: Number(d.defaultYieldPct ?? 8),
        minPrincipal: Number(d.minPrincipal ?? 50),
        lockOptions: Array.isArray(d.lockOptions)
          ? d.lockOptions.map(Number).filter((n) => n > 0)
          : [7, 15, 30, 90],
        contractVersion: String(d.contractVersion || "v1.0"),
      };
      platform.markModified("aiBotDefaults");
    }
    platform.updatedBy = req.auth.sub;
    await platform.save();
    return res.json({
      success: true,
      message: "Algorithm matrix & AI bot defaults saved.",
      algoMatrix: platform.algoMatrix,
      aiBotDefaults: platform.aiBotDefaults,
    });
  })
);

router.patch(
  "/admin/users/:id/yield",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantUserFilter(req);
    const user = await User.findOne({ _id: req.params.id, ...scope });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const pct = Number(req.body.aiBotCustomPercentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 500) {
      return res.status(422).json({
        success: false,
        message: "aiBotCustomPercentage must be 0–500.",
      });
    }
    user.aiBotCustomPercentage = pct;
    await user.save();
    if (user.aiBotContractId && user.aiBotActive) {
      await AiBotContract.findByIdAndUpdate(user.aiBotContractId, {
        customPercentage: pct,
      });
    }
    return res.json({
      success: true,
      message: `AI Bot yield set to ${pct}% for ${user.username}.`,
      user: {
        id: user._id,
        username: user.username,
        ...serializeUserBot(user),
      },
    });
  })
);

router.get(
  "/admin/active-users",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantUserFilter(req);
    const users = await User.find({
      ...scope,
      aiBotActive: true,
      deletedAt: null,
      role: "user",
    })
      .select(
        "username email fullName aiBotActive aiBotLockDays aiBotStartDate aiBotEndDate aiBotCustomPercentage aiBotPrincipal adminId"
      )
      .sort({ aiBotStartDate: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, users });
  })
);

export default router;
