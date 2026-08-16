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
