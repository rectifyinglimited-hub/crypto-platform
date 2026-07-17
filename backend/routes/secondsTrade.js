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

const CRYPTO_ASSETS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "DOT",
  "SHIB",
  "LTC",
  "BNB",
  "AVAX",
  "LINK",
  "UNI",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "SUI",
  "TON",
  "TRX",
  "ICP",
  "FIL",
  "AAVE",
  "MKR",
  "CRV",
  "SAND",
  "MANA",
  "AXS",
  "GALA",
  "PEPE",
  "WIF",
  "BONK",
  "FLOKI",
  "INJ",
  "SEI",
  "TIA",
  "RENDER",
  "FET",
  "IMX",
  "STX",
  "ALGO",
  "XLM",
  "VET",
  "HBAR",
  "RUNE",
  "FTM",
  "EGLD",
  "THETA",
  "FLOW",
  "GRT",
  "LDO",
  "ENS",
  "APE",
  "CHZ",
];
const STOCK_ASSETS = ["AAPL", "TSLA", "AMZN", "NVDA", "GOOGL"];

/** Fallback reference prices when external feed is unavailable */
const FALLBACK_PRICES = {
  BTC: 68000,
  ETH: 3500,
  SOL: 145,
  BNB: 580,
  XRP: 0.62,
  ADA: 0.45,
  DOGE: 0.12,
  DOT: 6.5,
  SHIB: 0.000018,
  LTC: 85,
  AVAX: 28,
  LINK: 14,
  UNI: 9,
  ATOM: 7,
  NEAR: 5,
  APT: 8,
  ARB: 0.85,
  OP: 1.6,
  SUI: 1.8,
  TON: 5.5,
  TRX: 0.14,
  ICP: 9,
  FIL: 4.5,
  AAVE: 95,
  MKR: 1400,
  CRV: 0.45,
  SAND: 0.35,
  MANA: 0.4,
  AXS: 5.5,
  GALA: 0.03,
  PEPE: 0.00001,
  WIF: 1.8,
  BONK: 0.00002,
  FLOKI: 0.00015,
  INJ: 22,
  SEI: 0.4,
  TIA: 6,
  RENDER: 6.5,
  FET: 1.4,
  IMX: 1.2,
  STX: 1.5,
  ALGO: 0.18,
  XLM: 0.11,
  VET: 0.03,
  HBAR: 0.07,
  RUNE: 4.5,
  FTM: 0.55,
  EGLD: 32,
  THETA: 1.5,
  FLOW: 0.7,
  GRT: 0.2,
  LDO: 1.4,
  ENS: 18,
  APE: 1.1,
  CHZ: 0.08,
  AAPL: 210,
  TSLA: 250,
  AMZN: 190,
  NVDA: 120,
  GOOGL: 175,
};

/** Cached Binance all-ticker snapshot (refreshed ~1s) */
let binanceTickerCache = { at: 0, map: null };

async function fetchBinanceTickerMap() {
  const now = Date.now();
  if (binanceTickerCache.map && now - binanceTickerCache.at < 900) {
    return binanceTickerCache.map;
  }
  try {
    const ctrl = AbortSignal.timeout(5000);
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price",
      { signal: ctrl }
    );
    if (!res.ok) return binanceTickerCache.map;
    const data = await res.json();
    const map = {};
    for (const row of data) {
      const sym = String(row.symbol || "");
      if (!sym.endsWith("USDT")) continue;
      const asset = sym.slice(0, -4);
      const price = Number(row.price);
      if (Number.isFinite(price) && price > 0) map[asset] = price;
    }
    binanceTickerCache = { at: now, map };
    return map;
  } catch {
    return binanceTickerCache.map;
  }
}

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

  // Settled wins show natural profit % (including admin-forced / graph wins)
  if (doc.status === "won" && doc.payoutPercent != null) {
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

function priceDecimals(sym, price) {
  if (price < 0.0001) return 10;
  if (price < 0.01) return 8;
  if (price < 1) return 6;
  if (price < 100) return 4;
  return 2;
}

async function fetchLivePrice(asset, tickerMap) {
  const sym = String(asset).toUpperCase();
  if (CRYPTO_ASSETS.includes(sym)) {
    const fromMap = tickerMap?.[sym];
    if (Number.isFinite(fromMap) && fromMap > 0) return fromMap;
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
  const p = base * jitter;
  return Number(p.toFixed(priceDecimals(sym, p)));
}

function applyBias(price, biasPercent) {
  const b = Number(biasPercent) || 0;
  return price * (1 + b / 100);
}

/**
 * Settle an expired trade and update Trading Wallet.
 * Stake was deducted on open. Call ONLY when expiresAt <= now.
 *
 * Manual Balance Add (admin Force / Graph lock with forcedAmount):
 *   WIN  → balance += stake + |manual|
 *   LOSS → balance += stake - |manual|   (return remainder of stake)
 * Market / sticky % wins use payoutPercent; plain losses keep stake deducted.
 * Force WIN / LOSS / Graph UP / DOWN only stamp outcome — never settle early.
 */
export async function settleTrade(
  tradeId,
  { exitPriceHint, forceOutcome } = {}
) {
  // Atomic claim — stamp Force WIN/LOSS in the SAME update so a concurrent
  // market settler cannot settle as LOSS before admin force lands.
  // Never clear forcedAmount here — Manual Balance Add must survive until credit.
  const isForce = forceOutcome === "win" || forceOutcome === "loss";
  const claimSet = { status: "settling" };
  if (isForce) {
    claimSet.forcedOutcome = forceOutcome;
  }

  let trade = await SecondsTrade.findOneAndUpdate(
    { _id: tradeId, status: "open" },
    { $set: claimSet },
    { new: true }
  );

  // Reclaim a stuck "settling" trade (crash / timeout mid-settle)
  if (!trade && isForce) {
    trade = await SecondsTrade.findOneAndUpdate(
      {
        _id: tradeId,
        status: "settling",
        settledAt: null,
      },
      { $set: claimSet },
      { new: true }
    );
  }

  if (!trade) {
    return SecondsTrade.findById(tradeId);
  }

  const user = await User.findById(trade.user);
  if (!user) {
    await SecondsTrade.findByIdAndUpdate(tradeId, { status: "open" });
    return SecondsTrade.findById(tradeId);
  }

  let exitPrice;
  if (exitPriceHint != null && Number.isFinite(Number(exitPriceHint))) {
    exitPrice = Number(exitPriceHint);
  } else if (
    isForce ||
    trade.forcedOutcome === "win" ||
    trade.forcedOutcome === "loss"
  ) {
    exitPrice = Number(trade.entryPrice);
  } else {
    exitPrice = await fetchLivePrice(trade.asset);
  }
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

  // Align displayed exit with outcome for chart consistency
  if (outcome === "win") {
    if (trade.direction === "long") {
      exitPrice = Math.max(exitPrice, trade.entryPrice * 1.004);
    } else {
      exitPrice = Math.min(exitPrice, trade.entryPrice * 0.996);
    }
  } else if (trade.direction === "long") {
    exitPrice = Math.min(exitPrice, trade.entryPrice * 0.996);
  } else {
    exitPrice = Math.max(exitPrice, trade.entryPrice * 1.004);
  }

  const stakeAmt = parseFloat(Number(trade.stake));
  const manualRaw = trade.forcedAmount;
  const hasManual =
    reason === "admin_force" &&
    manualRaw != null &&
    Number.isFinite(parseFloat(manualRaw));
  const manualAmt = hasManual ? Math.abs(parseFloat(manualRaw)) : 0;

  let payout = 0;
  const fresh = await User.findById(user._id);
  const usdt = parseFloat(Number(fresh.wallet.get("USDT") || 0));

  try {
    if (outcome === "win") {
      let profit;
      let note;

      if (hasManual) {
        // Force WIN: New Balance = Current + Stake + Manual Balance Add
        profit = manualAmt;
        payout = parseFloat(stakeAmt) + parseFloat(profit);
        trade.set("payoutPercent", undefined);
        note = `Seconds WIN · stake $${stakeAmt} + manual $${profit} = $${payout} · ${reason}`;
      } else {
        let pct = DEFAULT_PAYOUT;
        const fromTrade = Number(trade.payoutPercent);
        if (Number.isFinite(fromTrade) && fromTrade > 0) pct = fromTrade;
        if (reason === "user_force_win") {
          const fromUser = Number(fresh.tradeControlPercentage);
          if (Number.isFinite(fromUser) && fromUser > 0) pct = fromUser;
        }
        profit = parseFloat(stakeAmt) * (pct / 100);
        payout = parseFloat(stakeAmt) + parseFloat(profit);
        trade.payoutPercent = pct;
        note = `Seconds WIN · stake $${stakeAmt} + ${pct}% profit $${profit} = $${payout} · ${reason}`;
      }

      fresh.wallet.set("USDT", parseFloat(usdt) + parseFloat(payout));
      fresh.markModified("wallet");
      await fresh.save();
      await Transaction.create({
        user: fresh._id,
        kind: "trade",
        side: trade.direction === "long" ? "buy" : "sell",
        symbol: trade.asset,
        amount: stakeAmt,
        usdValue: payout,
        status: "completed",
        reviewerNote: note,
      });
    } else if (hasManual) {
      // Force LOSS: New Balance = Current + Stake − Manual Balance Add
      // (return remainder of stake; only |manual| is lost)
      const returned = parseFloat(stakeAmt) - parseFloat(manualAmt);
      payout = returned;
      trade.lossAmount = manualAmt;
      trade.set("payoutPercent", undefined);

      fresh.wallet.set("USDT", parseFloat(usdt) + parseFloat(returned));
      fresh.markModified("wallet");
      await fresh.save();
      await Transaction.create({
        user: fresh._id,
        kind: "trade",
        side: trade.direction === "long" ? "buy" : "sell",
        symbol: trade.asset,
        amount: stakeAmt,
        usdValue: returned,
        status: "completed",
        reviewerNote: `Seconds LOSS · stake $${stakeAmt} − manual $${manualAmt} → returned $${returned} · ${reason}`,
      });
    } else {
      // Stake already deducted on open — permanent full loss, no further debit
      trade.lossAmount = stakeAmt;
      trade.set("payoutPercent", undefined);
      payout = 0;
      await Transaction.create({
        user: fresh._id,
        kind: "trade",
        side: trade.direction === "long" ? "buy" : "sell",
        symbol: trade.asset,
        amount: stakeAmt,
        usdValue: 0,
        status: "completed",
        reviewerNote: `Seconds LOSS · stake −$${stakeAmt} · ${reason}`,
      });
    }

    trade.status = outcome === "win" ? "won" : "lost";
    trade.exitPrice = exitPrice;
    trade.payout = payout;
    trade.settledAt = new Date();
    trade.settleReason = reason;
    await trade.save();

    // Soft-reset chart bias after settle so next trade starts clean
    try {
      const u2 = await User.findById(trade.user);
      if (u2?.chartBias?.set) {
        u2.chartBias.set(trade.asset, 0);
        u2.markModified("chartBias");
        await u2.save();
      }
    } catch {
      /* ignore */
    }
    return trade;
  } catch (err) {
    await SecondsTrade.findByIdAndUpdate(tradeId, { status: "open" });
    throw err;
  }
}

/** Background settler — call from server bootstrap */
export async function settleExpiredTrades() {
  if (mongoose.connection.readyState !== 1) return 0;

  // Gradually ramp chart bias for Graph UP/DOWN / Force locks (no violent spikes)
  try {
    const forcedOpen = await SecondsTrade.find({
      status: "open",
      forcedOutcome: { $in: ["win", "loss"] },
    }).limit(40);
    for (const t of forcedOpen) {
      const user = await User.findById(t.user);
      if (!user) continue;
      if (!user.chartBias) user.chartBias = new Map();

      const opened = new Date(t.openedAt).getTime();
      const expires = new Date(t.expiresAt).getTime();
      const remainingMs = Math.max(0, expires - Date.now());
      const rampWindow = Math.max(1, expires - opened);
      const progress = Math.min(1, Math.max(0, (Date.now() - opened) / rampWindow));

      // Ease-in-out toward ~1.6% by expiry — subtle, not abrupt
      const peak = 1.6;
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const wiggle = Math.sin(Date.now() / 2400) * 0.06;
      let target =
        t.forcedOutcome === "win"
          ? eased * peak + wiggle
          : -(eased * peak + wiggle);

      // Soft floor once locked
      if (t.forcedOutcome === "win") target = Math.max(0.08, target);
      else target = Math.min(-0.08, target);

      // Single source of truth — avoid double-applying user + trade bias
      const cur = Number(t.priceBiasPercent || user.chartBias.get(t.asset) || 0);
      const maxStep = 0.07; // ~0.07% per settler tick (~1s) → smooth climb
      let next = cur;
      if (t.forcedOutcome === "win") {
        if (cur < target) next = Math.min(target, cur + maxStep);
        else next = target + (Math.random() - 0.5) * 0.03;
        next = Math.max(0.06, next);
      } else {
        if (cur > target) next = Math.max(target, cur - maxStep);
        else next = target + (Math.random() - 0.5) * 0.03;
        next = Math.min(-0.06, next);
      }

      // Near expiry, hold direction with micro-fluctuation only
      if (remainingMs < 1500) {
        next =
          t.forcedOutcome === "win"
            ? Math.max(0.4, cur + (Math.random() - 0.5) * 0.02)
            : Math.min(-0.4, cur + (Math.random() - 0.5) * 0.02);
      }

      next = Number(next.toFixed(4));
      user.chartBias.set(t.asset, next);
      user.markModified("chartBias");
      await user.save();
      t.priceBiasPercent = next;
      await t.save();
    }
  } catch (err) {
    console.error("[seconds-trade] bias ramp failed", err?.message);
  }

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
      // Honor Force / Graph lock already stamped — settle only after timer hit 0
      if (t.forcedOutcome === "win" || t.forcedOutcome === "loss") {
        await settleTrade(t._id, { forceOutcome: t.forcedOutcome });
      } else {
        await settleTrade(t._id);
      }
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

    const tickerMap = await fetchBinanceTickerMap();

    const prices = await Promise.all(
      assets.map(async ({ asset, assetType }) => {
        const raw = await fetchLivePrice(asset, tickerMap);
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

    // Open-trade bias overrides user chartBias (never sum — that caused 2× spikes)
    const open = await SecondsTrade.find({
      user: req.auth.sub,
      status: "open",
    }).select("asset priceBiasPercent");

    const tradeBias = {};
    for (const t of open) {
      const b = Number(t.priceBiasPercent || 0);
      // Prefer the strongest absolute bias if multiple open on same asset
      if (
        tradeBias[t.asset] == null ||
        Math.abs(b) > Math.abs(tradeBias[t.asset])
      ) {
        tradeBias[t.asset] = b;
      }
    }

    const merged = prices.map((p) => {
      const hasTrade = Object.prototype.hasOwnProperty.call(tradeBias, p.asset);
      const bias = hasTrade ? tradeBias[p.asset] : p.biasPercent;
      return {
        asset: p.asset,
        assetType: p.assetType,
        price: applyBias(p.rawPrice, bias),
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

    const rawAvailable = Number(user.wallet.get("USDT") || 0);
    const available = Number(rawAvailable.toFixed(8));
    let stakeAmt = Number(Number(stake).toFixed(8));
    if (!Number.isFinite(stakeAmt) || stakeAmt <= 0) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Enter a valid stake.",
      });
    }
    // Full-wallet stake: if user asks for ~all balance (or slightly more from UI rounding), clamp to exact available
    if (stakeAmt >= available - 0.02 || Math.abs(stakeAmt - available) <= 0.05) {
      stakeAmt = available;
    }
    if (stakeAmt > available + 1e-8) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFunds",
        message: `Need ${stakeAmt} USDT — wallet has ${available.toFixed(2)}.`,
      });
    }
    if (available <= 0 || stakeAmt <= 0) {
      return res.status(400).json({
        success: false,
        error: "InsufficientFunds",
        message: "Insufficient Trading Wallet balance.",
      });
    }

    let entryPrice = Number(req.body.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      entryPrice = await fetchLivePrice(asset);
    }
    const chartBias = Number(
      user.chartBias?.get?.(asset) || user.chartBias?.[asset] || 0
    );
    entryPrice = applyBias(entryPrice, chartBias);

    const nextBal = Number(Math.max(0, available - stakeAmt).toFixed(8));
    user.wallet.set("USDT", nextBal);
    user.markModified("wallet");
    await user.save();

    const openedAt = new Date();
    const expiresAt = new Date(openedAt.getTime() + durationSec * 1000);

    const trade = await SecondsTrade.create({
      user: user._id,
      asset,
      assetType,
      direction,
      stake: stakeAmt,
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
      amount: stakeAmt,
      usdValue: stakeAmt,
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

    // Settle only at/after exact expiry — never early (admin force does not close early)
    if (
      trade.status === "open" &&
      Date.now() < new Date(trade.expiresAt).getTime()
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
