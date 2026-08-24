/**
 * =============================================================================
 *  NEXUS BACKEND — routes/wallet.js
 * =============================================================================
 *  User-facing wallet operations.
 *    POST /api/wallet/deposit-request
 *    POST /api/wallet/deposit-proof   (multipart: amount + screenshot)
 *    POST /api/wallet/withdraw-request  (holds funds immediately)
 *    GET  /api/wallet/transactions
 *    GET  /api/wallet/deposit-address/:symbol
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import crypto from "node:crypto";

import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadProof, proofPublicUrl } from "../middleware/upload.js";
import { emitChatMessage } from "../socket.js";
import { validatePromoForDeposit } from "./promo.js";

const router = Router();

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
      message: "Database is offline.",
    });
  }
  return next();
};

const generateMockAddress = (userId, symbol, network) => {
  const seed = `${userId}-${symbol}-${network}`;
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  if (network === "TRC20") return "T" + digest.slice(0, 33).toUpperCase();
  if (network === "ERC20") return "0x" + digest.slice(0, 40);
  if (network === "BEP20") return "0x" + digest.slice(0, 40);
  return digest.slice(0, 42).toUpperCase();
};

// ---------------------------------------------------------------------------
// GET /deposit-address/:symbol?network=TRC20
// ---------------------------------------------------------------------------
router.get(
  "/deposit-address/:symbol",
  requireAuth,
  asyncHandler(async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const network = (req.query.network || "TRC20").toString().toUpperCase();
    const address = generateMockAddress(req.auth.sub, symbol, network);
    return res.json({
      success: true,
      symbol,
      network,
      address,
      memo: null,
      minDeposit: symbol === "USDT" ? 10 : 0.0001,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /deposit-request
// ---------------------------------------------------------------------------
router.post(
  "/deposit-request",
  requireAuth,
  requireDatabase,
  [
    body("symbol").isString().trim().isLength({ min: 2, max: 10 }),
    body("amount").isFloat({ gt: 0 }),
    body("network").optional({ nullable: true, checkFalsy: true }).isString(),
    body("txHash").optional({ nullable: true, checkFalsy: true }).isString(),
    body("promoCode").optional({ nullable: true, checkFalsy: true }).isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const symbol = req.body.symbol.toUpperCase();
    const amount = Number(req.body.amount);
    let promoCode = null;
    let promoBonus = 0;
    let promoType = null;

    if (req.body.promoCode) {
      const check = await validatePromoForDeposit(req.body.promoCode, amount);
      if (!check.ok) {
        return res.status(422).json({
          success: false,
          error: "PromoError",
          message: check.message,
        });
      }
      promoCode = check.promo.code;
      promoBonus = check.bonus;
      promoType = check.promo.type;
    }

    const owner = await User.findById(req.auth.sub).select("adminId");
    const tx = await Transaction.create({
      user: req.auth.sub,
      adminId: owner?.adminId || null,
      kind: "deposit",
      symbol,
      amount,
      network: req.body.network || "TRC20",
      txHash: req.body.txHash || null,
      status: "pending",
      promoCode,
      promoBonus,
      promoType,
    });

    return res.status(201).json({
      success: true,
      message:
        promoBonus > 0
          ? `Deposit submitted with promo ${promoCode} (+$${promoBonus.toFixed(2)} on approval).`
          : "Deposit submitted — Pending Verification / Awaiting Admin Approval.",
      transaction: tx,
      promoBonus,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /deposit-proof — amount + screenshot → pending deposit + chat message
// ---------------------------------------------------------------------------
router.post(
  "/deposit-proof",
  requireAuth,
  requireDatabase,
  (req, res, next) => {
    uploadProof.single("proof")(req, res, (err) => {
      if (err) {
        return res.status(422).json({
          success: false,
          error: "ValidationError",
          message: err.message || "Invalid proof image.",
        });
      }
      return next();
    });
  },
  asyncHandler(async (req, res) => {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Enter a valid deposit amount greater than 0.",
      });
    }
    if (!req.file) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Upload a screenshot proof of your payment.",
      });
    }

    const symbol = (req.body.symbol || "USDT").toString().toUpperCase();
    const network = (req.body.network || "TRC20").toString().toUpperCase();
    const proofUrl = proofPublicUrl(req.file.filename);
    const owner = await User.findById(req.auth.sub).select("adminId");
    const tenantId = owner?.adminId || null;

    const tx = await Transaction.create({
      user: req.auth.sub,
      adminId: tenantId,
      kind: "deposit",
      symbol,
      amount,
      usdValue: amount,
      network,
      proofUrl,
      status: "pending",
      reviewerNote: null,
    });

    const msg = await Message.create({
      user: req.auth.sub,
      adminId: tenantId,
      from: "user",
      body: `Settlement receipt submitted · $${amount.toFixed(2)} ${symbol} (${network})\nStatus: Pending Verification / Awaiting Admin Approval`,
      messageType: "deposit_proof",
      attachmentUrl: proofUrl,
      meta: { transactionId: tx._id.toString(), amount, symbol, network },
      readByAdmin: false,
      readByUser: true,
    });

    emitChatMessage(req.auth.sub, msg);

    return res.status(201).json({
      success: true,
      message:
        "Screenshot received. Deposit is Pending Verification / Awaiting Admin Approval.",
      transaction: tx,
      chatMessage: msg,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /withdraw-request — hold funds immediately pending admin review
// ---------------------------------------------------------------------------
router.post(
  "/withdraw-request",
  requireAuth,
  requireDatabase,
  [
    body("symbol").isString().trim().isLength({ min: 2, max: 10 }),
    body("amount").isFloat({ gt: 0 }),
    body("address").isString().trim().isLength({ min: 6, max: 200 }),
    body("network").optional({ nullable: true, checkFalsy: true }).isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const symbol = req.body.symbol.toUpperCase();
    const amount = Number(req.body.amount);

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    if (!(user.wallet instanceof Map)) {
      user.wallet = new Map(Object.entries(user.wallet || {}));
    }
    if (!(user.accountBalances instanceof Map)) {
      user.accountBalances = new Map();
    }
    let current = Number(user.wallet.get(symbol) || 0);
    if (symbol === "USDT") {
      const delivery = Number(user.accountBalances.get("delivery") || 0);
      if (current < amount && delivery >= amount) {
        current = delivery;
        user.wallet.set("USDT", delivery);
      }
    }
    if (current < amount) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFundsError",
        message: `Not enough ${symbol}. You have ${current}.`,
      });
    }

    // Hold: deduct immediately so balance reflects pending withdrawal
    user.wallet.set(symbol, Number((current - amount).toFixed(8)));
    if (symbol === "USDT") {
      if (!(user.accountBalances instanceof Map)) {
        user.accountBalances = new Map();
      }
      user.accountBalances.set(
        "delivery",
        Number(user.wallet.get("USDT") || 0)
      );
      user.markModified("accountBalances");
    }
    user.markModified("wallet");
    await user.save();

    const method = String(req.body.method || "crypto").toLowerCase();
    const tx = await Transaction.create({
      user: req.auth.sub,
      adminId: user.adminId || null,
      kind: "withdrawal",
      symbol,
      amount,
      usdValue: amount,
      address: req.body.address,
      network: req.body.network || (method === "bank" ? "BANK" : "TRC20"),
      status: "pending",
      fundsHeld: true,
      reviewerNote:
        method === "bank"
          ? `Bank card withdraw · ${req.body.cardName || ""}`
          : null,
    });

    const wallet =
      user.wallet instanceof Map
        ? Object.fromEntries(user.wallet)
        : { ...(user.wallet || {}) };

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted — Pending Approval.",
      transaction: tx,
      wallet,
    });
  })
);

// ---------------------------------------------------------------------------
// GET /transactions — current user's history
// ---------------------------------------------------------------------------
router.get(
  "/transactions",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const kind = req.query.kind;
    const filter = { user: req.auth.sub };
    if (kind) filter.kind = kind;
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ success: true, transactions });
  })
);

export default router;
