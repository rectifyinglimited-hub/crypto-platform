/**
 * Per-tenant VIP referral & commission settings.
 * One document per adminId (null = global Super Admin defaults).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

export const DEFAULT_VIP_TIERS = [
  {
    level: 1,
    name: "VIP 1",
    minVolume30d: 1000,
    commissionRate: 10,
    perk: "Priority Live Chat queue",
  },
  {
    level: 2,
    name: "VIP 2",
    minVolume30d: 10000,
    commissionRate: 15,
    perk: "Faster deposit screenshot review",
  },
  {
    level: 3,
    name: "VIP 3",
    minVolume30d: 50000,
    commissionRate: 20,
    perk: "Personal manager routing",
  },
  {
    level: 4,
    name: "VIP 4",
    minVolume30d: 100000,
    commissionRate: 22,
    perk: "Faster withdrawal review window",
  },
  {
    level: 5,
    name: "VIP 5",
    minVolume30d: 200000,
    commissionRate: 24,
    perk: "Dedicated VIP desk hours",
  },
  {
    level: 6,
    name: "VIP 6",
    minVolume30d: 350000,
    commissionRate: 26,
    perk: "Elevated Copy AI Bot allocation",
  },
  {
    level: 7,
    name: "VIP 7",
    minVolume30d: 500000,
    commissionRate: 28,
    perk: "Concierge KYC and payout help",
  },
  {
    level: 8,
    name: "VIP 8",
    minVolume30d: 750000,
    commissionRate: 30,
    perk: "Higher desk limits on verified rails",
  },
  {
    level: 9,
    name: "VIP 9",
    minVolume30d: 1200000,
    commissionRate: 32,
    perk: "Senior relationship manager",
  },
  {
    level: 10,
    name: "VIP 10",
    minVolume30d: 2000000,
    commissionRate: 35,
    perk: "Top-desk status and max referral cut",
  },
];

export const DEFAULT_REFERRAL_COMMISSION_RATE = 15;
export const DEFAULT_UNLOCK_TRADING_DAYS = 30;
export const DEFAULT_SUPPORT_EMAIL = "support@equiti.com";

export const DEFAULT_BONUS_LADDER = [
  { id: "b1", users: 1, bonus: 10 },
  { id: "b2", users: 3, bonus: 30 },
  { id: "b3", users: 5, bonus: 50 },
  { id: "b4", users: 10, bonus: 100 },
  { id: "b5", users: 20, bonus: 200 },
];

export const DEFAULT_DESK_NEWS = [
  {
    id: "n1",
    title: "Bitcoin holds key support as USDT rails stay busy",
    source: "Market desk",
    summary: "Spot desks watch the $ range while settlement windows stay open.",
    body: "Bitcoin is holding its recent support band while USDT rails stay active. Desk flow is two-way: some books are adding on dips, others are taking profit into strength. No change to Equiti deposit or withdrawal windows.",
  },
  {
    id: "n2",
    title: "Ethereum volatility lifts Smart Spot copy books",
    source: "Spot desk",
    summary: "Intraday ranges widen; copy slots stay on the published open times.",
    body: "ETH ranges have widened versus the prior session. Smart Spot copy blocks still open at the times shown on your desk. Size positions to your own lock and unlock schedule.",
  },
  {
    id: "n3",
    title: "USDT settlement windows unchanged",
    source: "Operations",
    summary: "TRC-20 deposits post after screenshot review. Same-day withdrawals follow verification.",
    body: "TRC-20 USDT remains the settlement rail. Send the on-chain receipt in Live Chat after you transfer. Review times depend on screenshot quality and account verification status.",
  },
  {
    id: "n4",
    title: "Gold-linked pairs keep an overnight range",
    source: "Macro",
    summary: "XAU crosses are range-bound; watch the London reopen for a break.",
    body: "Gold-linked pairs are trading a contained overnight band. Liquidity usually improves at the London reopen. Use the published seconds-trade window and your own risk limits.",
  },
  {
    id: "n5",
    title: "High-liquidity majors lead the session",
    source: "Insights",
    summary: "BTC, ETH, and XRP stay the most active books on the terminal.",
    body: "Majors continue to lead ticket count. Thinner alts can gap around news. If you need a receipt or a payout status, open Customer Service after you sign in.",
  },
];

const VipTierSchema = new Schema(
  {
    level: { type: Number, required: true, min: 1, max: 20 },
    name: { type: String, trim: true, default: "VIP" },
    minVolume30d: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    perk: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const SystemSettingsSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    defaultReferralCommissionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: DEFAULT_REFERRAL_COMMISSION_RATE,
    },
    referralUnlockTradingDays: {
      type: Number,
      min: 1,
      max: 365,
      default: DEFAULT_UNLOCK_TRADING_DAYS,
    },
    vipTierSettings: {
      type: [VipTierSchema],
      default: () => DEFAULT_VIP_TIERS.map((t) => ({ ...t })),
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: DEFAULT_SUPPORT_EMAIL,
    },
    globalVipCommission: { type: Number, default: null },
    globalVipEarned: { type: Number, default: null },
    bonusLadder: { type: [Schema.Types.Mixed], default: () => DEFAULT_BONUS_LADDER.map((r) => ({ ...r })) },
    deskNews: { type: [Schema.Types.Mixed], default: () => DEFAULT_DESK_NEWS.map((r) => ({ ...r })) },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

SystemSettingsSchema.index(
  { adminId: 1 },
  { unique: true, partialFilterExpression: { adminId: { $type: "objectId" } } }
);

function normalizeTiers(raw) {
  const list = Array.isArray(raw) && raw.length ? raw : DEFAULT_VIP_TIERS;
  const cleaned = list
    .map((t, i) => ({
      level: Math.max(1, Number(t.level) || i + 1),
      name: String(t.name || `VIP ${Number(t.level) || i + 1}`).slice(0, 40),
      minVolume30d: Math.max(0, Number(t.minVolume30d) || 0),
      commissionRate: Math.min(100, Math.max(0, Number(t.commissionRate) || 0)),
      perk: String(t.perk || "").slice(0, 120),
    }))
    .sort((a, b) => a.level - b.level || a.minVolume30d - b.minVolume30d);
  return cleaned.length ? cleaned : DEFAULT_VIP_TIERS.map((t) => ({ ...t }));
}

function normalizeEmail(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v || !v.includes("@") || v.length > 120) return DEFAULT_SUPPORT_EMAIL;
  return v;
}

function normalizeBonusLadder(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const cleaned = list
    .map((row, i) => ({
      id: String(row?.id || `b${i + 1}`).slice(0, 40),
      users: Math.max(0, Math.round(Number(row?.users) || 0)),
      bonus: Math.max(0, Number(row?.bonus) || 0),
    }))
    .filter((row) => row.users > 0 || row.bonus > 0);
  return cleaned.length ? cleaned : DEFAULT_BONUS_LADDER.map((r) => ({ ...r }));
}

function normalizeDeskNews(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const cleaned = list
    .map((row, i) => ({
      id: String(row?.id || `n${i + 1}`).slice(0, 40),
      title: String(row?.title || "").trim().slice(0, 160),
      source: String(row?.source || "Desk").trim().slice(0, 60),
      summary: String(row?.summary || "").trim().slice(0, 240),
      body: String(row?.body || row?.summary || "").trim().slice(0, 4000),
    }))
    .filter((row) => row.title);
  return cleaned.length ? cleaned : DEFAULT_DESK_NEWS.map((r) => ({ ...r }));
}

function optionalNumber(raw) {
  if (raw === "" || raw === undefined || raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function ensureFullVipLadder(raw) {
  const cleaned = normalizeTiers(raw);
  const byLevel = new Map(cleaned.map((t) => [Number(t.level), t]));
  const out = DEFAULT_VIP_TIERS.map((def) => {
    const existing = byLevel.get(def.level);
    if (!existing) return { ...def };
    return {
      ...def,
      ...existing,
      perk: existing.perk || def.perk,
    };
  });
  for (const t of cleaned) {
    if (Number(t.level) > 10) out.push(t);
  }
  return out;
}

SystemSettingsSchema.statics.serialize = function (doc) {
  const src = doc || {};
  return {
    defaultReferralCommissionRate:
      src.defaultReferralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE,
    referralUnlockTradingDays:
      src.referralUnlockTradingDays ?? DEFAULT_UNLOCK_TRADING_DAYS,
    vipTierSettings: ensureFullVipLadder(src.vipTierSettings),
    supportEmail: normalizeEmail(src.supportEmail),
    globalVipCommission: optionalNumber(src.globalVipCommission),
    globalVipEarned: optionalNumber(src.globalVipEarned),
    bonusLadder: normalizeBonusLadder(src.bonusLadder),
    deskNews: normalizeDeskNews(src.deskNews),
    updatedAt: src.updatedAt || null,
  };
};

SystemSettingsSchema.statics.getForAdmin = async function (adminId) {
  const oid =
    adminId && mongoose.isValidObjectId(adminId)
      ? new mongoose.Types.ObjectId(adminId)
      : null;
  let doc = oid ? await this.findOne({ adminId: oid }) : null;
  if (!doc) doc = await this.findOne({ adminId: null });
  if (!doc) {
    doc = await this.create({
      adminId: null,
      defaultReferralCommissionRate: DEFAULT_REFERRAL_COMMISSION_RATE,
      referralUnlockTradingDays: DEFAULT_UNLOCK_TRADING_DAYS,
      vipTierSettings: DEFAULT_VIP_TIERS.map((t) => ({ ...t })),
    });
  } else {
    const merged = ensureFullVipLadder(doc.vipTierSettings);
    if ((doc.vipTierSettings || []).length < DEFAULT_VIP_TIERS.length) {
      doc.vipTierSettings = merged;
      await doc.save();
    }
  }
  return doc;
};

SystemSettingsSchema.statics.upsertForAdmin = async function (
  adminId,
  patch,
  updatedBy
) {
  const oid =
    adminId && mongoose.isValidObjectId(adminId)
      ? new mongoose.Types.ObjectId(adminId)
      : null;
  const update = {
    updatedBy: updatedBy || null,
  };
  if (patch.defaultReferralCommissionRate !== undefined) {
    update.defaultReferralCommissionRate = Math.min(
      100,
      Math.max(0, Number(patch.defaultReferralCommissionRate))
    );
  }
  if (patch.referralUnlockTradingDays !== undefined) {
    update.referralUnlockTradingDays = Math.min(
      365,
      Math.max(1, Number(patch.referralUnlockTradingDays) || 30)
    );
  }
  if (patch.vipTierSettings !== undefined) {
    update.vipTierSettings = ensureFullVipLadder(patch.vipTierSettings);
  }
  if (patch.supportEmail !== undefined) {
    update.supportEmail = normalizeEmail(patch.supportEmail);
  }
  if (patch.globalVipCommission !== undefined) {
    update.globalVipCommission = optionalNumber(patch.globalVipCommission);
  }
  if (patch.globalVipEarned !== undefined) {
    update.globalVipEarned = optionalNumber(patch.globalVipEarned);
  }
  if (patch.bonusLadder !== undefined) {
    update.bonusLadder = normalizeBonusLadder(patch.bonusLadder);
  }
  if (patch.deskNews !== undefined) {
    update.deskNews = normalizeDeskNews(patch.deskNews);
  }
  const doc = await this.findOneAndUpdate(
    oid ? { adminId: oid } : { adminId: null },
    { $set: update, $setOnInsert: { adminId: oid } },
    { new: true, upsert: true }
  );
  return doc;
};

const SystemSettings =
  mongoose.models.SystemSettings ||
  mongoose.model("SystemSettings", SystemSettingsSchema);

export default SystemSettings;
