/**
 * AI Bot Trading — contract lock, yield %, activate / claim.
 */
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import AiBotContract from "../models/AiBotContract.js";
import AiBotLockRequest, {
  serializeAiBotLockRequest,
} from "../models/AiBotLockRequest.js";
import PlatformConfig from "../models/PlatformConfig.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { tenantDocFilter, tenantUserFilter } from "../middleware/tenant.js";
import { normalizeSmartCopy } from "../lib/smartCopy.js";
import { emitWalletUpdate, emitAiBotLockRequest } from "../socket.js";

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

function serializeUserBot(user, pendingRequest = null) {
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
    pendingRequest: pendingRequest
      ? serializeAiBotLockRequest(pendingRequest)
      : null,
  };
}

function clampLockDays(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(3650, n);
}

async function findPendingLock(userId) {
  return AiBotLockRequest.findOne({ user: userId, status: "pending" });
}

async function refundHeldPrincipal(user, amount, note) {
  const refund = Number(Number(amount || 0).toFixed(8));
  if (!(refund > 0)) return walletObj(user.wallet);
  if (!(user.wallet instanceof Map)) user.wallet = new Map();
  const usdt = Number(user.wallet.get("USDT") || 0);
  user.wallet.set("USDT", Number((usdt + refund).toFixed(8)));
  user.markModified("wallet");
  await Transaction.create({
    user: user._id,
    adminId: user.adminId || null,
    kind: "trade",
    side: "buy",
    symbol: "AI-BOT",
    amount: refund,
    usdValue: refund,
    status: "completed",
    reviewerNote: note,
    source: "ai_future",
    ledgerDelta: refund,
  });
  return walletObj(user.wallet);
}

async function startApprovedLock(user, request, lockDays, contractVersion) {
  const days = clampLockDays(lockDays);
  const principal = Number(request.principal || 0);
  const yieldPct = Number(
    request.yieldPct || user.aiBotCustomPercentage || 8
  );
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 86400000);

  user.aiBotActive = true;
  user.aiBotLockDays = days;
  user.aiBotAssignedLockDays = days;
  user.aiBotStartDate = startDate;
  user.aiBotEndDate = endDate;
  user.aiBotCustomPercentage = yieldPct;
  user.aiBotPrincipal = principal;
  user.aiBotContractAcceptedAt = new Date();
  user.aiBotPendingRequestId = null;

  const contract = await AiBotContract.create({
    user: user._id,
    adminId: user.adminId || null,
    lockDays: days,
    startDate,
    endDate,
    principal,
    customPercentage: yieldPct,
    status: "active",
    contractAcceptedAt: user.aiBotContractAcceptedAt,
    contractVersion: contractVersion || request.contractVersion || "v1.0",
  });

  user.aiBotContractId = contract._id;
  normalizeSmartCopy(user);
  await user.save();

  request.status = "approved";
  request.approvedDays = days;
  request.reviewedAt = new Date();
  await request.save();

  return contract;
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
    const lockOptions = Array.isArray(defaults.lockOptions) && defaults.lockOptions.length
      ? defaults.lockOptions.map(Number).filter((n) => n > 0)
      : [7, 15, 30, 60, 90];
    const pending = user ? await findPendingLock(user._id) : null;
    const wallet = user ? walletObj(user.wallet) : {};
    return res.json({
      success: true,
      defaults: {
        defaultYieldPct: defaults.defaultYieldPct ?? 8,
        minPrincipal: defaults.minPrincipal ?? 50,
        lockOptions,
        contractVersion: defaults.contractVersion || "v1.0",
        adminAssignedOnly: false,
      },
      bot: user ? serializeUserBot(user, pending) : null,
      wallet,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /request (and /activate) — user picks days; funds held until admin approves
// ---------------------------------------------------------------------------
async function submitLockRequest(req, res) {
  const principal = Number(Number(req.body.principal).toFixed(8));
  const accepted = Boolean(req.body.contractAccepted);
  const contractVersion = String(req.body.contractVersion || "v1.0");
  const lockDays = clampLockDays(req.body.lockDays);

  if (!accepted) {
    return res.status(422).json({
      success: false,
      message: "You must accept the AI Algorithmic Trading Terms.",
    });
  }
  if (!lockDays) {
    return res.status(422).json({
      success: false,
      message: "Choose how many lock days you want.",
    });
  }

  const platform = await PlatformConfig.getSingleton();
  const defaults = platform.aiBotDefaults || {};
  const minPrincipal = Number(defaults.minPrincipal ?? 50);

  const user = await User.findById(req.auth.sub);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }
  if (user.aiBotActive) {
    return res.status(400).json({
      success: false,
      message: "An AI Futures contract is already active.",
    });
  }

  const existing = await findPendingLock(user._id);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: "RequestPending",
      message:
        "Your lock request is waiting for admin approval. You can cancel it to send a new one.",
      pendingRequest: serializeAiBotLockRequest(existing),
    });
  }

  if (!Number.isFinite(principal) || principal < minPrincipal) {
    return res.status(422).json({
      success: false,
      message: `Minimum principal is $${minPrincipal}.`,
    });
  }

  if (!(user.wallet instanceof Map)) user.wallet = new Map();
  const usdt = Number(user.wallet.get("USDT") || 0);
  if (!(usdt > 0) || principal > usdt + 1e-8) {
    return res.status(422).json({
      success: false,
      error: "InsufficientFunds",
      message:
        usdt <= 0
          ? "Trading Wallet is empty. Deposit USDT to start AI Futures."
          : `Need ${principal} USDT — wallet has ${usdt.toFixed(2)}. Deposit to continue.`,
    });
  }

  const yieldPct =
    user.aiBotCustomPercentage != null &&
    Number.isFinite(Number(user.aiBotCustomPercentage))
      ? Number(user.aiBotCustomPercentage)
      : Number(defaults.defaultYieldPct ?? 8);

  user.wallet.set("USDT", Number(Math.max(0, usdt - principal).toFixed(8)));
  user.markModified("wallet");

  let request;
  try {
    request = await AiBotLockRequest.create({
      user: user._id,
      adminId: user.adminId || null,
      requestedDays: lockDays,
      principal,
      yieldPct,
      status: "pending",
      contractVersion,
    });
  } catch (err) {
    user.wallet.set("USDT", usdt);
    user.markModified("wallet");
    await user.save();
    if (err?.code === 11000) {
      const again = await findPendingLock(user._id);
      return res.status(409).json({
        success: false,
        error: "RequestPending",
        message:
          "Your lock request is waiting for admin approval. You can cancel it to send a new one.",
        pendingRequest: serializeAiBotLockRequest(again),
      });
    }
    throw err;
  }

  user.aiBotPendingRequestId = request._id;
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
    reviewerNote: `AI Futures request ${lockDays}d · $${principal} held for admin approval`,
    source: "ai_future",
    ledgerDelta: -principal,
  });

  const wallet = walletObj(user.wallet);
  try {
    emitWalletUpdate(user._id, wallet, {
      reason: "ai_lock_request",
      requestId: String(request._id),
    });
    emitAiBotLockRequest(request, user, { type: "requested" });
  } catch {
    /* ignore socket failures */
  }

  return res.status(201).json({
    success: true,
    message: `Request sent for ${lockDays} days. Admin will approve or adjust the lock.`,
    bot: serializeUserBot(user, request),
    pendingRequest: serializeAiBotLockRequest(request),
    wallet,
  });
}

router.post("/request", requireAuth, requireDatabase, asyncHandler(submitLockRequest));
router.post("/activate", requireAuth, requireDatabase, asyncHandler(submitLockRequest));

router.post(
  "/request/cancel",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const request = await findPendingLock(user._id);
    if (!request) {
      return res.status(400).json({
        success: false,
        message: "No pending AI Futures request to cancel.",
      });
    }

    request.status = "cancelled";
    request.reviewedAt = new Date();
    request.reviewNote = "Cancelled by user";
    await request.save();

    await refundHeldPrincipal(
      user,
      request.principal,
      `AI Futures request cancelled · refund $${Number(request.principal || 0).toFixed(2)}`
    );
    user.aiBotPendingRequestId = null;
    await user.save();

    const wallet = walletObj(user.wallet);
    try {
      emitWalletUpdate(user._id, wallet, {
        reason: "ai_lock_cancelled",
        requestId: String(request._id),
      });
      emitAiBotLockRequest(request, user, { type: "cancelled" });
    } catch {
      /* ignore */
    }

    return res.json({
      success: true,
      message: "Request cancelled. Principal returned to Trading Wallet.",
      bot: serializeUserBot(user, null),
      wallet,
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
    normalizeSmartCopy(user);
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
      source: "ai_future",
      ledgerDelta: payout,
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
    normalizeSmartCopy(user);
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
      source: "ai_future",
      ledgerDelta: refund,
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
  "/admin/requests",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const status = req.query.status ? String(req.query.status) : "pending";
    const userId = req.query.userId ? String(req.query.userId) : null;
    const filter = { ...scope };
    if (status && status !== "all") filter.status = status;
    if (userId && mongoose.isValidObjectId(userId)) {
      filter.user = userId;
    }
    const requests = await AiBotLockRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "username email fullName aiBotCustomPercentage aiBotActive")
      .lean();
    return res.json({
      success: true,
      requests: requests.map(serializeAiBotLockRequest),
    });
  })
);

router.post(
  "/admin/requests/:id/review",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const request = await AiBotLockRequest.findOne({
      _id: req.params.id,
      ...scope,
    });
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Lock request not found.",
      });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    const action = String(req.body.action || "").toLowerCase();
    const user = await User.findById(request.user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (action === "reject") {
      request.status = "rejected";
      request.reviewedBy = req.auth.sub;
      request.reviewedAt = new Date();
      request.reviewNote = String(req.body.note || "Rejected by admin");
      await request.save();
      await refundHeldPrincipal(
        user,
        request.principal,
        `AI Futures request rejected · refund $${Number(request.principal || 0).toFixed(2)}`
      );
      user.aiBotPendingRequestId = null;
      await user.save();
      const wallet = walletObj(user.wallet);
      try {
        emitWalletUpdate(user._id, wallet, {
          reason: "ai_lock_rejected",
          requestId: String(request._id),
        });
        emitAiBotLockRequest(request, user, { type: "rejected" });
      } catch {
        /* ignore */
      }
      return res.json({
        success: true,
        message: `Rejected ${user.username || "user"} lock request. Principal refunded.`,
        request: serializeAiBotLockRequest(request),
        bot: serializeUserBot(user, null),
        wallet,
      });
    }

    if (action !== "approve") {
      return res.status(422).json({
        success: false,
        message: "action must be approve or reject.",
      });
    }

    const days = clampLockDays(
      req.body.lockDays != null ? req.body.lockDays : request.requestedDays
    );
    if (!days) {
      return res.status(422).json({
        success: false,
        message: "Set lock days (1–3650) before approving.",
      });
    }
    if (user.aiBotActive) {
      await refundHeldPrincipal(
        user,
        request.principal,
        `AI Futures request auto-refund · user already has an active lock`
      );
      request.status = "rejected";
      request.reviewNote = "User already has an active contract";
      request.reviewedBy = req.auth.sub;
      request.reviewedAt = new Date();
      await request.save();
      user.aiBotPendingRequestId = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "User already has an active AI Futures contract.",
      });
    }

    request.reviewedBy = req.auth.sub;
    request.reviewNote = String(req.body.note || "");
    const contract = await startApprovedLock(
      user,
      request,
      days,
      request.contractVersion
    );
    const wallet = walletObj(user.wallet);
    try {
      emitWalletUpdate(user._id, wallet, {
        reason: "ai_lock_approved",
        requestId: String(request._id),
      });
      emitAiBotLockRequest(request, user, {
        type: "approved",
        approvedDays: days,
      });
    } catch {
      /* ignore */
    }

    return res.json({
      success: true,
      message: `Approved ${days} day lock for ${user.username || "user"}.`,
      request: serializeAiBotLockRequest(request),
      contract,
      bot: serializeUserBot(user, null),
      wallet,
    });
  })
);

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
          message: "Lock days must be 1–3650.",
        });
      }
      user.aiBotAssignedLockDays = days;
      messages.push(`lock ${days} days`);
      if (user.aiBotActive && user.aiBotStartDate) {
        user.aiBotLockDays = days;
        user.aiBotEndDate = new Date(
          new Date(user.aiBotStartDate).getTime() + days * 86400000
        );
        const contractFilter = user.aiBotContractId
          ? { _id: user.aiBotContractId }
          : { user: user._id, status: "active" };
        await AiBotContract.findOneAndUpdate(contractFilter, {
          lockDays: days,
          endDate: user.aiBotEndDate,
        });
        messages.push("active lock dates updated");
      }
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
