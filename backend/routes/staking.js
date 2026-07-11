/**
 * =============================================================================
 *  NEXUS BACKEND — routes/staking.js
 * =============================================================================
 *  Quant Bot / staking engine.
 *
 *    POST /api/staking/lock       Lock funds into a bot tier
 *      body { tier, principal, symbol? }
 *
 *    GET  /api/staking/positions  Current user's positions
 *
 *    POST /api/staking/claim      Claim a matured position (credits payout)
 *      body { id }
 *
 *    GET  /api/staking/tiers      Static tier catalog (public to authed users)
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";

import User from "../models/User.js";
import StakingPosition from "../models/StakingPosition.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ---------------------------------------------------------------------------
// Tier catalog — kept in code so the frontend & backend agree on economics.
// ---------------------------------------------------------------------------
export const TIERS = {
  micro: {
    key: "micro",
    label: "AI Micro Bot",
    tagline: "Beginner-friendly automated liquidity grid",
    days: 7,
    yieldPct: 5,
    minAmount: 50,
    maxAmount: 5000,
    color: "emerald",
  },
  alpha: {
    key: "alpha",
    label: "Alpha Signal Engine",
    tagline: "Momentum-driven mid-frequency AI",
    days: 14,
    yieldPct: 12,
    minAmount: 250,
    maxAmount: 25000,
    color: "indigo",
  },
  quantum: {
    key: "quantum",
    label: "Nexus Pro Quantum",
    tagline: "Institutional-grade multi-strategy quant",
    days: 30,
    yieldPct: 25,
    minAmount: 1000,
    maxAmount: 250000,
    color: "cyan",
  },
};

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
      message: "Database offline. Staking is temporarily disabled.",
    });
  }
  return next();
};

// ---------------------------------------------------------------------------
// GET /tiers
// ---------------------------------------------------------------------------
router.get(
  "/tiers",
  requireAuth,
  asyncHandler(async (_req, res) => {
    return res.json({ success: true, tiers: Object.values(TIERS) });
  })
);

// ---------------------------------------------------------------------------
// POST /lock — lock funds into a tier
// ---------------------------------------------------------------------------
router.post(
  "/lock",
  requireAuth,
  requireDatabase,
  [
    body("tier")
      .isString()
      .custom((v) => Object.prototype.hasOwnProperty.call(TIERS, v))
      .withMessage("Unknown tier."),
    body("principal")
      .isFloat({ gt: 0 })
      .withMessage("principal must be > 0."),
    body("symbol")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 10 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const tier = TIERS[req.body.tier];
    const symbol = (req.body.symbol || "USDT").toUpperCase();
    const principal = Number(req.body.principal);

    if (principal < tier.minAmount || principal > tier.maxAmount) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: `Amount must be between ${tier.minAmount} and ${tier.maxAmount} ${symbol}.`,
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    if (user.banned) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Account suspended.",
      });
    }
    const current = user.wallet.get(symbol) || 0;
    if (current < principal) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFundsError",
        message: `Not enough ${symbol}. You have ${current}.`,
      });
    }

    // Debit spot balance
    user.wallet.set(symbol, current - principal);
    user.markModified("wallet");
    await user.save();

    const startedAt = new Date();
    const endsAt = new Date(
      startedAt.getTime() + tier.days * 24 * 60 * 60 * 1000
    );

    const position = await StakingPosition.create({
      user: user._id,
      tier: tier.key,
      tierLabel: tier.label,
      principal,
      symbol,
      yieldPct: tier.yieldPct,
      days: tier.days,
      startedAt,
      endsAt,
      status: "active",
    });

    // Audit ledger entry
    await Transaction.create({
      user: user._id,
      kind: "trade",
      side: "sell",
      symbol,
      amount: principal,
      usdValue: symbol === "USDT" ? principal : 0,
      status: "completed",
      reviewerNote: `Locked into ${tier.label} for ${tier.days} days`,
    });

    return res.status(201).json({
      success: true,
      message: `${tier.label} activated. Matures in ${tier.days} days.`,
      position,
      user,
    });
  })
);

// ---------------------------------------------------------------------------
// GET /positions — current user's positions (active + past)
// ---------------------------------------------------------------------------
router.get(
  "/positions",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const positions = await StakingPosition.find({ user: req.auth.sub })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ success: true, positions });
  })
);

// ---------------------------------------------------------------------------
// POST /claim — claim a matured position (adds principal + yield to wallet)
// ---------------------------------------------------------------------------
router.post(
  "/claim",
  requireAuth,
  requireDatabase,
  [
    body("id")
      .isString()
      .custom((v) => mongoose.isValidObjectId(v))
      .withMessage("Invalid position id."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const position = await StakingPosition.findOne({
      _id: req.body.id,
      user: req.auth.sub,
    });
    if (!position) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Position not found.",
      });
    }
    if (position.status !== "active") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `Position already ${position.status}.`,
      });
    }
    if (new Date() < new Date(position.endsAt)) {
      return res.status(400).json({
        success: false,
        error: "TooEarlyError",
        message: "Position has not matured yet.",
      });
    }

    const payout =
      position.principal * (1 + position.yieldPct / 100);
    const user = await User.findById(req.auth.sub);
    const current = user.wallet.get(position.symbol) || 0;
    user.wallet.set(position.symbol, current + payout);
    user.markModified("wallet");
    await user.save();

    position.status = "completed";
    position.payout = payout;
    position.completedAt = new Date();
    await position.save();

    await Transaction.create({
      user: user._id,
      kind: "trade",
      side: "buy",
      symbol: position.symbol,
      amount: payout,
      usdValue: position.symbol === "USDT" ? payout : 0,
      status: "completed",
      reviewerNote: `${position.tierLabel} matured — payout claimed`,
    });

    return res.json({
      success: true,
      message: `Claimed ${payout.toFixed(2)} ${position.symbol}.`,
      position,
      user,
    });
  })
);

export default router;
