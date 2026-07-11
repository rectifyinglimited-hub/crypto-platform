/**
 * =============================================================================
 *  NEXUS BACKEND — routes/wallet.js
 * =============================================================================
 *  User-facing wallet operations.
 *    POST /api/wallet/deposit-request
 *      { symbol, amount, network?, txHash? }
 *    POST /api/wallet/withdraw-request
 *      { symbol, amount, network?, address }
 *    GET  /api/wallet/transactions
 *    GET  /api/wallet/deposit-address/:symbol
 *
 *  Deposit and withdrawal requests are created as PENDING transactions and
 *  require admin approval (routes/admin.js) before balances change.
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import crypto from "node:crypto";

import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";

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

// Deterministic mock address per user+symbol so the same string is
// returned on every reload — perfect for demo/testing.
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
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const symbol = req.body.symbol.toUpperCase();
    const tx = await Transaction.create({
      user: req.auth.sub,
      kind: "deposit",
      symbol,
      amount: Number(req.body.amount),
      network: req.body.network || "TRC20",
      txHash: req.body.txHash || null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Deposit request submitted. An admin will review it shortly.",
      transaction: tx,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /withdraw-request
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

    // Verify user has enough balance BEFORE creating the pending request.
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    const current = user.wallet.get(symbol) || 0;
    if (current < amount) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFundsError",
        message: `Not enough ${symbol}. You have ${current}.`,
      });
    }

    const tx = await Transaction.create({
      user: req.auth.sub,
      kind: "withdrawal",
      symbol,
      amount,
      address: req.body.address,
      network: req.body.network || "TRC20",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. Awaiting admin review.",
      transaction: tx,
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
