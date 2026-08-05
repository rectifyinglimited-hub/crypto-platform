/**
 * Dynamic win/loss sequence matrix for seconds trades.
 * Used when global trading is ON and no Force Win/Loss override is set.
 */

export const HIGH_PATTERNS = {
  A: ["loss", "loss", "win"], // first two LOSS same stake, 3rd WIN
  B: ["loss", "win", "loss", "win"], // alternating
  C: ["loss", "loss", "win"], // conservative 2L : 1W
};

export const DEFAULT_LOW_PATTERN = ["win", "loss", "loss", "loss"];

export function defaultAlgoMatrix() {
  return {
    enabled: true,
    stakeThreshold: 100,
    winPercentage: 25,
    lowPattern: [...DEFAULT_LOW_PATTERN],
    highPatternKey: "A",
  };
}

/**
 * Resolve next forced algorithmic outcome for a user trade.
 * Returns { outcome: 'win'|'loss'|null, reason, cursorPatch }
 * null outcome → fall through to market / winPercentage roll
 */
export function resolveAlgoOutcome({
  stake,
  matrix,
  cursor = {},
}) {
  if (!matrix?.enabled) {
    return { outcome: null, reason: "algo_disabled", cursorPatch: null };
  }

  const threshold = Number(matrix.stakeThreshold);
  const stakeAmt = Number(stake) || 0;
  const isHigh =
    Number.isFinite(threshold) && threshold > 0
      ? stakeAmt >= threshold
      : false;

  if (isHigh) {
    const key = String(matrix.highPatternKey || "A").toUpperCase();
    const pattern = HIGH_PATTERNS[key] || HIGH_PATTERNS.A;
    let highIndex = Number(cursor.highIndex) || 0;
    let sameStakeCount = Number(cursor.sameStakeCount) || 0;
    const lastStake = Number(cursor.lastStake);

    // Pattern A: reset / count consecutive same-stake trades
    if (key === "A") {
      if (Number.isFinite(lastStake) && Math.abs(lastStake - stakeAmt) < 1e-8) {
        sameStakeCount += 1;
      } else {
        sameStakeCount = 1;
        highIndex = 0;
      }
      const idx = Math.min(sameStakeCount - 1, pattern.length - 1);
      const outcome = pattern[idx];
      const nextIndex = sameStakeCount >= pattern.length ? 0 : highIndex;
      const nextSame =
        sameStakeCount >= pattern.length ? 0 : sameStakeCount;
      return {
        outcome,
        reason: `algo_high_A_step_${sameStakeCount}`,
        cursorPatch: {
          highIndex: nextIndex,
          lowIndex: cursor.lowIndex || 0,
          lastStake: stakeAmt,
          sameStakeCount: nextSame,
        },
      };
    }

    const idx = highIndex % pattern.length;
    const outcome = pattern[idx];
    return {
      outcome,
      reason: `algo_high_${key}_i${idx}`,
      cursorPatch: {
        highIndex: highIndex + 1,
        lowIndex: cursor.lowIndex || 0,
        lastStake: stakeAmt,
        sameStakeCount: 0,
      },
    };
  }

  // Low stake mixed sequence
  const lowPattern = Array.isArray(matrix.lowPattern) && matrix.lowPattern.length
    ? matrix.lowPattern
    : DEFAULT_LOW_PATTERN;
  const lowIndex = Number(cursor.lowIndex) || 0;
  const idx = lowIndex % lowPattern.length;
  const outcome = lowPattern[idx] === "win" ? "win" : "loss";
  return {
    outcome,
    reason: `algo_low_i${idx}`,
    cursorPatch: {
      highIndex: cursor.highIndex || 0,
      lowIndex: lowIndex + 1,
      lastStake: stakeAmt,
      sameStakeCount: 0,
    },
  };
}

/** Probabilistic fallback using admin winPercentage (0–100). */
export function rollWinPercentage(winPercentage) {
  const p = Number(winPercentage);
  if (!Number.isFinite(p)) return null;
  const clamped = Math.max(0, Math.min(100, p));
  return Math.random() * 100 < clamped ? "win" : "loss";
}
