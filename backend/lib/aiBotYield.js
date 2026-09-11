/** Fallback daily % when admin has not saved a matching balance/days row. */
export const AI_SPLIT_DAILY_PCT = 1.25;
export const SPOT_SPLIT_DAILY_PCT = 1.25;
export const SPOT_BONUS_DAILY_PCT = 1.25;
export const SPOT_BONUS_MIN_PRINCIPAL = 2000;
export const RECOVER_DAYS = 40;

export const DEFAULT_COMMISSION_TIERS = [
  { id: "d-0-40", minBalance: 0, days: 40, aiDailyPct: 1.25, spotDailyPct: 1.25 },
  { id: "d-2000-40", minBalance: 2000, days: 40, aiDailyPct: 1.25, spotDailyPct: 2.5 },
  { id: "d-0-60", minBalance: 0, days: 60, aiDailyPct: 1.25, spotDailyPct: 1.25 },
  { id: "d-2000-60", minBalance: 2000, days: 60, aiDailyPct: 1.25, spotDailyPct: 2.5 },
  { id: "d-0-90", minBalance: 0, days: 90, aiDailyPct: 1.25, spotDailyPct: 1.25 },
  { id: "d-2000-90", minBalance: 2000, days: 90, aiDailyPct: 1.25, spotDailyPct: 2.5 },
  { id: "d-0-120", minBalance: 0, days: 120, aiDailyPct: 1.25, spotDailyPct: 1.25 },
  { id: "d-2000-120", minBalance: 2000, days: 120, aiDailyPct: 1.25, spotDailyPct: 2.5 },
];

export const AI_FUTURES_DAILY_YIELD = [
  { days: 40, pct: AI_SPLIT_DAILY_PCT },
  { days: 60, pct: AI_SPLIT_DAILY_PCT },
  { days: 90, pct: AI_SPLIT_DAILY_PCT },
  { days: 120, pct: AI_SPLIT_DAILY_PCT },
];

export const AI_FUTURES_LOCK_OPTIONS = AI_FUTURES_DAILY_YIELD.map((r) => r.days);

export function newCommissionTierId() {
  return `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function normalizeCommissionTiers(raw, { fallback = true } = {}) {
  const rows = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const r of rows) {
    const days = Math.floor(Number(r.days));
    const minBalance = Math.max(0, Number(r.minBalance) || 0);
    const aiDailyPct = Number(r.aiDailyPct);
    const spotDailyPct = Number(r.spotDailyPct);
    if (!Number.isFinite(days) || days < 1 || days > 3650) continue;
    if (!Number.isFinite(aiDailyPct) || aiDailyPct < 0 || aiDailyPct > 500) continue;
    if (!Number.isFinite(spotDailyPct) || spotDailyPct < 0 || spotDailyPct > 500) {
      continue;
    }
    out.push({
      id: String(r.id || `${minBalance}-${days}`),
      minBalance,
      days,
      aiDailyPct: Number(aiDailyPct.toFixed(4)),
      spotDailyPct: Number(spotDailyPct.toFixed(4)),
    });
  }
  out.sort((a, b) => a.days - b.days || a.minBalance - b.minBalance);
  if (out.length) return out;
  return fallback
    ? DEFAULT_COMMISSION_TIERS.map((t) => ({ ...t }))
    : [];
}

export function mergeAiFuturesLockOptions(tiers) {
  const days = [
    ...new Set(
      (Array.isArray(tiers) ? tiers : [])
        .map((t) => Math.floor(Number(t.days)))
        .filter((n) => n >= 1 && n <= 3650)
    ),
  ].sort((a, b) => a - b);
  return days.length ? days : [...AI_FUTURES_LOCK_OPTIONS];
}

export function matchCommissionTier({ principal, days, tiers } = {}) {
  const list = normalizeCommissionTiers(tiers, { fallback: true });
  const p = Math.max(0, Number(principal) || 0);
  const d = Math.floor(Number(days) || 0);
  const byDays = Number.isFinite(d) && d >= 1
    ? list.filter((t) => Number(t.days) === d)
    : [];
  const pool = byDays.length
    ? byDays
    : (() => {
        if (!Number.isFinite(d) || d < 1) return list;
        let best = list[0];
        let dist = Math.abs(Number(best.days) - d);
        for (const t of list) {
          const n = Math.abs(Number(t.days) - d);
          if (n < dist) {
            best = t;
            dist = n;
          }
        }
        return list.filter((t) => Number(t.days) === Number(best.days));
      })();
  const eligible = pool.filter((t) => p >= Number(t.minBalance));
  const pick = (eligible.length ? eligible : pool).reduce((best, t) => {
    if (!best) return t;
    return Number(t.minBalance) >= Number(best.minBalance) ? t : best;
  }, null);
  return pick || null;
}

export function hasExactAiFuturesYield(days, table = AI_FUTURES_DAILY_YIELD) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return false;
  return table.some((r) => Number(r.days) === n);
}

export function dailyYieldForLockDays(days, _table, ctx = {}) {
  const matched = matchCommissionTier({
    principal: ctx.principal,
    days,
    tiers: ctx.tiers,
  });
  return matched?.aiDailyPct ?? AI_SPLIT_DAILY_PCT;
}

export function resolveAiFuturesDailyYield(days, fallbackPct, ctx = {}) {
  const matched = matchCommissionTier({
    principal: ctx.principal,
    days,
    tiers: ctx.tiers,
  });
  if (matched) return matched.aiDailyPct;
  const fb = Number(fallbackPct);
  if (Number.isFinite(fb) && fb >= 0) return fb;
  return AI_SPLIT_DAILY_PCT;
}

export function smartSpotTargetPct(principal, days, tiers) {
  const matched = matchCommissionTier({ principal, days, tiers });
  if (matched) return matched.spotDailyPct;
  const p = Number(principal) || 0;
  if (p >= SPOT_BONUS_MIN_PRINCIPAL) {
    return Number((SPOT_SPLIT_DAILY_PCT + SPOT_BONUS_DAILY_PCT).toFixed(2));
  }
  return SPOT_SPLIT_DAILY_PCT;
}

export function dailyYieldTableFromTiers(tiers) {
  const list = normalizeCommissionTiers(tiers);
  return mergeAiFuturesLockOptions(list).map((d) => {
    const t = matchCommissionTier({ principal: 0, days: d, tiers: list });
    return { days: d, pct: t?.aiDailyPct ?? AI_SPLIT_DAILY_PCT };
  });
}

export function heldAiUsdt(user) {
  if (!user?.aiBotActive) return 0;
  const n = Number(user.aiBotPrincipal || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function heldSmartSpotUsdt(user) {
  if (!user?.aiBotActive) return 0;
  const n = Number(user.smartCopyHeldUsdt || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Daily % list — admin-saved target, same every day. */
export function buildYieldSchedule({ days, targetPct }) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  const target = Number(Number(targetPct || 0).toFixed(4));
  return Array.from({ length: n }, () => target);
}

export function yieldDayIndex(startDate, now = new Date(), days = RECOVER_DAYS) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  if (!Number.isFinite(start)) return 0;
  const idx = Math.floor((new Date(now).getTime() - start) / 86400000);
  return Math.min(n - 1, Math.max(0, idx));
}

export function displayDailyPct({ targetPct }) {
  const n = Number(targetPct);
  return Number.isFinite(n) ? Number(n.toFixed(4)) : 0;
}

export function accruedFromSchedule({
  seed,
  startDate,
  days,
  targetPct,
  principal,
  now = new Date(),
}) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  const p = Number(principal) || 0;
  const target = Number(targetPct);
  const schedule = buildYieldSchedule({ seed, days: n, targetPct: target });
  const start = startDate ? new Date(startDate).getTime() : 0;
  const elapsedDays = start
    ? Math.min(n, Math.max(0, (new Date(now).getTime() - start) / 86400000))
    : 0;
  const full = Math.min(n, Math.floor(elapsedDays));
  const frac = elapsedDays - Math.floor(elapsedDays);
  let pctSum = 0;
  for (let i = 0; i < full; i += 1) pctSum += schedule[i];
  if (full < n && frac > 0) pctSum += schedule[full] * frac;
  const idx = yieldDayIndex(startDate, now, n);
  const displayPct = schedule[idx];
  return {
    displayPct,
    daily: Number(((p * displayPct) / 100).toFixed(8)),
    total: Number(((p * pctSum) / 100).toFixed(8)),
    totalTarget: Number(((p * target * n) / 100).toFixed(8)),
    elapsedDays,
    progress: n > 0 ? Math.min(1, elapsedDays / n) : 0,
    schedule,
  };
}
