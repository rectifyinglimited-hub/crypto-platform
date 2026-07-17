/**
 * =============================================================================
 *  NEXUS BACKEND — routes/admin.js
 * =============================================================================
 *  Admin-only endpoints. All routes gated by requireAuth + requireAdmin.
 *
 *    GET    /api/admin/overview
 *    GET    /api/admin/invite-codes
 *    POST   /api/admin/invite-codes
 *    DELETE /api/admin/invite-codes/:id
 *    GET    /api/admin/users
 *    PUT    /api/admin/users/:id/balance
 *    PUT    /api/admin/users/:id/ban
 *    GET    /api/admin/transactions             (?status=pending)
 *    PUT    /api/admin/transactions/:id/verify  { action: approve|reject, note? }
 *    GET    /api/admin/kyc-requests             (?status=pending|approved|rejected)
 *    PATCH  /api/admin/users/:id/kyc            { action: approve|reject, note? }
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import Transaction from "../models/Transaction.js";
import GatewaySetting from "../models/GatewaySetting.js";
import SecondsTrade from "../models/SecondsTrade.js";
import { settleTrade } from "./secondsTrade.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const sendValidationError = (res, errors) =>
  res.status(422).json({
    success: false,
    error: "ValidationError",
    message: "One or more fields are invalid.",
    details: errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    })),
  });

const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "ServiceUnavailable",
      message: "Database is offline. Admin actions unavailable.",
    });
  }
  return next();
};

const randomCode = (len = 8) =>
  crypto
    .randomBytes(len)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, len);

// ---------------------------------------------------------------------------
// GET /overview
// ---------------------------------------------------------------------------
router.get(
  "/overview",
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const [totalUsers, admins, banned, codes, pendingTx] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ banned: true }),
      InviteCode.find({}).lean(),
      Transaction.countDocuments({ status: "pending" }),
    ]);

    const activeCodes = codes.filter((c) => {
      if (!c.active) return false;
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
      if ((c.usedBy?.length || 0) >= (c.maxUses || 1)) return false;
      return true;
    }).length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        admins,
        bannedUsers: banned,
        totalInviteCodes: codes.length,
        activeInviteCodes: activeCodes,
        pendingTransactions: pendingTx,
        mockVolume24h: 4_286_712.55,
        mockTrades24h: 18_294,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// INVITE CODES
// ---------------------------------------------------------------------------
router.get(
  "/invite-codes",
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const codes = await InviteCode.find({})
      .populate("createdBy", "username email fullName")
      .sort({ createdAt: -1 });
    return res.json({ success: true, codes });
  })
);

router.post(
  "/invite-codes",
  requireDatabase,
  [
    body("code")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ min: 4, max: 32 })
      .matches(/^[A-Z0-9-]+$/i)
      .withMessage("Code may only contain letters, numbers, dashes."),
    body("role").optional().isIn(["user", "admin"]),
    body("maxUses").optional().isInt({ min: 1, max: 1_000_000 }),
    body("expiresAt")
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601(),
    body("notes")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 200 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const rawCode = (req.body.code || randomCode(8)).toUpperCase();
    const existing = await InviteCode.findOne({ code: rawCode }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "That code already exists.",
      });
    }

    const created = await InviteCode.create({
      code: rawCode,
      role: req.body.role || "user",
      maxUses: req.body.maxUses || 1,
      expiresAt: req.body.expiresAt || null,
      notes: req.body.notes || null,
      createdBy: req.auth.sub,
    });
    return res.status(201).json({ success: true, code: created });
  })
);

router.delete(
  "/invite-codes/:id",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid invite code id.",
      });
    }
    const code = await InviteCode.findById(id);
    if (!code) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Invite code not found.",
      });
    }
    if ((code.usedBy?.length || 0) > 0) {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "Cannot delete a code that has been redeemed.",
      });
    }
    await code.deleteOne();
    return res.json({ success: true, message: "Invite code removed." });
  })
);

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
router.get(
  "/users",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    const filter = { deletedAt: null };
    if (q) {
      filter.$and = [
        { deletedAt: null },
        {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
            { fullName: { $regex: q, $options: "i" } },
          ],
        },
      ];
      delete filter.deletedAt;
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(500);
    return res.json({ success: true, users });
  })
);

router.put(
  "/users/:id/balance",
  requireDatabase,
  [
    body("symbol").isString().trim().isLength({ min: 2, max: 10 }),
    body("amount").isFloat(),
    body("mode").optional().isIn(["set", "add"]),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }
    const symbol = req.body.symbol.toUpperCase();
    const amount = Number(req.body.amount);
    const mode = req.body.mode || "set";

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    const current = user.wallet.get(symbol) || 0;
    const next = mode === "add" ? current + amount : amount;
    // Negative balances are allowed (forced-loss deficits / admin corrections)
    user.wallet.set(symbol, next);
    user.markModified("wallet");
    await user.save();

    const wallet =
      user.wallet instanceof Map
        ? Object.fromEntries(user.wallet)
        : { ...(user.wallet || {}) };

    return res.json({
      success: true,
      message: `Balance for ${symbol} updated.`,
      user: {
        ...user.toObject({ virtuals: true }),
        password: undefined,
        wallet,
        id: user._id.toString(),
      },
    });
  })
);

router.put(
  "/users/:id/ban",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    if (user._id.toString() === req.auth.sub) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "You cannot ban your own account.",
      });
    }
    const nextBanned =
      typeof req.body.banned === "boolean" ? req.body.banned : !user.banned;
    user.banned = nextBanned;
    await user.save();
    return res.json({
      success: true,
      message: nextBanned ? "User banned." : "User set to Active.",
      user,
    });
  })
);

// DELETE /users/:id — soft-delete (hidden from directory, cannot login)
router.delete(
  "/users/:id",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }
    const user = await User.findById(id);
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    if (user._id.toString() === req.auth.sub) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "You cannot delete your own account.",
      });
    }
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Admin accounts cannot be deleted from this panel.",
      });
    }

    user.deletedAt = new Date();
    user.banned = true;
    await user.save();

    return res.json({
      success: true,
      message: "User deleted and removed from the directory.",
      userId: user._id,
    });
  })
);

// PUT /users/:id/password — admin resets user password
router.put(
  "/users/:id/password",
  requireDatabase,
  [
    body("newPassword")
      .isString()
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be at least 8 characters."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(id).select("+password");
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    user.password = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();

    return res.json({
      success: true,
      message: `Password reset for @${user.username}. Share the new password securely.`,
    });
  })
);

// ---------------------------------------------------------------------------
// TRADE CONTROL — Force Win / Force Loss / Normal per-user risk switch
// ---------------------------------------------------------------------------
router.put(
  "/users/:id/trade-control",
  requireDatabase,
  [
    body("state")
      .isIn(["normal", "force_win", "force_loss"])
      .withMessage("state must be normal, force_win or force_loss."),
    body("percentage")
      .isFloat({ min: 0, max: 100 })
      .withMessage("percentage must be between 0 and 100."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    user.tradeControlState = req.body.state;
    user.tradeControlPercentage = Number(req.body.percentage);
    await user.save();

    return res.json({
      success: true,
      message:
        req.body.state === "normal"
          ? "Trade control cleared — normal market execution."
          : `Trade control set to ${req.body.state.replace("_", " ")} at ${
              req.body.percentage
            }%.`,
      user,
    });
  })
);

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------
router.get(
  "/transactions",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const kind = req.query.kind;
    const filter = {};
    if (status) filter.status = status;
    if (kind) filter.kind = kind;

    const transactions = await Transaction.find(filter)
      .populate("user", "username email fullName")
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json({ success: true, transactions });
  })
);

router.put(
  "/transactions/:id/verify",
  requireDatabase,
  [
    body("action").isIn(["approve", "reject"]),
    body("note")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 300 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid transaction id.",
      });
    }

    const tx = await Transaction.findById(id);
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Transaction not found.",
      });
    }
    if (tx.status !== "pending") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `Transaction already ${tx.status}.`,
      });
    }

    const action = req.body.action;

    if (action === "approve") {
      const user = await User.findById(tx.user);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Target user vanished.",
        });
      }
      const current = user.wallet.get(tx.symbol) || 0;

      if (tx.kind === "deposit") {
        user.wallet.set(tx.symbol, current + tx.amount);
        user.markModified("wallet");
        await user.save();
      } else if (tx.kind === "withdrawal") {
        // Funds already held on submit — only deduct again if not held
        if (!tx.fundsHeld) {
          if (current < tx.amount) {
            return res.status(400).json({
              success: false,
              error: "InsufficientFundsError",
              message: `User has ${current} ${tx.symbol}, needs ${tx.amount}.`,
            });
          }
          user.wallet.set(tx.symbol, current - tx.amount);
          user.markModified("wallet");
          await user.save();
        }
      }
      tx.status = "approved";
    } else {
      // Decline: refund held withdrawal amounts
      if (tx.kind === "withdrawal" && tx.fundsHeld) {
        const user = await User.findById(tx.user);
        if (user) {
          const current = user.wallet.get(tx.symbol) || 0;
          user.wallet.set(tx.symbol, current + tx.amount);
          user.markModified("wallet");
          await user.save();
          tx.fundsHeld = false;
        }
      }
      tx.status = "rejected";
    }

    tx.reviewedBy = req.auth.sub;
    tx.reviewedAt = new Date();
    tx.reviewerNote = req.body.note || null;
    await tx.save();

    const populated = await Transaction.findById(tx._id).populate(
      "user",
      "username email fullName trc20Address"
    );

    return res.json({
      success: true,
      message: `Transaction ${action === "approve" ? "approved" : "declined"}.`,
      transaction: populated,
    });
  })
);

// ---------------------------------------------------------------------------
// KYC — list pending KYC requests
// ---------------------------------------------------------------------------
router.get(
  "/kyc-requests",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const status = (req.query.status || "pending").toString();
    const filter = { "kyc.status": status };
    const users = await User.find(filter).sort({ "kyc.submittedAt": -1 }).limit(200);
    return res.json({ success: true, users });
  })
);

// ---------------------------------------------------------------------------
// PATCH /users/:id/kyc — approve or reject a KYC submission
// ---------------------------------------------------------------------------
router.patch(
  "/users/:id/kyc",
  requireDatabase,
  [
    body("action").isIn(["approve", "reject"]),
    body("note")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 300 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    if (!user.kyc || user.kyc.status !== "pending") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `No pending KYC to review (current: ${user.kyc?.status || "unverified"}).`,
      });
    }

    user.kyc.status = req.body.action === "approve" ? "approved" : "rejected";
    user.kyc.reviewedAt = new Date();
    user.kyc.reviewedBy = req.auth.sub;
    user.kyc.reviewerNote = req.body.note || null;
    user.markModified("kyc");
    await user.save();

    return res.json({
      success: true,
      message: `KYC ${req.body.action}d.`,
      user,
    });
  })
);

// ---------------------------------------------------------------------------
// GATEWAY SETTINGS
// ---------------------------------------------------------------------------
// GET /gateway-settings — admin view of the current platform config
router.get(
  "/gateway-settings",
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const doc = await GatewaySetting.getSingleton();
    return res.json({ success: true, settings: doc });
  })
);

// POST /gateway-settings — save/replace platform deposit credentials
router.post(
  "/gateway-settings",
  requireDatabase,
  [
    body("bankName")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 120 }),
    body("accountTitle")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 120 }),
    body("accountNumber")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 60 }),
    body("iban")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 40 }),
    body("easyPaisaNumber")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 30 }),
    body("jazzCashNumber")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 30 }),
    body("usdtTrc20Address")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 80 }),
    body("usdtErc20Address")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 80 }),
    body("instructions")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 800 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const doc = await GatewaySetting.getSingleton();
    const fields = [
      "bankName",
      "accountTitle",
      "accountNumber",
      "iban",
      "easyPaisaNumber",
      "jazzCashNumber",
      "usdtTrc20Address",
      "usdtErc20Address",
      "instructions",
    ];
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        const v = req.body[f];
        doc[f] = v === "" ? null : v;
      }
    }
    doc.updatedBy = req.auth.sub;
    await doc.save();

    return res.json({
      success: true,
      message: "Gateway settings saved.",
      settings: doc,
    });
  })
);

// ===========================================================================
// Seconds Trading — Admin Control Room
// ===========================================================================

const serializeAdminTrade = (t, userDoc) => {
  const doc = typeof t.toObject === "function" ? t.toObject() : { ...t };
  const now = Date.now();
  const expiresAt = new Date(doc.expiresAt).getTime();
  const remainingSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return {
    ...doc,
    remainingSec,
    user: userDoc
      ? {
          id: userDoc._id,
          fullName: userDoc.fullName,
          username: userDoc.username,
          email: userDoc.email,
          tradeControlState: userDoc.tradeControlState,
          tradeControlPercentage: userDoc.tradeControlPercentage,
        }
      : doc.user,
  };
};

// GET /seconds-trades/active — live open trades for admin alerts
router.get(
  "/seconds-trades/active",
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const trades = await SecondsTrade.find({ status: "open" })
      .sort({ openedAt: -1 })
      .limit(200)
      .populate("user", "fullName username email tradeControlState tradeControlPercentage");

    res.json({
      success: true,
      trades: trades.map((t) =>
        serializeAdminTrade(t, t.user && typeof t.user === "object" ? t.user : null)
      ),
      serverTime: new Date().toISOString(),
    });
  })
);

// GET /users/:id/control-room — dedicated per-user management view
router.get(
  "/users/:id/control-room",
  requireDatabase,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    const [openTrades, recentTrades, recentTx, pendingTx] = await Promise.all([
      SecondsTrade.find({ user: user._id, status: "open" }).sort({
        openedAt: -1,
      }),
      SecondsTrade.find({
        user: user._id,
        status: { $in: ["won", "lost"] },
      })
        .sort({ settledAt: -1 })
        .limit(30),
      Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(40),
      Transaction.find({
        user: user._id,
        status: "pending",
        kind: { $in: ["deposit", "withdrawal"] },
      }).sort({ createdAt: -1 }),
    ]);

    const wallet =
      user.wallet instanceof Map
        ? Object.fromEntries(user.wallet)
        : { ...(user.wallet || {}) };
    const chartBias =
      user.chartBias instanceof Map
        ? Object.fromEntries(user.chartBias)
        : { ...(user.chartBias || {}) };

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        trc20Address: user.trc20Address || null,
        profileCompletedAt: user.profileCompletedAt || null,
        role: user.role,
        banned: user.banned,
        tradeControlState: user.tradeControlState,
        tradeControlPercentage: user.tradeControlPercentage,
        wallet,
        chartBias,
        kyc: user.kyc,
        createdAt: user.createdAt,
      },
      openTrades: openTrades.map((t) => serializeAdminTrade(t, user)),
      recentTrades: recentTrades.map((t) => serializeAdminTrade(t, user)),
      transactions: recentTx,
      pendingDeposits: pendingTx.filter((t) => t.kind === "deposit"),
      pendingWithdrawals: pendingTx.filter((t) => t.kind === "withdrawal"),
      serverTime: new Date().toISOString(),
    });
  })
);

// PUT /seconds-trades/:id/force-outcome — Win / Loss with manual USD amount
router.put(
  "/seconds-trades/:id/force-outcome",
  requireDatabase,
  [
    body("outcome")
      .isIn(["win", "loss", "clear"])
      .withMessage("outcome must be win, loss, or clear."),
    body("amount").optional().isFloat(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid trade id.",
      });
    }

    const trade = await SecondsTrade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Trade not found.",
      });
    }

    if (trade.status === "won" || trade.status === "lost" || trade.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Trade is already settled.",
        trade: serializeAdminTrade(trade),
      });
    }

    if (req.body.outcome === "clear") {
      if (trade.status !== "open") {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Can only clear force on an open trade.",
        });
      }
      trade.forcedOutcome = null;
      trade.forcedAmount = null;
      await trade.save();
      return res.json({
        success: true,
        message: "Forced outcome cleared.",
        trade: serializeAdminTrade(trade),
      });
    }

    if (
      (req.body.amount == null || req.body.amount === "") &&
      trade.forcedAmount == null
    ) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message:
          "Enter Manual Balance Add amount (e.g. 25). WIN credits stake + amount.",
      });
    }

    const forceAmount =
      req.body.amount != null && req.body.amount !== ""
        ? Number(req.body.amount)
        : Number(trade.forcedAmount);

    // Single atomic settle with Force WIN/LOSS — also reclaim stuck "settling"
    const settled = await settleTrade(trade._id, {
      forceOutcome: req.body.outcome,
      forceAmount,
      exitPriceHint: Number(trade.entryPrice),
    });

    if (!settled || (settled.status !== "won" && settled.status !== "lost")) {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "Trade could not be settled. Refresh and try again.",
        trade: serializeAdminTrade(settled || trade),
      });
    }

    // If another process already settled as market before our claim, warn admin
    if (
      settled.settleReason !== "admin_force" ||
      settled.forcedOutcome !== req.body.outcome
    ) {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message:
          "Trade was already settled by the market timer. Open a new trade and click Force WIN/LOSS before the timer hits 0.",
        trade: serializeAdminTrade(settled),
      });
    }

    const owner = await User.findById(trade.user);
    const wallet =
      owner?.wallet instanceof Map
        ? Object.fromEntries(owner.wallet)
        : { ...(owner?.wallet || {}) };

    const add = Math.abs(Number(settled.forcedAmount || forceAmount || 0));
    const msg =
      settled.status === "won"
        ? `Force WIN · credited $${Number(settled.payout || 0).toFixed(
            2
          )} (stake $${Number(settled.stake).toFixed(2)} + add $${add.toFixed(
            2
          )}). Wallet now $${Number(wallet.USDT || 0).toFixed(2)} USDT.`
        : `Force LOSS · deducted $${add.toFixed(
            2
          )}. Wallet now $${Number(wallet.USDT || 0).toFixed(2)} USDT.`;

    return res.json({
      success: true,
      message: msg,
      trade: serializeAdminTrade(settled),
      wallet,
    });
  })
);

// PUT /seconds-trades/:id/price-bias — Graph UP / DOWN for this trade session
router.put(
  "/seconds-trades/:id/price-bias",
  requireDatabase,
  [
    body("direction")
      .isIn(["up", "down", "reset"])
      .withMessage("direction must be up, down, or reset."),
    body("step").optional().isFloat({ gt: 0, max: 10 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid trade id.",
      });
    }

    const trade = await SecondsTrade.findById(req.params.id);
    if (!trade || trade.status !== "open") {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Open trade not found.",
      });
    }

    const step = Number(req.body.step) || 2;
    if (req.body.direction === "reset") {
      trade.priceBiasPercent = 0;
    } else if (req.body.direction === "up") {
      trade.priceBiasPercent = Number(trade.priceBiasPercent || 0) + step;
    } else {
      trade.priceBiasPercent = Number(trade.priceBiasPercent || 0) - step;
    }
    await trade.save();

    // Mirror onto user chartBias so whole chart moves for this asset
    const user = await User.findById(trade.user);
    if (user) {
      if (!user.chartBias) user.chartBias = new Map();
      const cur = Number(user.chartBias.get(trade.asset) || 0);
      const step = Number(req.body.step) || 2;
      if (req.body.direction === "reset") {
        user.chartBias.set(trade.asset, 0);
      } else if (req.body.direction === "up") {
        user.chartBias.set(trade.asset, cur + step);
      } else {
        user.chartBias.set(trade.asset, cur - step);
      }
      await user.save();
    }

    res.json({
      success: true,
      message: `Graph nudged ${req.body.direction}.`,
      trade: serializeAdminTrade(trade, user),
      chartBias: user?.chartBias
        ? Object.fromEntries(user.chartBias)
        : {},
    });
  })
);

// PUT /users/:id/chart-bias — direct user-level chart control
router.put(
  "/users/:id/chart-bias",
  requireDatabase,
  [
    body("symbol").isString().trim().isLength({ min: 2, max: 12 }),
    body("direction").isIn(["up", "down", "reset"]),
    body("step").optional().isFloat({ gt: 0, max: 10 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    const symbol = String(req.body.symbol).toUpperCase();
    const step = Number(req.body.step) || 0.35;
    if (!user.chartBias) user.chartBias = new Map();
    const cur = Number(user.chartBias.get(symbol) || 0);

    if (req.body.direction === "reset") user.chartBias.set(symbol, 0);
    else if (req.body.direction === "up")
      user.chartBias.set(symbol, cur + step);
    else user.chartBias.set(symbol, cur - step);

    await user.save();

    res.json({
      success: true,
      chartBias: Object.fromEntries(user.chartBias),
      symbol,
      value: user.chartBias.get(symbol),
    });
  })
);

export default router;
