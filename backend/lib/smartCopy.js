import SpotCopyLock from "../models/SpotCopyLock.js";
import User from "../models/User.js";
import {
  displayDailyPct,
  smartSpotTargetPct,
} from "./aiBotYield.js";

/** Never load KYC blobs on this path — full User.save() races the trade settler. */
export const USER_SMART_COPY_SELECT =
  "username email fullName adminId wallet aiBotActive aiBotPrincipal aiBotLockDays aiBotAssignedLockDays aiBotStartDate aiBotEndDate smartCopySlots smartCopyMaxSlots smartCopyCommissionPct smartCopyCommissionMode smartCopyLastSubmitAt smartCopyHeldUsdt";

export async function persistSmartCopy(user) {
  if (!user?._id) return;
  normalizeSmartCopy(user);
  const slots = (user.smartCopySlots || []).map((s) => slotPersistShape(s));
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        smartCopySlots: slots,
        smartCopyMaxSlots: user.smartCopyMaxSlots ?? 0,
        smartCopyCommissionMode: user.smartCopyCommissionMode || "manual",
        smartCopyCommissionPct: Number(user.smartCopyCommissionPct || 0),
        smartCopyLastSubmitAt: user.smartCopyLastSubmitAt || null,
        smartCopyHeldUsdt: Number(user.smartCopyHeldUsdt || 0),
      },
    }
  );
}

export function smartCopyHeldOf(user) {
  const n = Number(user?.smartCopyHeldUsdt || 0);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(8)) : 0;
}

/** One AI lock, shown 50/50 on the two strategy cards. */
export function splitAiLockShares(principal) {
  const p = Number(principal || 0);
  if (!(p > 0)) return { ai: 0, spot: 0 };
  const ai = Number((p / 2).toFixed(8));
  return { ai, spot: Number((p - ai).toFixed(8)) };
}

export function takeSmartCopyHeld(user) {
  const held = smartCopyHeldOf(user);
  if (user) user.smartCopyHeldUsdt = 0;
  return held;
}

export const SMART_COPY_CYCLE_MS = 24 * 60 * 60 * 1000;

/** AI Futures Strategy lock amount → Smart Spot blocks + auto daily %. */
export const SMART_COPY_TIERS = [
  { minPrincipal: 3000, slots: 4, autoRate: 2.5 },
  { minPrincipal: 2000, slots: 3, autoRate: 2.5 },
  { minPrincipal: 1000, slots: 2, autoRate: 1.25 },
  { minPrincipal: 500, slots: 1, autoRate: 1.25 },
];

export function aiFuturesPrincipal(user) {
  if (!user?.aiBotActive) return 0;
  const n = Number(user.aiBotPrincipal || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const LOCKED_TIER = { minPrincipal: 0, slots: 0, autoRate: 0 };
const SUBSCRIBED_TIER = { minPrincipal: 0, slots: 1, autoRate: 1.25 };

export function smartCopyTier(principal) {
  const p = Number(principal) || 0;
  for (const t of SMART_COPY_TIERS) {
    if (p >= t.minPrincipal) return t;
  }
  return LOCKED_TIER;
}

/** Subscribe to AI Futures → at least 1 block. Larger locks open more. */
export function smartCopyTierForUser(user) {
  if (!user?.aiBotActive) return LOCKED_TIER;
  const tier = smartCopyTier(aiFuturesPrincipal(user));
  return tier.slots > 0 ? tier : SUBSCRIBED_TIER;
}

export function smartCopyUnlocked(user) {
  return Boolean(user?.aiBotActive);
}

export const SMART_COPY_SLOTS = [
  {
    slot: 0,
    title: "Bitcoin",
    defaultAsset: "BTC",
    defaultType: "crypto",
    accuracy: 94,
    prediction: "Bullish Breakout",
    followers: 12450,
    bar: "green",
  },
  {
    slot: 1,
    title: "Gold",
    defaultAsset: "XAUUSD",
    defaultType: "forex",
    accuracy: 88,
    prediction: "Support Retest",
    followers: 9120,
    bar: "cyan",
  },
  {
    slot: 2,
    title: "EUR/USD",
    defaultAsset: "EURUSD",
    defaultType: "forex",
    accuracy: 70,
    prediction: "Ranging Market",
    followers: 3500,
    bar: "orange",
  },
  {
    slot: 3,
    title: "Apple",
    defaultAsset: "AAPL",
    defaultType: "stock",
    accuracy: 62,
    prediction: "Volatile Dip",
    followers: 1800,
    bar: "red",
  },
];

function cleanSlotTitle(value, fallback = "") {
  const t = String(value ?? "").trim().slice(0, 80);
  return t || fallback;
}

function cleanSlotPrediction(value, fallback = "") {
  const t = String(value ?? "").trim().slice(0, 80);
  return t || fallback;
}

function cleanSlotAsset(value, fallback = "") {
  const t = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  return t || fallback;
}

function cleanSlotType(value, fallback = "crypto") {
  const t = String(value || "").toLowerCase();
  return ["crypto", "forex", "stock"].includes(t) ? t : fallback;
}

function cleanSlotFollowers(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function slotDisplayFrom(row, meta) {
  const base = meta || SMART_COPY_SLOTS[0];
  return {
    title: cleanSlotTitle(row?.title, base.title || ""),
    prediction: cleanSlotPrediction(row?.prediction, base.prediction),
    followers: cleanSlotFollowers(row?.followers, base.followers),
    defaultAsset: cleanSlotAsset(row?.defaultAsset, base.defaultAsset),
    defaultType: cleanSlotType(row?.defaultType, base.defaultType),
    bar: base.bar,
  };
}

export function slotPersistShape(s) {
  const display = slotDisplayFrom(s, SMART_COPY_SLOTS[Number(s?.slot)] || SMART_COPY_SLOTS[0]);
  return {
    slot: Number(s?.slot),
    enabled: s?.enabled !== false,
    readyAt: s?.readyAt || null,
    accuracy: s?.accuracy ?? null,
    title: display.title,
    prediction: display.prediction,
    followers: display.followers,
    defaultAsset: display.defaultAsset,
    defaultType: display.defaultType,
  };
}

export function resolveSlotDisplay(slotDoc, g, meta) {
  const base = meta || SMART_COPY_SLOTS[0];
  const typeFrom = (row) => {
    const t = String(row?.defaultType || "").toLowerCase();
    return ["crypto", "forex", "stock"].includes(t) ? t : "";
  };
  const followersFrom = (row) => {
    if (row?.followers == null || row.followers === "") return null;
    const n = Number(row.followers);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  return {
    title:
      cleanSlotTitle(slotDoc?.title) ||
      cleanSlotTitle(g?.title) ||
      base.title ||
      "",
    prediction:
      cleanSlotPrediction(slotDoc?.prediction) ||
      cleanSlotPrediction(g?.prediction) ||
      base.prediction,
    followers:
      followersFrom(slotDoc) ?? followersFrom(g) ?? base.followers,
    defaultAsset:
      cleanSlotAsset(slotDoc?.defaultAsset) ||
      cleanSlotAsset(g?.defaultAsset) ||
      base.defaultAsset,
    defaultType: typeFrom(slotDoc) || typeFrom(g) || base.defaultType,
    bar: base.bar,
  };
}

export function isSlotOpen(slotDoc, now = new Date()) {
  if (!slotDoc) return false;
  if (slotDoc.readyAt && new Date(slotDoc.readyAt).getTime() > now.getTime()) {
    return false;
  }
  return slotDoc.enabled !== false;
}

/** Real Ready-to-Copy submits only — ignore leftover wallet-follow locks. */
export function isSignalCopy(lock) {
  if (!lock) return false;
  const slot = Number(lock.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) return false;
  const asset = String(lock.selectedAsset || "").trim();
  if (asset) return true;
  return Number(lock.principal || 0) <= 0;
}

export async function releaseLegacyFollowLocks(userId) {
  if (!userId) return 0;
  const res = await SpotCopyLock.updateMany(
    {
      user: userId,
      status: "active",
      $or: [
        { selectedAsset: { $in: ["", null] }, principal: { $gt: 0 } },
        { selectedAsset: { $exists: false }, principal: { $gt: 0 } },
      ],
    },
    { $set: { status: "completed" } }
  );
  return Number(res?.modifiedCount || 0);
}

export function clampAccuracy(n, fallback = 70) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function normalizeSlotDefaults(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  return [0, 1, 2, 3].map((slot) => {
    const found = rows.find((s) => Number(s.slot) === slot);
    const meta = SMART_COPY_SLOTS[slot] || SMART_COPY_SLOTS[0];
    let readyAt = null;
    if (found?.readyAt) {
      const d = new Date(found.readyAt);
      if (!Number.isNaN(d.getTime())) readyAt = d;
    }
    const accRaw = found?.accuracy;
    const display = slotDisplayFrom(found || {}, meta);
    return {
      slot,
      accuracy:
        accRaw == null || accRaw === ""
          ? meta.accuracy
          : clampAccuracy(accRaw, meta.accuracy),
      readyAt,
      title: display.title,
      prediction: display.prediction,
      followers: display.followers,
      defaultAsset: display.defaultAsset,
      defaultType: display.defaultType,
    };
  });
}

export function mergeSlotState(slotDoc, slotDefaults, now = new Date()) {
  const slot = Number(slotDoc?.slot ?? 0);
  const g = (Array.isArray(slotDefaults) ? slotDefaults : []).find(
    (s) => Number(s.slot) === slot
  );
  const meta = SMART_COPY_SLOTS[slot] || SMART_COPY_SLOTS[0];
  const readyAt = slotDoc?.readyAt || g?.readyAt || null;
  const accuracy = clampAccuracy(
    slotDoc?.accuracy != null && slotDoc?.accuracy !== ""
      ? slotDoc.accuracy
      : g?.accuracy,
    g?.accuracy ?? meta.accuracy
  );
  const display = resolveSlotDisplay(slotDoc, g, meta);
  return {
    ...(slotDoc || {}),
    slot,
    readyAt,
    accuracy,
    enabled: slotDoc?.enabled !== false,
    ...display,
  };
}

export function smartCopyCommissionMode(user) {
  return user?.smartCopyCommissionMode === "auto" ? "auto" : "manual";
}

export function smartCopyAutoRate(user, tiers) {
  return smartSpotTargetPct(
    aiFuturesPrincipal(user),
    user?.aiBotLockDays || user?.aiBotAssignedLockDays,
    tiers
  );
}

export function smartCopyLiveRate(user, now = new Date(), tiers) {
  const target = smartCopyAutoRate(user, tiers);
  if (!user?.aiBotActive || !user?.aiBotStartDate) return target;
  return displayDailyPct({ targetPct: target });
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
  const tier = smartCopyTierForUser(user);
  user.smartCopyMaxSlots = tier.slots;
  if (user.smartCopyCommissionMode !== "auto" && user.smartCopyCommissionMode !== "manual") {
    user.smartCopyCommissionMode = "manual";
  }
  const prev = Array.isArray(user.smartCopySlots) ? user.smartCopySlots : [];
  user.smartCopySlots = [0, 1, 2, 3].map((slot) => {
    const found = prev.find((s) => Number(s.slot) === slot);
    const meta = SMART_COPY_SLOTS[slot] || SMART_COPY_SLOTS[0];
    const rawAcc = found?.accuracy;
    const display = slotDisplayFrom(found || {}, meta);
    const openBySubscribe = Boolean(user?.aiBotActive) && slot < tier.slots;
    return {
      slot,
      enabled: openBySubscribe ? true : found ? found.enabled !== false : true,
      readyAt: found?.readyAt || null,
      accuracy:
        rawAcc == null || rawAcc === ""
          ? meta.accuracy
          : clampAccuracy(rawAcc, meta.accuracy),
      title: display.title,
      prediction: display.prediction,
      followers: display.followers,
      defaultAsset: display.defaultAsset,
      defaultType: display.defaultType,
    };
  });
  return user;
}

export function serializeSmartCopy(user, copies = [], extra = {}) {
  normalizeSmartCopy(user);
  const now = new Date();
  const signalCopies = copies.filter(isSignalCopy);
  const copiedSlots = new Set(
    signalCopies.map((c) => Number(c.slot)).filter((n) => n >= 0)
  );
  const mode = smartCopyCommissionMode(user);
  const principal = aiFuturesPrincipal(user);
  const tier = smartCopyTierForUser(user);
  const autoRate = smartCopyAutoRate(user, extra.tiers);
  const liveRate = smartCopyLiveRate(user, now, extra.tiers);
  const usdt = walletUsdt(user);
  const last = user.smartCopyLastSubmitAt || null;
  const nextAt = smartCopyNextSubmitAt(user);
  const canClaim = smartCopyCycleOpen(user, now);
  const unlocked = Boolean(user?.aiBotActive);
  const maxSlots = tier.slots;
  const base = principal > 0 ? principal : 0;
  const shares = splitAiLockShares(principal);
  const heldCommission = smartCopyHeldOf(user);
  const lockDays = Number(user.aiBotLockDays || user.aiBotAssignedLockDays || 0);
  return {
    unlocked,
    requiredPrincipal: 0,
    aiPrincipal: principal,
    aiLockedShare: shares.ai,
    spotLockedShare: Number((shares.spot + heldCommission).toFixed(8)),
    heldCommission,
    maxSlots,
    commissionMode: mode,
    commissionPct: Number(user.smartCopyCommissionPct || 0),
    autoRate,
    liveRate,
    recoverDays: lockDays > 0 ? lockDays : 40,
    lockDays,
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
      const merged = mergeSlotState(s, extra.slotDefaults, now);
      const open = unlocked && s.slot < maxSlots && isSlotOpen(merged, now);
      const display = resolveSlotDisplay(merged, extra.slotDefaults?.find((x) => Number(x.slot) === s.slot), meta);
      return {
        slot: s.slot,
        enabled: merged.enabled !== false,
        readyAt: merged.readyAt || null,
        isOpen: open,
        copied,
        lockedByTier: !unlocked || s.slot >= maxSlots,
        accuracy: merged.accuracy,
        prediction: display.prediction,
        followers: display.followers,
        bar: display.bar,
        title: display.title,
        defaultAsset: display.defaultAsset,
        defaultType: display.defaultType,
      };
    }),
  };
}
