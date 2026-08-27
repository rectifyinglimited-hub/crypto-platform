import SpotCopyLock from "../models/SpotCopyLock.js";

export const SMART_COPY_CYCLE_MS = 24 * 60 * 60 * 1000;
export const SMART_COPY_AUTO_RATES = [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7];

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
  return user?.smartCopyCommissionMode === "manual" ? "manual" : "auto";
}

/** Stable per-user daily rate between 2.0% and 2.7%. */
export function smartCopyAutoRate(userId, at = new Date()) {
  const day = at.toISOString().slice(0, 10);
  const seed = `${userId}:${day}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const steps = SMART_COPY_AUTO_RATES;
  return steps[Math.abs(h) % steps.length];
}

export function smartCopyLiveRate(user, at = new Date()) {
  if (smartCopyCommissionMode(user) === "manual") {
    return Number(user.smartCopyCommissionPct || 0);
  }
  return smartCopyAutoRate(user._id, at);
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
  const max = Math.min(4, Math.max(1, Number(user.smartCopyMaxSlots || 1)));
  user.smartCopyMaxSlots = max;
  if (user.smartCopyCommissionMode !== "auto" && user.smartCopyCommissionMode !== "manual") {
    user.smartCopyCommissionMode =
      Number(user.smartCopyCommissionPct) > 0 ? "manual" : "auto";
  }
  const prev = Array.isArray(user.smartCopySlots) ? user.smartCopySlots : [];
  user.smartCopySlots = [0, 1, 2, 3].map((slot) => {
    const found = prev.find((s) => Number(s.slot) === slot);
    const meta = SMART_COPY_SLOTS[slot] || SMART_COPY_SLOTS[0];
    return {
      slot,
      enabled: found ? found.enabled !== false : true,
      readyAt: found?.readyAt || null,
      accuracy: clampAccuracy(found?.accuracy, meta.accuracy),
    };
  });
  return user;
}

export function serializeSmartCopy(user, copies = []) {
  normalizeSmartCopy(user);
  const now = new Date();
  const copiedSlots = new Set(
    copies.map((c) => Number(c.slot)).filter((n) => n >= 0)
  );
  const mode = smartCopyCommissionMode(user);
  const autoRate = smartCopyAutoRate(user._id, now);
  const liveRate = smartCopyLiveRate(user, now);
  const usdt = walletUsdt(user);
  const last = user.smartCopyLastSubmitAt || null;
  const nextAt = smartCopyNextSubmitAt(user);
  const canClaim = smartCopyCycleOpen(user, now);
  return {
    maxSlots: Number(user.smartCopyMaxSlots || 1),
    commissionMode: mode,
    commissionPct: Number(user.smartCopyCommissionPct || 0),
    autoRate,
    liveRate,
    walletUsdt: usdt,
    estimatedCredit: Number(((usdt * liveRate) / 100).toFixed(8)),
    lastSubmitAt: last,
    nextSubmitAt: nextAt,
    canClaim,
    copiedCount: copiedSlots.size,
    slots: user.smartCopySlots.map((s) => {
      const meta = SMART_COPY_SLOTS[s.slot] || SMART_COPY_SLOTS[0];
      const copied = copiedSlots.has(s.slot);
      const open = isSlotOpen(s, now);
      return {
        slot: s.slot,
        enabled: s.enabled !== false,
        readyAt: s.readyAt || null,
        isOpen: open,
        copied,
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
