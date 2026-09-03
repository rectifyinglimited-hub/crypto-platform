import SpotCopyLock from "../models/SpotCopyLock.js";
import User from "../models/User.js";

/** Never load KYC blobs on this path — full User.save() races the trade settler. */
export const USER_SMART_COPY_SELECT =
  "username email fullName adminId wallet aiBotActive aiBotPrincipal aiBotLockDays smartCopySlots smartCopyMaxSlots smartCopyCommissionPct smartCopyCommissionMode smartCopyLastSubmitAt";

export async function persistSmartCopy(user) {
  if (!user?._id) return;
  normalizeSmartCopy(user);
  const slots = (user.smartCopySlots || []).map((s) => ({
    slot: Number(s.slot),
    enabled: s.enabled !== false,
    readyAt: s.readyAt || null,
    accuracy: s.accuracy ?? null,
  }));
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        smartCopySlots: slots,
        smartCopyMaxSlots: user.smartCopyMaxSlots ?? 0,
        smartCopyCommissionMode: user.smartCopyCommissionMode || "manual",
        smartCopyLastSubmitAt: user.smartCopyLastSubmitAt || null,
      },
    }
  );
}

export const SMART_COPY_CYCLE_MS = 24 * 60 * 60 * 1000;

/** AI Futures Strategy lock amount → Smart Spot blocks + auto daily %. */
export const SMART_COPY_TIERS = [
  { minPrincipal: 3000, slots: 4, autoRate: 2.5 },
  { minPrincipal: 2000, slots: 3, autoRate: 2.2 },
  { minPrincipal: 1000, slots: 2, autoRate: 1.7 },
  { minPrincipal: 500, slots: 1, autoRate: 1.0 },
];

export function aiFuturesPrincipal(user) {
  if (!user?.aiBotActive) return 0;
  const n = Number(user.aiBotPrincipal || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function smartCopyTier(principal) {
  const p = Number(principal) || 0;
  for (const t of SMART_COPY_TIERS) {
    if (p >= t.minPrincipal) return t;
  }
  return { minPrincipal: 0, slots: 0, autoRate: 0 };
}

export function smartCopyUnlocked(user) {
  return smartCopyTier(aiFuturesPrincipal(user)).slots > 0;
}

export const SMART_COPY_SLOTS = [
  {
    slot: 0,
    defaultAsset: "BTC",
    defaultType: "crypto",
    accuracy: 94,
    prediction: "Bullish Breakout",
    followers: 12450,
    bar: "green",
  },
  {
    slot: 1,
    defaultAsset: "XAUUSD",
    defaultType: "forex",
    accuracy: 88,
    prediction: "Support Retest",
    followers: 9120,
    bar: "cyan",
  },
  {
    slot: 2,
    defaultAsset: "EURUSD",
    defaultType: "forex",
    accuracy: 70,
    prediction: "Ranging Market",
    followers: 3500,
    bar: "orange",
  },
  {
    slot: 3,
    defaultAsset: "AAPL",
    defaultType: "stock",
    accuracy: 62,
    prediction: "Volatile Dip",
    followers: 1800,
    bar: "red",
  },
];

export function isSlotOpen(slotDoc, now = new Date()) {
  if (!slotDoc || slotDoc.enabled === false) return false;
  if (slotDoc.readyAt && new Date(slotDoc.readyAt).getTime() > now.getTime()) {
    return false;
  }
  return true;
}

export function clampAccuracy(n, fallback = 70) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function smartCopyCommissionMode(user) {
  return user?.smartCopyCommissionMode === "auto" ? "auto" : "manual";
}

export function smartCopyAutoRate(user) {
  return smartCopyTier(aiFuturesPrincipal(user)).autoRate;
}

export function smartCopyLiveRate(user) {
  if (smartCopyCommissionMode(user) === "manual") {
    return Number(user.smartCopyCommissionPct || 0);
  }
  return smartCopyAutoRate(user);
}

export function smartCopyNextSubmitAt(user) {
  const last = user?.smartCopyLastSubmitAt;
  if (!last) return null;
  return new Date(new Date(last).getTime() + SMART_COPY_CYCLE_MS);
}

export function smartCopyCycleOpen(user, now = new Date()) {
  const next = smartCopyNextSubmitAt(user);
  if (!next) return true;
  return now.getTime() >= next.getTime();
}

export async function refreshSmartCopyCycle(user, now = new Date()) {
  if (!user?.smartCopyLastSubmitAt) {
    const oldest = await SpotCopyLock.findOne({
      user: user._id,
      status: "active",
    }).sort({ startDate: 1 });
    if (oldest?.startDate) {
      user.smartCopyLastSubmitAt = oldest.startDate;
    }
  }
  if (!user?.smartCopyLastSubmitAt || !smartCopyCycleOpen(user, now)) {
    return false;
  }
  await SpotCopyLock.updateMany(
    { user: user._id, status: "active" },
    { $set: { status: "completed" } }
  );
  return true;
}

function walletUsdt(user) {
  if (user?.wallet instanceof Map) return Number(user.wallet.get("USDT") || 0);
  return Number(user?.wallet?.USDT || 0);
}

export function normalizeSmartCopy(user) {
  const tier = smartCopyTier(aiFuturesPrincipal(user));
  user.smartCopyMaxSlots = tier.slots;
  if (user.smartCopyCommissionMode !== "auto" && user.smartCopyCommissionMode !== "manual") {
    user.smartCopyCommissionMode = "manual";
  }
  const prev = Array.isArray(user.smartCopySlots) ? user.smartCopySlots : [];
  user.smartCopySlots = [0, 1, 2, 3].map((slot) => {
    const found = prev.find((s) => Number(s.slot) === slot);
    const meta = SMART_COPY_SLOTS[slot] || SMART_COPY_SLOTS[0];
    const rawAcc = found?.accuracy;
    return {
      slot,
      enabled: found ? found.enabled !== false : true,
      readyAt: found?.readyAt || null,
      accuracy:
        rawAcc == null || rawAcc === ""
          ? meta.accuracy
          : clampAccuracy(rawAcc, meta.accuracy),
    };
  });
  return user;
}

export function serializeSmartCopy(user, copies = [], extra = {}) {
  normalizeSmartCopy(user);
  const now = new Date();
  const copiedSlots = new Set(
    copies.map((c) => Number(c.slot)).filter((n) => n >= 0)
  );
  const mode = smartCopyCommissionMode(user);
  const principal = aiFuturesPrincipal(user);
  const tier = smartCopyTier(principal);
  const autoRate = tier.autoRate;
  const liveRate = smartCopyLiveRate(user);
  const usdt = walletUsdt(user);
  const last = user.smartCopyLastSubmitAt || null;
  const nextAt = smartCopyNextSubmitAt(user);
  const canClaim = smartCopyCycleOpen(user, now);
  const unlocked = tier.slots > 0;
  const maxSlots = tier.slots;
  const base = principal > 0 ? principal : 0;
  return {
    unlocked,
    requiredPrincipal: 500,
    aiPrincipal: principal,
    maxSlots,
    commissionMode: mode,
    commissionPct: Number(user.smartCopyCommissionPct || 0),
    autoRate,
    liveRate,
    walletUsdt: usdt,
    estimatedCredit: Number(((base * liveRate) / 100).toFixed(8)),
    lastSubmitAt: last,
    nextSubmitAt: nextAt,
    canClaim,
    copiedCount: copiedSlots.size,
    pendingCommission: extra.pendingCommission || null,
    slots: user.smartCopySlots.map((s) => {
      const meta = SMART_COPY_SLOTS[s.slot] || SMART_COPY_SLOTS[0];
      const copied = copiedSlots.has(s.slot);
      const open = unlocked && s.slot < maxSlots && isSlotOpen(s, now);
      return {
        slot: s.slot,
        enabled: s.enabled !== false,
        readyAt: s.readyAt || null,
        isOpen: open,
        copied,
        lockedByTier: !unlocked || s.slot >= maxSlots,
        accuracy: clampAccuracy(s.accuracy, meta.accuracy),
        prediction: meta.prediction,
        followers: meta.followers,
        bar: meta.bar,
        defaultAsset: meta.defaultAsset,
        defaultType: meta.defaultType,
      };
    }),
  };
}
