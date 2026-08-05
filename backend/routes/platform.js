/**
 * CXM-style platform modules API — catalog, orders, assets, borrower KYC.
 */
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import PlatformCatalog from "../models/PlatformCatalog.js";
import PlatformOrder from "../models/PlatformOrder.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { tenantDocFilter } from "../middleware/tenant.js";
import { isSuperAdminRole } from "../lib/roles.js";

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

function syncUsdtFromAccounts(user) {
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
    title: "USDT · Buy (PKR)",
    subtitle: "Merchant desk",
    price: 280,
    meta: { side: "sell", asset: "USDT", fiat: "PKR", min: 50, max: 5000, payment: "Bank Transfer" },
    sortOrder: 1,
  },
  {
    kind: "c2c_ad",
    title: "USDT · Sell (PKR)",
    subtitle: "Merchant desk",
    price: 275,
    meta: { side: "buy", asset: "USDT", fiat: "PKR", min: 50, max: 5000, payment: "Easypaisa" },
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
    syncUsdtFromAccounts(user);
    await user.save();
    const accounts = accountsObj(user.accountBalances);
    const total = Object.values(accounts).reduce((s, n) => s + Number(n || 0), 0);
    return res.json({
      success: true,
      totalUsdt: total,
      accounts,
      wallet: walletObj(user.wallet),
      bankCards: user.bankCards || [],
      withdrawAddresses: user.withdrawAddresses || [],
      kyc: user.kyc,
      borrowerKyc: user.borrowerKyc,
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
// POST /convert — USDT <-> coin (spot account)
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
    // Simplified rates (admin can override later via catalog meta)
    const RATES = { BTC: 64000, ETH: 3200, SOL: 140, USDT: 1 };
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    ensureAccounts(user);
    if (!(user.wallet instanceof Map)) user.wallet = new Map();

    if (fromAsset === "USDT") {
      const spot = Number(user.accountBalances.get("spot") || 0);
      const delivery = Number(user.accountBalances.get("delivery") || 0);
      const available = spot + delivery;
      if (amount > available) {
        return res.status(422).json({ success: false, message: "Insufficient USDT." });
      }
      let left = amount;
      const takeSpot = Math.min(spot, left);
      user.accountBalances.set("spot", Number((spot - takeSpot).toFixed(8)));
      left -= takeSpot;
      if (left > 0) {
        user.accountBalances.set(
          "delivery",
          Number((delivery - left).toFixed(8))
        );
      }
      const rate = RATES[toAsset] || 1;
      const got = amount / rate;
      user.wallet.set(
        toAsset,
        Number((Number(user.wallet.get(toAsset) || 0) + got).toFixed(8))
      );
      syncUsdtFromAccounts(user);
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

    // coin → USDT
    const have = Number(user.wallet.get(fromAsset) || 0);
    if (amount > have) {
      return res.status(422).json({ success: false, message: `Insufficient ${fromAsset}.` });
    }
    const rate = RATES[fromAsset] || 1;
    const usdtOut = amount * rate;
    user.wallet.set(fromAsset, Number((have - amount).toFixed(8)));
    user.accountBalances.set(
      "spot",
      Number((Number(user.accountBalances.get("spot") || 0) + usdtOut).toFixed(8))
    );
    syncUsdtFromAccounts(user);
    await user.save();
    await PlatformOrder.create({
      user: user._id,
      adminId: user.adminId || null,
      kind: "convert",
      amount,
      status: "completed",
      symbol: `${fromAsset}/${toAsset}`,
      meta: { fromAsset, toAsset, rate, received: usdtOut },
    });
    return res.json({
      success: true,
      message: `Converted ${amount} ${fromAsset} → ${usdtOut.toFixed(2)} USDT`,
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
    if (chargeKinds.includes(kind) && amount > 0) {
      const delivery = Number(user.accountBalances.get("delivery") || 0);
      const spot = Number(user.accountBalances.get("spot") || 0);
      const available = delivery + spot;
      if (amount > available) {
        return res.status(422).json({
          success: false,
          message: "Insufficient balance. Deposit or transfer to Delivery/Spot first.",
        });
      }
      let left = amount;
      const takeD = Math.min(delivery, left);
      user.accountBalances.set("delivery", Number((delivery - takeD).toFixed(8)));
      left -= takeD;
      if (left > 0) {
        user.accountBalances.set("spot", Number((spot - left).toFixed(8)));
      }
      if (kind === "nft") {
        user.accountBalances.set(
          "nft",
          Number((Number(user.accountBalances.get("nft") || 0) + amount).toFixed(8))
        );
      }
      syncUsdtFromAccounts(user);
      await user.save();
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
      side: req.body.side || meta.side || null,
      symbol: req.body.symbol || catalog?.title || null,
      meta: { ...meta, catalogTitle: catalog?.title },
    });

    return res.status(201).json({
      success: true,
      message: "Submitted.",
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
      bankName: String(req.body.bankName || "").trim(),
      accountName: String(req.body.accountName || "").trim(),
      accountNumber: String(req.body.accountNumber || "").trim(),
      iban: String(req.body.iban || "").trim(),
      currency: String(req.body.currency || "PKR").trim(),
      createdAt: new Date(),
    };
    if (!card.bankName || !card.accountNumber) {
      return res.status(422).json({
        success: false,
        message: "Bank name and account number required.",
      });
    }
    user.bankCards = [...(user.bankCards || []), card];
    await user.save();
    return res.json({ success: true, bankCards: user.bankCards });
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
    const row = {
      label: String(req.body.label || "Wallet").trim(),
      network: String(req.body.network || "TRC20").trim(),
      address: String(req.body.address || "").trim(),
      asset: String(req.body.asset || "USDT").trim(),
      createdAt: new Date(),
    };
    if (!row.address || row.address.length < 10) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid address.",
      });
    }
    user.withdrawAddresses = [...(user.withdrawAddresses || []), row];
    await user.save();
    return res.json({ success: true, withdrawAddresses: user.withdrawAddresses });
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
    if (req.body.status) order.status = req.body.status;
    if (req.body.reviewerNote !== undefined) {
      order.reviewerNote = req.body.reviewerNote;
    }
    order.reviewedBy = req.auth.sub;
    order.reviewedAt = new Date();
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

export default router;
