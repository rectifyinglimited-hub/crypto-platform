/**
 * VIP referral commission engine — tenant-scoped rates, volume, payouts.
 */
import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import SecondsTrade from "../models/SecondsTrade.js";
import SystemSettings, {
  DEFAULT_REFERRAL_COMMISSION_RATE,
} from "../models/SystemSettings.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function tenantAdminId(user) {
  if (!user) return null;
  if (String(user.role || "").toLowerCase() === "admin") {
    return user.adminId || user._id;
  }
  return user.adminId || null;
}

export async function loadSettingsForUser(user) {
  const adminId = tenantAdminId(user);
  const doc = await SystemSettings.getForAdmin(adminId);
  return SystemSettings.serialize(doc);
}

export function commissionRateForLevel(settings, vipLevel) {
  const level = Number(vipLevel) || 0;
  const tiers = [...(settings.vipTierSettings || [])].sort(
    (a, b) => a.level - b.level
  );
  if (level <= 0) {
    return Number(
      settings.defaultReferralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE
    );
  }
  let rate = Number(
    settings.defaultReferralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE
  );
  for (const t of tiers) {
    if (Number(t.level) <= level) rate = Number(t.commissionRate);
  }
  return rate;
}

export function tierForVolume(settings, volume30d) {
  const vol = Number(volume30d) || 0;
  const tiers = [...(settings.vipTierSettings || [])].sort(
    (a, b) => a.minVolume30d - b.minVolume30d
  );
  let matched = null;
  for (const t of tiers) {
    if (vol >= Number(t.minVolume30d)) matched = t;
  }
  return matched;
}

export async function volume30d(userId) {
  const since = new Date(Date.now() - 30 * 86400000);
  const oid = new mongoose.Types.ObjectId(userId);
  const [seconds, spot] = await Promise.all([
    SecondsTrade.aggregate([
      {
        $match: {
          user: oid,
          status: { $in: ["won", "lost"] },
          settledAt: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: "$stake" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: oid,
          kind: "trade",
          status: "completed",
          symbol: { $nin: ["REFCOMM", "AI-BOT"] },
          createdAt: { $gte: since },
          reviewerNote: { $not: /Seconds /i },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $abs: "$usdValue" } },
        },
      },
    ]),
  ]);
  const a = Number(seconds[0]?.total || 0);
  const b = Number(spot[0]?.total || 0);
  return Number((a + b).toFixed(8));
}

export async function ensureReferralCode(user) {
  if (!user) return null;
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 8; i++) {
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) {
      code += CODE_ALPHABET[bytes[j] % CODE_ALPHABET.length];
    }
    const taken = await User.findOne({ referralCode: code }).select("_id");
    if (!taken) {
      user.referralCode = code;
      await user.save();
      return code;
    }
  }
  user.referralCode = String(user._id).slice(-8).toUpperCase();
  await user.save();
  return user.referralCode;
}

export async function findUserByReferralCode(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const code = raw.trim().toUpperCase();
  return User.findOne({
    referralCode: code,
    deletedAt: null,
    role: "user",
  });
}

function dayKey(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

export async function applyVipUpgrade(user, settings, volume) {
  if (!user || user.vipLevelLocked) return user;
  const matched = tierForVolume(settings, volume);
  const nextLevel = matched ? Number(matched.level) : 0;
  const current = Number(user.vipLevel || 0);
  if (nextLevel > current) {
    user.vipLevel = nextLevel;
    if (nextLevel >= 1) user.vipStatus = true;
    await user.save();
  }
  return user;
}

export async function runVipUpgradeSweep() {
  if (mongoose.connection.readyState !== 1) return 0;
  const users = await User.find({
    deletedAt: null,
    role: "user",
    vipLevelLocked: { $ne: true },
  }).select("_id adminId vipLevel vipStatus vipLevelLocked role");
  let n = 0;
  for (const u of users) {
    try {
      const settings = await loadSettingsForUser(u);
      const vol = await volume30d(u._id);
      const before = Number(u.vipLevel || 0);
      await applyVipUpgrade(u, settings, vol);
      if (Number(u.vipLevel || 0) !== before) n += 1;
    } catch {
      /* skip tenant errors */
    }
  }
  return n;
}

/**
 * After a trade settles: record volume day, maybe pay referrer, maybe auto-VIP.
 */
export async function onTradeSettled({
  trader,
  stakeUsd,
  tradeId,
  adminId,
}) {
  if (!trader?._id) return null;
  const stake = Math.max(0, Number(stakeUsd) || 0);
  if (!(stake > 0)) return null;

  const today = dayKey();
  const days = Array.isArray(trader.activeTradingDayKeys)
    ? [...trader.activeTradingDayKeys]
    : [];
  if (!days.includes(today)) {
    days.push(today);
    trader.activeTradingDayKeys = days.slice(-400);
  }
  trader.lastTradeAt = new Date();
  await trader.save();

  const settings = await loadSettingsForUser(trader);
  const vol = await volume30d(trader._id);
  await applyVipUpgrade(trader, settings, vol);

  const referrerId = trader.referredBy;
  if (!referrerId) return null;

  const unlockDays =
    Number(settings.referralUnlockTradingDays) > 0
      ? Number(settings.referralUnlockTradingDays)
      : 30;
  if ((trader.activeTradingDayKeys || []).length < unlockDays) {
    return { locked: true, activeDays: trader.activeTradingDayKeys.length };
  }

  const referrer = await User.findById(referrerId);
  if (!referrer || referrer.deletedAt || referrer.banned) return null;
  if (
    String(referrer.adminId || "") !== String(trader.adminId || "") &&
    String(referrer._id) !== String(trader.adminId || "")
  ) {
    return null;
  }

  const already = await Transaction.findOne({
    kind: "referral",
    txHash: String(tradeId),
  }).select("_id");
  if (already) return { duplicate: true };

  const refSettings = await loadSettingsForUser(referrer);
  const rate = commissionRateForLevel(refSettings, referrer.vipLevel);
  const amount = Number(((stake * rate) / 100).toFixed(8));
  if (!(amount > 0)) return null;

  if (!(referrer.wallet instanceof Map)) referrer.wallet = new Map();
  const usdt = Number(referrer.wallet.get("USDT") || 0);
  referrer.wallet.set("USDT", Number((usdt + amount).toFixed(8)));
  referrer.markModified("wallet");
  referrer.referralEarnings = Number(
    (Number(referrer.referralEarnings || 0) + amount).toFixed(8)
  );
  await referrer.save();

  await Transaction.create({
    user: referrer._id,
    adminId: adminId || referrer.adminId || null,
    kind: "referral",
    side: "buy",
    symbol: "REFCOMM",
    amount,
    usdValue: amount,
    status: "completed",
    txHash: String(tradeId),
    reviewerNote: `Referral commission ${rate}% of $${stake.toFixed(2)} from ${
      trader.username
    } (VIP ${Number(referrer.vipLevel || 0)})`,
  });

  return { paid: amount, rate, referrerId: referrer._id };
}

export function progressToNextTier(settings, vipLevel, volume30d) {
  const vol = Number(volume30d) || 0;
  const level = Number(vipLevel) || 0;
  const tiers = [...(settings.vipTierSettings || [])].sort(
    (a, b) => a.level - b.level
  );
  const next = tiers.find((t) => Number(t.level) > level);
  if (!next) {
    return {
      nextTier: null,
      volume30d: vol,
      remaining: 0,
      progress: 1,
    };
  }
  const remaining = Math.max(0, Number(next.minVolume30d) - vol);
  const progress =
    Number(next.minVolume30d) > 0
      ? Math.min(1, vol / Number(next.minVolume30d))
      : 1;
  return {
    nextTier: next,
    volume30d: vol,
    remaining,
    progress,
  };
}
