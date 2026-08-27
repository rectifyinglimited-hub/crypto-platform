/**
 * CXM-style platform modules API — catalog, orders, assets, borrower KYC.
 */
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import PlatformCatalog from "../models/PlatformCatalog.js";
import PlatformOrder from "../models/PlatformOrder.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  tenantDocFilter,
  assertTenantUser,
} from "../middleware/tenant.js";
import { isSuperAdminRole } from "../lib/roles.js";
import { ensureCatalogEnrichment } from "../lib/catalogEnrichment.js";
import {
  loadSettingsForUser,
  commissionRateForLevel,
  volume30d,
  ensureReferralCode,
  progressToNextTier,
} from "../lib/referralEngine.js";

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireDatabase(req, res, next) {
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

function accountsObj(a) {
  if (a instanceof Map) return Object.fromEntries(a);
  return { ...(a || {}) };
}

function ensureAccounts(user) {
  if (!(user.accountBalances instanceof Map)) {
    user.accountBalances = new Map();
  }
  for (const k of ["funding", "spot", "contract", "delivery", "nft"]) {
    if (!user.accountBalances.has(k)) user.accountBalances.set(k, 0);
  }
  const usdt = Number(user.wallet?.get?.("USDT") ?? user.wallet?.USDT ?? 0);
  const delivery = Number(user.accountBalances.get("delivery") || 0);
  const spot = Number(user.accountBalances.get("spot") || 0);
  const funding = Number(user.accountBalances.get("funding") || 0);
  const contract = Number(user.accountBalances.get("contract") || 0);
  const nft = Number(user.accountBalances.get("nft") || 0);
  const sum = delivery + spot + funding + contract + nft;
  // Sync: if sub-accounts empty but Trading Wallet has funds → put in delivery
  if (sum <= 0 && usdt > 0) {
    user.accountBalances.set("delivery", usdt);
  }
  return user;
}

function unifyTradingWallet(user) {
  ensureAccounts(user);
  if (!(user.wallet instanceof Map)) user.wallet = new Map();
  const usdt = Number(user.wallet.get("USDT") || 0);
  const sum = ["funding", "spot", "contract", "delivery", "nft"].reduce(
    (s, k) => s + Number(user.accountBalances.get(k) || 0),
    0
  );
  const total = Number(Math.max(usdt, sum).toFixed(8));
  user.wallet.set("USDT", total);
  user.accountBalances.set("funding", 0);
  user.accountBalances.set("spot", 0);
  user.accountBalances.set("contract", 0);
  user.accountBalances.set("nft", 0);
  user.accountBalances.set("delivery", total);
  user.markModified("wallet");
  user.markModified("accountBalances");
  return total;
}
  ensureAccounts(user);
  const total = ["funding", "spot", "contract", "delivery", "nft"].reduce(
    (s, k) => s + Number(user.accountBalances.get(k) || 0),
    0
  );
  if (!(user.wallet instanceof Map)) user.wallet = new Map();
  user.wallet.set("USDT", Number(total.toFixed(8)));
  user.markModified("wallet");
  user.markModified("accountBalances");
  return total;
}

const DEFAULT_SEED = [
  {
    kind: "carbon_etf",
    title: "10TH/s Balanced",
    subtitle: "Cycle 1 days · 1% daily dividend",
    price: 100,
    meta: {
      tier: "Balanced",
      cycleDays: 1,
      dailyPct: 1,
      hashRate: "10TH/s",
      earlyExitFeePct: 50,
    },
    sortOrder: 1,
  },
  {
    kind: "carbon_etf",
    title: "20TH/s Balanced",
    subtitle: "Cycle 7 days · 1.5% daily dividend",
    price: 1000,
    meta: {
      tier: "Balanced",
      cycleDays: 7,
      dailyPct: 1.5,
      hashRate: "20TH/s",
      earlyExitFeePct: 50,
    },
    sortOrder: 2,
  },
  {
    kind: "carbon_etf",
    title: "50TH/s Advanced",
    subtitle: "Cycle 30 days · 2.5% daily dividend",
    price: 10000,
    meta: {
      tier: "Advanced",
      cycleDays: 30,
      dailyPct: 2.5,
      hashRate: "50TH/s",
      earlyExitFeePct: 50,
    },
    sortOrder: 3,
  },
  {
    kind: "ico",
    title: "AICOUSDT",
    subtitle: "Token subscription round",
    price: 18.05676443,
    meta: {
      issuePrice: 18.05676443,
      listingPrice: 10,
      perUserCap: 1000000000,
      quotaTotal: 1000000000,
      quotaFilled: 6244682,
      marketTime: "2026-09-10T00:00:00Z",
      windowStart: "2026-06-07T00:00:00Z",
      windowEnd: "2026-09-07T00:00:00Z",
      statusLabel: "Open",
      tokenIssued: false,
    },
    sortOrder: 1,
  },
  {
    kind: "ai_compute",
    title: "Join WEB3.0 Compute",
    subtitle: "Liquidity Web3 output with ETH exchange",
    price: 0,
    meta: { minJoin: 50, dailyYieldPct: 1.2 },
    sortOrder: 1,
  },
  {
    kind: "copy_trader",
    title: "Alpha Desk Pro",
    subtitle: "Win rate 68% · 120 days",
    price: 0,
    meta: { winRate: 68, followers: 240, minCopy: 100, profitSharePct: 10 },
    sortOrder: 1,
  },
  {
    kind: "copy_trader",
    title: "Pulse Scalper",
    subtitle: "Win rate 61% · 90 days",
    price: 0,
    meta: { winRate: 61, followers: 88, minCopy: 50, profitSharePct: 12 },
    sortOrder: 2,
  },
  {
    kind: "loan_plan",
    title: "Standard Loan",
    subtitle: "Flexible term · KYC required",
    price: 0,
    meta: { dailyInterestPct: 0.15, interestFreeDays: 0, minAmount: 50, maxAmount: 50000, maxDays: 90 },
    sortOrder: 1,
  },
  {
    kind: "nft",
    title: "Void Observer #9200",
    subtitle: "Rare · Digital Art",
    price: 299,
    meta: { rarity: "Rare", collection: "Void" },
    featured: true,
    sortOrder: 1,
  },
  {
    kind: "nft",
    title: "Star Wanderer #5000",
    subtitle: "Star · Hot sale",
    price: 499,
    meta: { rarity: "Star", collection: "Wanderer" },
    featured: true,
    sortOrder: 2,
  },
  {
    kind: "nft",
    title: "Neon Ape #120",
    subtitle: "SSR · Best seller",
    price: 899,
    meta: { rarity: "SSR", collection: "Neon" },
    sortOrder: 3,
  },
  {
    kind: "c2c_ad",
    title: "USDT · Buy (USD)",
    subtitle: "Global merchant desk",
    price: 1,
    meta: {
      side: "sell",
      asset: "USDT",
      fiat: "USD",
      min: 50,
      max: 50000,
      payment: "Merchant Deposit",
    },
    sortOrder: 1,
  },
  {
    kind: "c2c_ad",
    title: "USDT · Sell (USD)",
    subtitle: "Global merchant desk",
    price: 1,
    meta: {
      side: "buy",
      asset: "USDT",
      fiat: "USD",
      min: 50,
      max: 50000,
      payment: "Merchant Deposit",
    },
    sortOrder: 2,
  },
  {
    kind: "market_pair",
    title: "BTC/USDT",
    subtitle: "Crypto",
    price: 0,
    meta: { category: "Crypto", base: "BTC", quote: "USDT" },
    sortOrder: 1,
  },
  {
    kind: "market_pair",
    title: "ETH/USDT",
    subtitle: "Crypto",
    price: 0,
    meta: { category: "Crypto", base: "ETH", quote: "USDT" },
    sortOrder: 2,
  },
  {
    kind: "market_pair",
    title: "EUR/USD",
    subtitle: "Forex",
    price: 0,
    meta: { category: "Forex", base: "EUR", quote: "USD" },
    sortOrder: 3,
  },
  {
    kind: "market_pair",
    title: "USD/JPY",
    subtitle: "Forex",
    price: 0,
    meta: { category: "Forex", base: "USD", quote: "JPY" },
    sortOrder: 4,
  },
];

async function ensureSeed(adminId = null) {
  const count = await PlatformCatalog.countDocuments(
    adminId ? { adminId } : { adminId: null }
  );
  if (count > 0) return;
  await PlatformCatalog.insertMany(
    DEFAULT_SEED.map((row) => ({ ...row, adminId, enabled: true }))
  );
}

// ---------------------------------------------------------------------------
// GET /settings — live VIP / referral rates for the signed-in tenant
// ---------------------------------------------------------------------------
router.get(
  "/settings",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const settings = await loadSettingsForUser(user);
    const rate = commissionRateForLevel(settings, user.vipLevel);
    return res.json({
      success: true,
      settings,
      yourVipLevel: Number(user.vipLevel || 0),
      yourCommissionRate: rate,
    });
  })
);

router.get(
  "/referral/me",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    await ensureReferralCode(user);
    const settings = await loadSettingsForUser(user);
    const vol = await volume30d(user._id);
    const rate = commissionRateForLevel(settings, user.vipLevel);
    const progress = progressToNextTier(settings, user.vipLevel, vol);
    const unlockDays = Number(settings.referralUnlockTradingDays) || 30;
    const referrals = await User.find({
      referredBy: user._id,
      deletedAt: null,
    })
      .select(
        "username email fullName createdAt activeTradingDayKeys vipLevel lastTradeAt referralEarnings"
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let referredBy = null;
    if (user.referredBy) {
      const parent = await User.findById(user.referredBy).select(
        "username fullName vipLevel referralCode vipStatus"
      );
      if (parent) {
        const parentSettings = await loadSettingsForUser(parent);
        referredBy = {
          username: parent.username,
          fullName: parent.fullName,
          vipLevel: Number(parent.vipLevel || 0),
          vipStatus: Boolean(parent.vipStatus),
          referralCode: parent.referralCode || null,
          commissionRate: commissionRateForLevel(
            parentSettings,
            parent.vipLevel
          ),
        };
      }
    }

    const invited = await Promise.all(
      referrals.map(async (r) => {
        const days = (r.activeTradingDayKeys || []).length;
        const unlocked = days >= unlockDays;
        const [vol, paidAgg] = await Promise.all([
          volume30d(r._id),
          Transaction.aggregate([
            {
              $match: {
                user: user._id,
                kind: "referral",
                address: String(r._id),
              },
            },
            { $group: { _id: null, total: { $sum: "$usdValue" } } },
          ]),
        ]);
        return {
          id: String(r._id),
          username: r.username,
          email: r.email,
          fullName: r.fullName,
          createdAt: r.createdAt,
          lastTradeAt: r.lastTradeAt || null,
          vipLevel: Number(r.vipLevel || 0),
          activeTradingDays: days,
          daysRemaining: Math.max(0, unlockDays - days),
          unlocked,
          volume30d: vol,
          bonusPaid: Number(paidAgg[0]?.total || 0),
          yourCommissionRate: rate,
        };
      })
    );

    const unlockedCount = invited.filter((r) => r.unlocked).length;

    return res.json({
      success: true,
      settings,
      referral: {
        code: user.referralCode,
        vipLevel: Number(user.vipLevel || 0),
        vipStatus: Boolean(user.vipStatus),
        commissionRate: rate,
        volume30d: vol,
        referralEarnings: Number(user.referralEarnings || 0),
        activeTradingDays: (user.activeTradingDayKeys || []).length,
        unlockTradingDays: unlockDays,
        progress,
        referredBy,
        invitedCount: invited.length,
        unlockedCount,
        invited,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// GET /catalog?kind=
// ---------------------------------------------------------------------------
router.get(
  "/catalog",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub).select("adminId role");
    const tenant = user?.adminId || null;
    await ensureSeed(null);
    if (tenant) await ensureSeed(tenant);
    await ensureCatalogEnrichment(null);
    if (tenant) await ensureCatalogEnrichment(tenant);

    const kind = req.query.kind ? String(req.query.kind) : null;
    const filter = {
      enabled: true,
      ...(kind ? { kind } : {}),
      $or: [{ adminId: null }, ...(tenant ? [{ adminId: tenant }] : [])],
    };
    const items = await PlatformCatalog.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ success: true, items });
  })
);

// ---------------------------------------------------------------------------
// GET /assets — balances overview
// ---------------------------------------------------------------------------
router.get(
  "/assets",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    let user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    ensureAccounts(user);
    const total = unifyTradingWallet(user);
    await user.save();
    const accounts = accountsObj(user.accountBalances);
    return res.json({
      success: true,
      totalUsdt: total,
      accounts,
      wallet: walletObj(user.wallet),
      bankCards: user.bankCards || [],
      withdrawAddresses: user.withdrawAddresses || [],
      kyc: user.kyc,
      borrowerKyc: user.borrowerKyc,
      pendingDetails: user.pendingDetails || null,
    });
  })
);

// ---------------------------------------------------------------------------
// POST /transfer — move between sub-accounts
// ---------------------------------------------------------------------------
router.post(
  "/transfer",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const from = String(req.body.from || "").toLowerCase();
    const to = String(req.body.to || "").toLowerCase();
    const amount = Number(req.body.amount);
    const allowed = ["funding", "spot", "contract", "delivery", "nft"];
    if (!allowed.includes(from) || !allowed.includes(to) || from === to) {
      return res.status(422).json({
        success: false,
        message: "Invalid transfer accounts.",
      });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid amount.",
      });
    }
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    ensureAccounts(user);
    const bal = Number(user.accountBalances.get(from) || 0);
    if (amount > bal) {
      return res.status(422).json({
        success: false,
        message: "Insufficient balance in source account.",
      });
    }
    user.accountBalances.set(from, Number((bal - amount).toFixed(8)));
    user.accountBalances.set(
      to,
      Number((Number(user.accountBalances.get(to) || 0) + amount).toFixed(8))
    );
    syncUsdtFromAccounts(user);
    await user.save();

    await PlatformOrder.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "transfer",
      amount,
      status: "completed",
      meta: { from, to },
    });

    return res.json({
      success: true,
      message: "Transfer completed.",
      accounts: accountsObj(user.accountBalances),
      wallet: walletObj(user.wallet),
    });
  })
);

// ---------------------------------------------------------------------------
// POST /convert — coin ↔ coin, or USDT → coin (Trading Wallet).
// coin → USDT does NOT top up Trading Wallet (funding only — deposit for trading).
// ---------------------------------------------------------------------------
router.post(
  "/convert",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const fromAsset = String(req.body.fromAsset || "USDT").toUpperCase();
    const toAsset = String(req.body.toAsset || "BTC").toUpperCase();
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({ success: false, message: "Invalid amount." });
    }
    if (fromAsset === toAsset) {
      return res.status(422).json({ success: false, message: "Pick different assets." });
    }
    const RATES = { BTC: 64000, ETH: 3200, SOL: 140, USDT: 1 };
    const ALLOWED = new Set(["USDT", "BTC", "ETH", "SOL"]);
    if (!ALLOWED.has(fromAsset) || !ALLOWED.has(toAsset)) {
      return res.status(422).json({
        success: false,
        message: "Supported assets: USDT, BTC, ETH, SOL.",
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    ensureAccounts(user);
    if (!(user.wallet instanceof Map)) user.wallet = new Map();

    // Crypto ↔ crypto (e.g. BTC → SOL) via USD notionals
    if (fromAsset !== "USDT" && toAsset !== "USDT") {
      const have = Number(user.wallet.get(fromAsset) || 0);
      if (amount > have) {
        return res.status(422).json({
          success: false,
          message: `Insufficient ${fromAsset}.`,
        });
      }
      const fromRate = RATES[fromAsset] || 1;
      const toRate = RATES[toAsset] || 1;
      const usd = amount * fromRate;
      const got = usd / toRate;
      user.wallet.set(fromAsset, Number((have - amount).toFixed(8)));
      user.wallet.set(
        toAsset,
        Number((Number(user.wallet.get(toAsset) || 0) + got).toFixed(8))
      );
      user.markModified("wallet");
      await user.save();
      await PlatformOrder.create({
        user: user._id,
        adminId: user.adminId || null,
        kind: "convert",
        amount,
        status: "completed",
        symbol: `${fromAsset}/${toAsset}`,
        meta: { fromAsset, toAsset, fromRate, toRate, received: got },
      });
      return res.json({
        success: true,
        message: `Converted ${amount} ${fromAsset} → ${got.toFixed(8)} ${toAsset}`,
        wallet: walletObj(user.wallet),
        accounts: accountsObj(user.accountBalances),
      });
    }

    if (fromAsset === "USDT") {
      // Spend Trading Wallet USDT → coin
      const usdt = Number(user.wallet.get("USDT") || 0);
      if (amount > usdt) {
        return res.status(422).json({
          success: false,
          message: "Insufficient Trading Wallet USDT.",
        });
      }
      const rate = RATES[toAsset] || 1;
      const got = amount / rate;
      user.wallet.set("USDT", Number((usdt - amount).toFixed(8)));
      user.wallet.set(
        toAsset,
        Number((Number(user.wallet.get(toAsset) || 0) + got).toFixed(8))
      );
      // Keep delivery mirror in sync with trading USDT
      user.accountBalances.set("delivery", Number(user.wallet.get("USDT") || 0));
      user.markModified("wallet");
      user.markModified("accountBalances");
      await user.save();
      await PlatformOrder.create({
        user: user._id,
        adminId: user.adminId || null,
        kind: "convert",
        amount,
        status: "completed",
        symbol: `${fromAsset}/${toAsset}`,
        meta: { fromAsset, toAsset, rate, received: got },
      });
      return res.json({
        success: true,
        message: `Converted ${amount} USDT → ${got.toFixed(8)} ${toAsset}`,
        wallet: walletObj(user.wallet),
        accounts: accountsObj(user.accountBalances),
      });
    }

    // coin → USDT: credit funding ONLY — does NOT inflate Trading Wallet
    const have = Number(user.wallet.get(fromAsset) || 0);
    if (amount > have) {
      return res.status(422).json({
        success: false,
        message: `Insufficient ${fromAsset}.`,
      });
    }
    const rate = RATES[fromAsset] || 1;
    const usdtOut = amount * rate;
    user.wallet.set(fromAsset, Number((have - amount).toFixed(8)));
    user.accountBalances.set(
      "funding",
      Number((Number(user.accountBalances.get("funding") || 0) + usdtOut).toFixed(8))
    );
    user.markModified("wallet");
    user.markModified("accountBalances");
    // Intentionally skip syncUsdtFromAccounts — Trading Wallet stays deposit/win only
    await user.save();
    await PlatformOrder.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "convert",
      amount,
      status: "completed",
      symbol: `${fromAsset}/${toAsset}`,
      meta: {
        fromAsset,
        toAsset,
        rate,
        received: usdtOut,
        destination: "funding",
        note: "Does not credit Trading Wallet — deposit to trade.",
      },
    });
    return res.json({
      success: true,
      message: `Converted ${amount} ${fromAsset} → ${usdtOut.toFixed(2)} USDT (Funding). Trading Wallet unchanged — deposit to add trading balance.`,
      wallet: walletObj(user.wallet),
      accounts: accountsObj(user.accountBalances),
    });
  })
);

// ---------------------------------------------------------------------------
// POST /order — apply / subscribe / buy / loan / copy / spot / perpetual
// ---------------------------------------------------------------------------
router.post(
  "/order",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const kind = String(req.body.kind || "");
    const amount = Number(req.body.amount || 0);
    const catalogId = req.body.catalogId || null;
    const meta = req.body.meta || {};
    const allowed = [
      "carbon_etf",
      "ico",
      "nft",
      "copy_trade",
      "ai_compute",
      "loan",
      "c2c",
      "spot",
      "perpetual",
    ];
    if (!allowed.includes(kind)) {
      return res.status(422).json({ success: false, message: "Invalid order kind." });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (kind === "loan") {
      const bk = user.borrowerKyc?.status || "unverified";
      if (bk !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Complete borrower verification before requesting a loan.",
        });
      }
    }

    let catalog = null;
    if (catalogId && mongoose.isValidObjectId(catalogId)) {
      catalog = await PlatformCatalog.findById(catalogId);
    }

    const chargeKinds = ["carbon_etf", "ico", "nft", "ai_compute", "copy_trade"];
    ensureAccounts(user);
    if (!(user.wallet instanceof Map)) user.wallet = new Map();
    if (chargeKinds.includes(kind) && amount > 0) {
      // Deduct Trading Wallet USDT only (wins + deposits) — no convert top-up path
      const usdt = Number(user.wallet.get("USDT") || 0);
      if (amount > usdt) {
        return res.status(422).json({
          success: false,
          message: "Insufficient Trading Wallet balance. Deposit to continue.",
        });
      }
      user.wallet.set("USDT", Number((usdt - amount).toFixed(8)));
      user.accountBalances.set("delivery", Number(user.wallet.get("USDT") || 0));
      user.markModified("wallet");
      user.markModified("accountBalances");
      await user.save();
    }

    // C2C P2P: admin ads only; escrow USDT when user sells
    let c2cMeta = { ...meta };
    const orderSide = req.body.side || meta.side || null;
    if (kind === "c2c") {
      const catMeta = catalog?.meta || {};
      const rate = Number(catalog?.price || meta.price || 1) || 1;
      const fiatAmount = amount || 0;
      const usdtAmount = Number((fiatAmount / rate).toFixed(8));
      if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
        return res.status(422).json({
          success: false,
          message: "Invalid C2C amount.",
        });
      }
      const min = Number(catMeta.min || 0);
      const max = Number(catMeta.max || Infinity);
      if (fiatAmount < min || fiatAmount > max) {
        return res.status(422).json({
          success: false,
          message: `Amount must be between ${min} and ${max} ${catMeta.fiat || "fiat"}.`,
        });
      }
      c2cMeta = {
        ...meta,
        catalogTitle: catalog?.title,
        asset: catMeta.asset || meta.asset || "USDT",
        fiat: catMeta.fiat || meta.fiat || "USD",
        rate,
        fiatAmount,
        usdtAmount,
        payment: catMeta.payment || "Bank Transfer",
        bankName: catMeta.bankName || "",
        accountName: catMeta.accountName || "",
        accountNumber: catMeta.accountNumber || "",
        iban: catMeta.iban || "",
        paymentNote: catMeta.paymentNote || "",
        paidAt: null,
        userBankName: meta.userBankName || "",
        userAccountName: meta.userAccountName || "",
        userAccountNumber: meta.userAccountNumber || "",
      };
      if (orderSide === "sell") {
        const usdt = Number(user.wallet.get("USDT") || 0);
        if (usdtAmount > usdt) {
          return res.status(422).json({
            success: false,
            message: "Insufficient Trading Wallet USDT to sell.",
          });
        }
        user.wallet.set("USDT", Number((usdt - usdtAmount).toFixed(8)));
        user.accountBalances.set("delivery", Number(user.wallet.get("USDT") || 0));
        user.markModified("wallet");
        user.markModified("accountBalances");
        await user.save();
        c2cMeta.escrowed = true;
      }
    }

    const status =
      kind === "loan" || kind === "c2c"
        ? "pending"
        : kind === "spot" || kind === "perpetual"
          ? "filled"
          : "active";

    const order = await PlatformOrder.create({
      user: user._id,
      adminId: user.adminId || null,
      kind,
      catalog: catalog?._id || null,
      amount: amount || catalog?.price || 0,
      status,
      side: orderSide,
      symbol: req.body.symbol || catalog?.title || null,
      meta:
        kind === "c2c"
          ? c2cMeta
          : { ...meta, catalogTitle: catalog?.title },
    });

    return res.status(201).json({
      success: true,
      message:
        kind === "c2c"
          ? orderSide === "buy"
            ? "Order placed. Transfer fiat using the payment details, then mark as paid."
            : "Sell order placed. USDT escrowed — wait for merchant to pay fiat."
          : "Submitted.",
      order,
      accounts: accountsObj(user.accountBalances),
      wallet: walletObj(user.wallet),
    });
  })
);

// ---------------------------------------------------------------------------
// GET /orders — my orders
// ---------------------------------------------------------------------------
router.get(
  "/orders",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const kind = req.query.kind ? String(req.query.kind) : null;
    const filter = {
      user: req.auth.sub,
      ...(kind ? { kind } : {}),
    };
    const orders = await PlatformOrder.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("catalog", "title kind price meta imageUrl")
      .lean();
    return res.json({ success: true, orders });
  })
);

// ---------------------------------------------------------------------------
// POST /borrower-kyc
// ---------------------------------------------------------------------------
router.post(
  "/borrower-kyc",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (user.borrowerKyc?.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Borrower verification already approved.",
      });
    }
    const idType = String(req.body.idType || "").trim();
    if (!["Passport", "ID", "DriversLicense", "National ID Card"].includes(idType)) {
      return res.status(422).json({
        success: false,
        message: "Select ID Card, Passport, or Driving License.",
      });
    }
    user.borrowerKyc = {
      status: "pending",
      firstName: req.body.firstName || "",
      lastName: req.body.lastName || "",
      gender: req.body.gender || "",
      dateOfBirth: req.body.dateOfBirth || "",
      country: req.body.country || "",
      phone: req.body.phone || "",
      idType,
      idNumber: req.body.idNumber || "",
      docs: req.body.docs || {},
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewerNote: null,
    };
    user.markModified("borrowerKyc");
    await user.save();
    return res.json({
      success: true,
      message: "Borrower verification submitted.",
      borrowerKyc: user.borrowerKyc,
    });
  })
);

// ---------------------------------------------------------------------------
// Bank cards / withdraw addresses
// ---------------------------------------------------------------------------
router.post(
  "/bank-cards",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const card = {
      holderName: String(req.body.holderName || req.body.accountName || "").trim(),
      billingAddress: String(req.body.billingAddress || "").trim(),
      cardNumber: String(req.body.cardNumber || req.body.accountNumber || "").replace(/\s+/g, ""),
      expMonth: String(req.body.expMonth || "").trim(),
      expYear: String(req.body.expYear || "").trim(),
      cvv: String(req.body.cvv || "").trim(),
      bankName: String(req.body.bankName || "Card").trim(),
      accountName: String(req.body.holderName || req.body.accountName || "").trim(),
      accountNumber: String(req.body.cardNumber || req.body.accountNumber || "").replace(/\s+/g, ""),
      iban: String(req.body.iban || "").trim(),
      currency: String(req.body.currency || "USD").trim(),
      status: "pending",
      createdAt: new Date(),
    };
    if (!card.holderName || !card.cardNumber || !card.expMonth || !card.expYear || !card.cvv) {
      return res.status(422).json({
        success: false,
        message: "Name, card number, expiry and CVV are required.",
      });
    }
    if (card.cardNumber.length < 12 || card.cvv.length < 3) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid card number and CVV.",
      });
    }
    user.bankCards = [...(user.bankCards || []), card];
    await user.save();
    return res.json({
      success: true,
      message: "Bank card submitted — pending admin verification.",
      bankCards: user.bankCards,
    });
  })
);

router.post(
  "/withdraw-addresses",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const name = String(req.body.name || req.body.label || "Wallet").trim();
    const row = {
      name,
      label: name,
      network: String(req.body.network || "TRC20").trim(),
      address: String(req.body.address || "").trim(),
      asset: String(req.body.asset || "USDT").trim(),
      status: "pending",
      createdAt: new Date(),
    };
    if (!row.address || row.address.length < 10) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid wallet address.",
      });
    }
    user.withdrawAddresses = [...(user.withdrawAddresses || []), row];
    await user.save();
    return res.json({
      success: true,
      message: "Wallet address submitted — pending admin verification.",
      withdrawAddresses: user.withdrawAddresses,
    });
  })
);

// ===========================================================================
// ADMIN
// ===========================================================================
router.get(
  "/admin/catalog",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const kind = req.query.kind ? String(req.query.kind) : null;
    await ensureSeed(null);
    const items = await PlatformCatalog.find({
      ...scope,
      ...(kind ? { kind } : {}),
    })
      .sort({ kind: 1, sortOrder: 1 })
      .lean();
    // Super admin also sees global seeds
    if (isSuperAdminRole(req.auth.role) || req.isSuperAdmin) {
      const global = await PlatformCatalog.find({
        adminId: null,
        ...(kind ? { kind } : {}),
      })
        .sort({ kind: 1, sortOrder: 1 })
        .lean();
      const map = new Map();
      for (const g of global) map.set(String(g._id), g);
      for (const i of items) map.set(String(i._id), i);
      return res.json({ success: true, items: [...map.values()] });
    }
    return res.json({ success: true, items });
  })
);

router.post(
  "/admin/catalog",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const adminId = req.isSuperAdmin ? req.body.adminId || null : req.auth.sub;
    const item = await PlatformCatalog.create({
      adminId,
      kind: req.body.kind,
      title: req.body.title,
      subtitle: req.body.subtitle || "",
      description: req.body.description || "",
      price: Number(req.body.price || 0),
      currency: req.body.currency || "USDT",
      enabled: req.body.enabled !== false,
      featured: !!req.body.featured,
      sortOrder: Number(req.body.sortOrder || 0),
      imageUrl: req.body.imageUrl || null,
      meta: req.body.meta || {},
    });
    return res.status(201).json({ success: true, item });
  })
);

router.patch(
  "/admin/catalog/:id",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const item = await PlatformCatalog.findOne({
      _id: req.params.id,
      ...scope,
    });
    // Super can edit global
    const target =
      item ||
      ((req.isSuperAdmin || isSuperAdminRole(req.auth.role)) &&
        (await PlatformCatalog.findById(req.params.id)));
    if (!target) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    for (const k of [
      "title",
      "subtitle",
      "description",
      "price",
      "currency",
      "enabled",
      "featured",
      "sortOrder",
      "imageUrl",
      "meta",
      "kind",
    ]) {
      if (req.body[k] !== undefined) target[k] = req.body[k];
    }
    await target.save();
    return res.json({ success: true, item: target });
  })
);

router.delete(
  "/admin/catalog/:id",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const deleted = await PlatformCatalog.findOneAndDelete({
      _id: req.params.id,
      ...scope,
    });
    if (
      !deleted &&
      (req.isSuperAdmin || isSuperAdminRole(req.auth.role))
    ) {
      await PlatformCatalog.findByIdAndDelete(req.params.id);
    }
    return res.json({ success: true, message: "Deleted." });
  })
);

router.get(
  "/admin/orders",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const kind = req.query.kind ? String(req.query.kind) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const orders = await PlatformOrder.find({
      ...scope,
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("user", "username email fullName")
      .populate("catalog", "title kind price")
      .lean();
    return res.json({ success: true, orders });
  })
);

router.patch(
  "/orders/:id",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const order = await PlatformOrder.findOne({
      _id: req.params.id,
      user: req.auth.sub,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.kind !== "c2c") {
      return res.status(422).json({
        success: false,
        message: "Only C2C orders can be updated here.",
      });
    }
    if (!["pending", "active"].includes(order.status)) {
      return res.status(422).json({
        success: false,
        message: "Order can no longer be updated.",
      });
    }
    const meta = { ...(order.meta || {}) };
    if (req.body.action === "mark_paid") {
      if (order.side !== "buy") {
        return res.status(422).json({
          success: false,
          message: "Only buy orders are marked paid by the user.",
        });
      }
      meta.paidAt = new Date().toISOString();
      meta.paymentRef = String(req.body.paymentRef || "").slice(0, 120);
      order.status = "active";
      order.meta = meta;
      order.markModified("meta");
      await order.save();
      return res.json({
        success: true,
        message: "Marked as paid. Waiting for merchant confirmation.",
        order,
      });
    }
    if (req.body.userBankName !== undefined) {
      meta.userBankName = String(req.body.userBankName || "").slice(0, 120);
    }
    if (req.body.userAccountName !== undefined) {
      meta.userAccountName = String(req.body.userAccountName || "").slice(0, 120);
    }
    if (req.body.userAccountNumber !== undefined) {
      meta.userAccountNumber = String(req.body.userAccountNumber || "").slice(
        0,
        120
      );
    }
    order.meta = meta;
    order.markModified("meta");
    await order.save();
    return res.json({ success: true, order });
  })
);

router.patch(
  "/admin/orders/:id",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const order = await PlatformOrder.findOne({ _id: req.params.id, ...scope });
    if (!order) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    const prev = order.status;
    const next = req.body.status ? String(req.body.status) : prev;
    if (req.body.reviewerNote !== undefined) {
      order.reviewerNote = req.body.reviewerNote;
    }
    order.reviewedBy = req.auth.sub;
    order.reviewedAt = new Date();

    // C2C settle / refund
    if (order.kind === "c2c" && next !== prev) {
      const user = await User.findById(order.user);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
      ensureAccounts(user);
      if (!(user.wallet instanceof Map)) user.wallet = new Map();
      const usdtAmount = Number(order.meta?.usdtAmount || 0);
      const complete =
        next === "completed" || next === "active" || next === "filled";
      const reject = next === "rejected" || next === "cancelled";

      if (complete && prev !== "completed") {
        // User buy → credit Trading Wallet; User sell → already escrowed
        if (order.side === "buy" && usdtAmount > 0) {
          const usdt = Number(user.wallet.get("USDT") || 0);
          user.wallet.set("USDT", Number((usdt + usdtAmount).toFixed(8)));
          user.accountBalances.set(
            "delivery",
            Number(user.wallet.get("USDT") || 0)
          );
          user.markModified("wallet");
          user.markModified("accountBalances");
          await user.save();
        }
        order.status = "completed";
        order.meta = { ...(order.meta || {}), settledAt: new Date().toISOString() };
        order.markModified("meta");
        await order.save();
        return res.json({
          success: true,
          message:
            order.side === "buy"
              ? "C2C buy confirmed — USDT credited to user Trading Wallet."
              : "C2C sell confirmed — escrow released to merchant.",
          order,
          wallet: walletObj(user.wallet),
        });
      }

      if (reject && prev !== "rejected" && prev !== "cancelled") {
        // Refund escrow on user sell
        if (order.side === "sell" && order.meta?.escrowed && usdtAmount > 0) {
          const usdt = Number(user.wallet.get("USDT") || 0);
          user.wallet.set("USDT", Number((usdt + usdtAmount).toFixed(8)));
          user.accountBalances.set(
            "delivery",
            Number(user.wallet.get("USDT") || 0)
          );
          user.markModified("wallet");
          user.markModified("accountBalances");
          await user.save();
        }
        order.status = next;
        order.meta = {
          ...(order.meta || {}),
          escrowed: false,
          refundedAt: new Date().toISOString(),
        };
        order.markModified("meta");
        await order.save();
        return res.json({
          success: true,
          message: "C2C order rejected" + (order.side === "sell" ? " — USDT refunded." : "."),
          order,
          wallet: walletObj(user.wallet),
        });
      }
    }

    order.status = next;
    await order.save();
    return res.json({ success: true, order });
  })
);

router.get(
  "/admin/borrower-kyc",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    // Map tenantDocFilter (adminId) onto users
    const userFilter = { ...scope };
    if (userFilter.adminId && !req.isSuperAdmin) {
      // ok
    }
    const status = req.query.status || "pending";
    const users = await User.find({
      ...userFilter,
      "borrowerKyc.status": status,
      deletedAt: null,
      role: "user",
    })
      .select("username email fullName borrowerKyc adminId createdAt")
      .sort({ "borrowerKyc.submittedAt": -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, users });
  })
);

router.patch(
  "/admin/borrower-kyc/:userId",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const user = await User.findOne({ _id: req.params.userId, ...scope });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const action = String(req.body.action || "").toLowerCase();
    if (!["approve", "reject"].includes(action)) {
      return res.status(422).json({ success: false, message: "action required." });
    }
    user.borrowerKyc = {
      ...(user.borrowerKyc?.toObject?.() || user.borrowerKyc || {}),
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: new Date(),
      reviewedBy: req.auth.sub,
      reviewerNote: req.body.note || null,
    };
    user.markModified("borrowerKyc");
    await user.save();
    return res.json({
      success: true,
      message: `Borrower KYC ${action}d.`,
      borrowerKyc: user.borrowerKyc,
    });
  })
);

router.get(
  "/admin/user-assets/:userId",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const user = await User.findOne({ _id: req.params.userId, ...scope }).select(
      "username email fullName wallet accountBalances bankCards withdrawAddresses kyc borrowerKyc"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        wallet: walletObj(user.wallet),
        accounts: accountsObj(user.accountBalances),
        bankCards: user.bankCards,
        withdrawAddresses: user.withdrawAddresses,
        kyc: user.kyc,
        borrowerKyc: user.borrowerKyc,
      },
    });
  })
);

router.post(
  "/profile-details",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const fullName = String(req.body.fullName || "").trim();
    const phone = String(req.body.phone || "").trim();
    const country = String(req.body.country || "").trim();
    if (fullName.length < 2) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid name (at least 2 characters).",
      });
    }
    user.pendingDetails = {
      status: "pending",
      fullName,
      phone,
      country,
      submittedAt: new Date(),
    };
    user.markModified("pendingDetails");
    await user.save();
    return res.json({
      success: true,
      message: "Details submitted — pending admin verification.",
      pendingDetails: user.pendingDetails,
    });
  })
);

router.get(
  "/admin/pending-details",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const scope = tenantDocFilter(req);
    const users = await User.find({
      ...scope,
      role: "user",
      deletedAt: null,
      $or: [
        { "bankCards.status": "pending" },
        { "withdrawAddresses.status": "pending" },
        { "pendingDetails.status": "pending" },
      ],
    })
      .select(
        "username email fullName phone country bankCards withdrawAddresses pendingDetails adminId"
      )
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const bankCards = [];
    const wallets = [];
    const profiles = [];
    for (const u of users) {
      const summary = {
        _id: u._id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
      };
      for (const c of u.bankCards || []) {
        if ((c.status || "pending") === "pending") {
          bankCards.push({ user: summary, card: c });
        }
      }
      for (const w of u.withdrawAddresses || []) {
        if ((w.status || "pending") === "pending") {
          wallets.push({ user: summary, wallet: w });
        }
      }
      if (u.pendingDetails?.status === "pending") {
        profiles.push({ user: summary, details: u.pendingDetails });
      }
    }
    return res.json({ success: true, bankCards, wallets, profiles });
  })
);

router.patch(
  "/admin/pending-details",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const userId = req.body.userId;
    const kind = String(req.body.kind || "");
    const itemId = req.body.itemId;
    const action = String(req.body.action || "");
    if (!["approve", "reject"].includes(action)) {
      return res.status(422).json({ success: false, message: "Invalid action." });
    }
    const found = await assertTenantUser(req, userId);
    if (found.status) {
      return res.status(found.status).json({
        success: false,
        message: found.message,
      });
    }
    const user = found.user;
    const nextStatus = action === "approve" ? "approved" : "rejected";

    if (kind === "profile") {
      if (user.pendingDetails?.status !== "pending") {
        return res.status(404).json({ success: false, message: "No pending details." });
      }
      if (action === "approve") {
        if (user.pendingDetails.fullName) user.fullName = user.pendingDetails.fullName;
        if (user.pendingDetails.phone != null) user.phone = user.pendingDetails.phone;
        if (user.pendingDetails.country != null) user.country = user.pendingDetails.country;
      }
      user.pendingDetails.status = nextStatus;
      user.pendingDetails.reviewedAt = new Date();
      user.markModified("pendingDetails");
      await user.save();
      return res.json({
        success: true,
        message: action === "approve" ? "Profile details approved." : "Profile details rejected.",
      });
    }

    if (kind === "bank_card") {
      const card = (user.bankCards || []).id(itemId);
      if (!card) {
        return res.status(404).json({ success: false, message: "Card not found." });
      }
      card.status = nextStatus;
      card.reviewedAt = new Date();
      await user.save();
      return res.json({
        success: true,
        message: action === "approve" ? "Bank card approved." : "Bank card rejected.",
      });
    }

    if (kind === "wallet") {
      const row = (user.withdrawAddresses || []).id(itemId);
      if (!row) {
        return res.status(404).json({ success: false, message: "Wallet address not found." });
      }
      row.status = nextStatus;
      row.reviewedAt = new Date();
      await user.save();
      return res.json({
        success: true,
        message:
          action === "approve"
            ? "Wallet address approved."
            : "Wallet address rejected.",
      });
    }

    return res.status(422).json({ success: false, message: "Invalid kind." });
  })
);

export default router;
