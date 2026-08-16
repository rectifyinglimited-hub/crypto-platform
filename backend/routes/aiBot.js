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
    aiBotAssignedLockDays: user.aiBotAssignedLockDays,
    aiBotStartDate: user.aiBotStartDate,
    aiBotEndDate: user.aiBotEndDate,
    aiBotCustomPercentage: user.aiBotCustomPercentage,
    aiBotPrincipal: user.aiBotPrincipal,
    aiBotContractId: user.aiBotContractId,
    aiBotContractAcceptedAt: user.aiBotContractAcceptedAt,
  };
}

/** Daily commission % of principal. Total target = daily × lock days. */
function dailyCommissionPct(userOrPct) {
  const pct =
    typeof userOrPct === "number"
      ? userOrPct
      : Number(userOrPct?.aiBotCustomPercentage || 0);
  return Number.isFinite(pct) ? pct : 0;
}

function lockDayCount(user) {
  const n = Number(user?.aiBotLockDays || user?.aiBotAssignedLockDays || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function commissionProfit(principal, dailyPct, days) {
  return Number(
    (Number(principal || 0) * (Number(dailyPct || 0) / 100) * Number(days || 0)).toFixed(8)
  );
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
    const assigned = user?.aiBotAssignedLockDays
      ? Number(user.aiBotAssignedLockDays)
      : null;
    // User only sees admin-assigned days (single value). Global lockOptions stay admin-side.
    const lockOptions =
      Number.isFinite(assigned) && assigned > 0
        ? [assigned]
        : [];
    return res.json({
      success: true,
      defaults: {
        defaultYieldPct: defaults.defaultYieldPct ?? 8,
        minPrincipal: defaults.minPrincipal ?? 50,
        lockOptions,
        contractVersion: defaults.contractVersion || "v1.0",
        adminAssignedOnly: true,
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
    const minPrincipal = Number(defaults.minPrincipal ?? 50);

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const assigned = Number(user.aiBotAssignedLockDays);
    if (!Number.isFinite(assigned) || assigned < 1) {
      return res.status(422).json({
        success: false,
        message:
          "Your lock period has not been set by admin yet. Contact support.",
      });
    }
    // Ignore client-chosen days — always use admin assignment
    const lockDays = assigned;

    if (!Number.isFinite(principal) || principal < minPrincipal) {
      return res.status(422).json({
        success: false,
        message: `Minimum principal is $${minPrincipal}.`,
      });
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
      reviewerNote: `AI Bot lock ${lockDays}d · daily commission ${yieldPct}%`,
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
    const pct = dailyCommissionPct(user);
    const days = lockDayCount(user);
    const profit = commissionProfit(principal, pct, days);
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
      reviewerNote: `AI Bot claim · principal $${principal} + ${pct}% daily × ${days}d = $${payout}`,
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

// ---------------------------------------------------------------------------
// POST /cancel — early cancel: forfeit yield + 15% principal penalty
// ---------------------------------------------------------------------------
router.post(
  "/cancel",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user || !user.aiBotActive) {
      return res.status(400).json({
        success: false,
        message: "No active AI Bot contract to cancel.",
      });
    }

    const principal = Number(user.aiBotPrincipal || 0);
    const penalty = Number((principal * 0.15).toFixed(8));
    const refund = Number(Math.max(0, principal - penalty).toFixed(8));

    if (!(user.wallet instanceof Map)) user.wallet = new Map();
    const usdt = Number(user.wallet.get("USDT") || 0);
    user.wallet.set("USDT", Number((usdt + refund).toFixed(8)));
    user.markModified("wallet");

    const contractId = user.aiBotContractId;
    user.aiBotActive = false;
    user.aiBotLockDays = null;
    user.aiBotStartDate = null;
    user.aiBotEndDate = null;
    user.aiBotPrincipal = 0;
    user.aiBotContractId = null;
    user.aiBotContractAcceptedAt = null;
    await user.save();

    if (contractId) {
      await AiBotContract.findByIdAndUpdate(contractId, {
        status: "cancelled",
        claimedAt: new Date(),
        payoutAmount: refund,
      });
    }

    await Transaction.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "trade",
      side: "sell",
      symbol: "AI-BOT",
      amount: refund,
      usdValue: refund,
      status: "completed",
      reviewerNote: `AI Bot cancel · forfeit yield · 15% penalty $${penalty} · refund $${refund}`,
    });

    return res.json({
      success: true,
      message: `Cancelled. Yield forfeited. 15% penalty ($${penalty.toFixed(
        2
      )}) deducted. Refunded $${refund.toFixed(2)}.`,
      penalty,
      refund,
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
        useStakeTiers: m.useStakeTiers !== false,
        stakeThreshold: Number(m.stakeThreshold ?? 150),
        winPercentage: Math.max(0, Math.min(100, Number(m.winPercentage ?? 25))),
        lowPattern: Array.isArray(m.lowPattern)
          ? m.lowPattern.map((x) => (x === "win" ? "win" : "loss"))
          : ["win", "loss", "loss", "win"],
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

    const messages = [];
    if (req.body.aiBotCustomPercentage !== undefined) {
      const pct = Number(req.body.aiBotCustomPercentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 500) {
        return res.status(422).json({
          success: false,
          message: "Daily commission % must be 0–500.",
        });
      }
      user.aiBotCustomPercentage = pct;
      messages.push(`daily commission ${pct}%`);
      if (user.aiBotActive) {
        const contractFilter = user.aiBotContractId
          ? { _id: user.aiBotContractId }
          : { user: user._id, status: "active" };
        await AiBotContract.findOneAndUpdate(contractFilter, {
          customPercentage: pct,
        });
      }
    }

    if (req.body.aiBotAssignedLockDays !== undefined) {
      const days = Number(req.body.aiBotAssignedLockDays);
      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        return res.status(422).json({
          success: false,
          message: "aiBotAssignedLockDays must be 1–3650.",
        });
      }
      user.aiBotAssignedLockDays = days;
      messages.push(`lock ${days} days`);
    }

    if (!messages.length) {
      return res.status(422).json({
        success: false,
        message: "Provide aiBotCustomPercentage and/or aiBotAssignedLockDays.",
      });
    }

    await user.save();
    return res.json({
      success: true,
      message: `AI Bot updated for ${user.username}: ${messages.join(", ")}. Live daily commission applies immediately.`,
      user: {
        id: user._id,
        username: user.username,
        ...serializeUserBot(user),
      },
    });
  })
);

router.get(
  "/admin/users",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantUserFilter(req);
    const q = String(req.query.q || "").trim();
    const filter = {
      ...scope,
      deletedAt: null,
      role: "user",
    };
    if (q) {
      filter.$or = [
        { username: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { fullName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      ];
    }
    const users = await User.find(filter)
      .select(
        "username email fullName aiBotActive aiBotLockDays aiBotAssignedLockDays aiBotStartDate aiBotEndDate aiBotCustomPercentage aiBotPrincipal adminId"
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, users });
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
        "username email fullName aiBotActive aiBotLockDays aiBotAssignedLockDays aiBotStartDate aiBotEndDate aiBotCustomPercentage aiBotPrincipal adminId"
      )
      .sort({ aiBotStartDate: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, users });
  })
);

export default router;
