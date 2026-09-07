/** Daily commission — 2.5% total split: 1.25% AI Futures + 1.25% Smart Spot. */
export const AI_SPLIT_DAILY_PCT = 1.25;
export const SPOT_SPLIT_DAILY_PCT = 1.25;
export const SPOT_BONUS_DAILY_PCT = 1.25;
export const SPOT_BONUS_MIN_PRINCIPAL = 2000;
export const RECOVER_DAYS = 40;

export const AI_FUTURES_DAILY_YIELD = [
  { days: 40, pct: AI_SPLIT_DAILY_PCT },
  { days: 60, pct: AI_SPLIT_DAILY_PCT },
  { days: 90, pct: AI_SPLIT_DAILY_PCT },
  { days: 120, pct: AI_SPLIT_DAILY_PCT },
];

export const AI_FUTURES_LOCK_OPTIONS = AI_FUTURES_DAILY_YIELD.map((r) => r.days);

export function hasExactAiFuturesYield(days, table = AI_FUTURES_DAILY_YIELD) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return false;
  return table.some((r) => Number(r.days) === n);
}

export function dailyYieldForLockDays() {
  return AI_SPLIT_DAILY_PCT;
}

export function resolveAiFuturesDailyYield() {
  return AI_SPLIT_DAILY_PCT;
}

export function smartSpotTargetPct(principal) {
  const p = Number(principal) || 0;
  if (p >= SPOT_BONUS_MIN_PRINCIPAL) {
    return Number((SPOT_SPLIT_DAILY_PCT + SPOT_BONUS_DAILY_PCT).toFixed(2));
  }
  return SPOT_SPLIT_DAILY_PCT;
}

function fnv1a(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daily % list that averages to targetPct exactly over `days`. */
export function buildYieldSchedule({ seed, days, targetPct }) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  const target = Number(targetPct);
  const rng = mulberry32(fnv1a(`${seed}|${n}|${target.toFixed(4)}`));
  const raw = [];
  for (let i = 0; i < n; i += 1) {
    const jitter = (rng() - 0.5) * 0.2;
    raw.push(Math.max(0.8, target + jitter));
  }
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const scaled = raw.map((v) => (v * (target * n)) / sum);
  const rounded = scaled.map((v) => Number(v.toFixed(2)));
  const used = rounded.slice(0, -1).reduce((a, b) => a + b, 0);
  rounded[n - 1] = Number((target * n - used).toFixed(2));
  if (!(rounded[n - 1] > 0)) {
    rounded[n - 1] = target;
  }
  return rounded;
}

export function yieldDayIndex(startDate, now = new Date(), days = RECOVER_DAYS) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  if (!Number.isFinite(start)) return 0;
  const idx = Math.floor((new Date(now).getTime() - start) / 86400000);
  return Math.min(n - 1, Math.max(0, idx));
}

export function displayDailyPct({
  seed,
  startDate,
  days,
  targetPct,
  now = new Date(),
}) {
  const n = Math.max(1, Math.floor(Number(days) || RECOVER_DAYS));
  const schedule = buildYieldSchedule({ seed, days: n, targetPct });
  return schedule[yieldDayIndex(startDate, now, n)];
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
