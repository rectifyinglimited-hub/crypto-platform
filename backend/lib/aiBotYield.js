/** Daily commission % of locked principal, by AI Futures lock days. */
export const AI_FUTURES_DAILY_YIELD = [
  { days: 7, pct: 0.5 },
  { days: 15, pct: 0.8 },
  { days: 30, pct: 1.16 },
  { days: 40, pct: 2.34 },
  { days: 60, pct: 4.64 },
  { days: 90, pct: 9 },
];

export const AI_FUTURES_LOCK_OPTIONS = AI_FUTURES_DAILY_YIELD.map((r) => r.days);

export function hasExactAiFuturesYield(days, table = AI_FUTURES_DAILY_YIELD) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return false;
  return table.some((r) => Number(r.days) === n);
}

export function dailyYieldForLockDays(days, table = AI_FUTURES_DAILY_YIELD) {
  const n = Math.floor(Number(days));
  const rows = Array.isArray(table) && table.length ? table : AI_FUTURES_DAILY_YIELD;
  if (!Number.isFinite(n) || n < 1 || !rows.length) return null;
  const exact = rows.find((r) => Number(r.days) === n);
  if (exact) return Number(exact.pct);
  let best = rows[0];
  let dist = Math.abs(Number(best.days) - n);
  for (const r of rows) {
    const d = Math.abs(Number(r.days) - n);
    if (d < dist) {
      best = r;
      dist = d;
    }
  }
  return Number(best.pct);
}

export function resolveAiFuturesDailyYield(days, fallbackPct) {
  if (hasExactAiFuturesYield(days)) return dailyYieldForLockDays(days);
  const fb = Number(fallbackPct);
  if (Number.isFinite(fb) && fb >= 0) return fb;
  return dailyYieldForLockDays(days);
}

export function mergeAiFuturesLockOptions(stored) {
  const extra = Array.isArray(stored)
    ? stored.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  return [...new Set([...AI_FUTURES_LOCK_OPTIONS, ...extra])].sort((a, b) => a - b);
}
