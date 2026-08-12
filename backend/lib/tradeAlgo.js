/**
 * Stake-tier win/loss sequences for seconds trades.
 * Auto-repeats per user cursor. Admin Force WIN/LOSS still overrides in settle.
 *
 * Tiers (stake amount):
 *  ≤ $10   → W L L W … then 2L+W / 2W+L / 3L+W style
 *  ≤ $50   → L W … then 2L+W, 2L+W, 3L+2W
 *  ≤ $150  → (incl. $100) 2L+3W, 1L+1W, 3L+1W
 *  > $150  → $500 sequence: 3L+1W, 2L+1W, 1L+1W (also ≥$500 and above)
 * Max / all-in stake → always LOSS
 */

export const HIGH_PATTERNS = {
  A: ["loss", "loss", "win"],
  B: ["loss", "win", "loss", "win"],
  C: ["loss", "loss", "win"],
};

export const DEFAULT_LOW_PATTERN = ["win", "loss", "loss", "win"];

/** Ordered tiers: first matching maxStake wins. */
export const STAKE_TIERS = [
  {
    id: "t10",
    maxStake: 10,
    // 1st W, 2nd L, 3rd L, 4th W → then 2L+W, 2W+L, 3L+W
    pattern: [
      "win",
      "loss",
      "loss",
      "win",
      "loss",
      "loss",
      "win",
      "win",
      "loss",
      "loss",
      "loss",
      "win",
    ],
  },
  {
    id: "t50",
    maxStake: 50,
    // 1st L, 2nd W → 2L+W, 2L+W, 3L+2W
    pattern: [
      "loss",
      "win",
      "loss",
      "loss",
      "win",
      "loss",
      "loss",
      "win",
      "loss",
      "loss",
      "loss",
      "win",
      "win",
    ],
  },
  {
    id: "t150",
    maxStake: 150,
    // $100 / $150 desk: 2L+3W → 1L+1W → 3L+1W
    pattern: [
      "loss",
      "loss",
      "win",
      "win",
      "win",
      "loss",
      "win",
      "loss",
      "loss",
      "loss",
      "win",
    ],
  },
  {
    id: "t500",
    maxStake: Infinity,
    // $500+ / above $150: 3L+1W → 2L+1W → 1L+1W (repeats)
    pattern: [
      "loss",
      "loss",
      "loss",
      "win",
      "loss",
      "loss",
      "win",
      "loss",
      "win",
    ],
  },
];

export function defaultAlgoMatrix() {
  return {
    enabled: true,
    stakeThreshold: 150,
    winPercentage: 25,
    lowPattern: [...DEFAULT_LOW_PATTERN],
    highPatternKey: "A",
    useStakeTiers: true,
  };
}

export function pickStakeTier(stake) {
  const amt = Number(stake) || 0;
  for (const tier of STAKE_TIERS) {
    if (amt <= tier.maxStake) return tier;
  }
  return STAKE_TIERS[STAKE_TIERS.length - 1];
}

function normalizeCursor(cursor = {}) {
  const raw = cursor?.toObject?.() || cursor || {};
  const tiers =
    raw.tiers && typeof raw.tiers === "object" && !Array.isArray(raw.tiers)
      ? { ...raw.tiers }
      : {};
  return {
    tiers,
    lowIndex: Number(raw.lowIndex) || 0,
    highIndex: Number(raw.highIndex) || 0,
    lastStake: raw.lastStake ?? null,
    sameStakeCount: Number(raw.sameStakeCount) || 0,
  };
}

/**
 * Resolve next algorithmic outcome for a user trade.
 * Returns { outcome: 'win'|'loss'|null, reason, cursorPatch }
 */
export function resolveAlgoOutcome({
  stake,
  matrix,
  cursor = {},
  maxAllIn = false,
}) {
  if (!matrix?.enabled) {
    return { outcome: null, reason: "algo_disabled", cursorPatch: null };
  }

  const state = normalizeCursor(cursor);

  // Max / all-in button → always LOSS (does not advance tier cursor)
  if (maxAllIn) {
    return {
      outcome: "loss",
      reason: "algo_max_all_in",
      cursorPatch: state,
    };
  }

  const useTiers = matrix.useStakeTiers !== false;
  if (useTiers) {
    const tier = pickStakeTier(stake);
    const pattern = tier.pattern;
    const idx = Number(state.tiers[tier.id]) || 0;
    const slot = idx % pattern.length;
    const outcome = pattern[slot] === "win" ? "win" : "loss";
    const nextTiers = { ...state.tiers, [tier.id]: idx + 1 };
    return {
      outcome,
      reason: `algo_${tier.id}_i${slot}`,
      cursorPatch: {
        ...state,
        tiers: nextTiers,
        lastStake: Number(stake) || 0,
        sameStakeCount: 0,
      },
    };
  }

  // Legacy fallback (admin matrix without stake tiers)
  const threshold = Number(matrix.stakeThreshold);
  const stakeAmt = Number(stake) || 0;
  const isHigh =
    Number.isFinite(threshold) && threshold > 0
      ? stakeAmt >= threshold
      : false;

  if (isHigh) {
    const key = String(matrix.highPatternKey || "A").toUpperCase();
    const pattern = HIGH_PATTERNS[key] || HIGH_PATTERNS.A;
    let highIndex = Number(state.highIndex) || 0;
    let sameStakeCount = Number(state.sameStakeCount) || 0;
    const lastStake = Number(state.lastStake);

    if (key === "A") {
      if (Number.isFinite(lastStake) && Math.abs(lastStake - stakeAmt) < 1e-8) {
        sameStakeCount += 1;
      } else {
        sameStakeCount = 1;
        highIndex = 0;
      }
      const idx = Math.min(sameStakeCount - 1, pattern.length - 1);
      const outcome = pattern[idx];
      const nextSame = sameStakeCount >= pattern.length ? 0 : sameStakeCount;
      return {
        outcome,
        reason: `algo_high_A_step_${sameStakeCount}`,
        cursorPatch: {
          ...state,
          highIndex: sameStakeCount >= pattern.length ? 0 : highIndex,
          lastStake: stakeAmt,
          sameStakeCount: nextSame,
        },
      };
    }

    const idx = highIndex % pattern.length;
    return {
      outcome: pattern[idx],
      reason: `algo_high_${key}_i${idx}`,
      cursorPatch: {
        ...state,
        highIndex: highIndex + 1,
        lastStake: stakeAmt,
        sameStakeCount: 0,
      },
    };
  }

  const lowPattern =
    Array.isArray(matrix.lowPattern) && matrix.lowPattern.length
      ? matrix.lowPattern
      : DEFAULT_LOW_PATTERN;
  const lowIndex = Number(state.lowIndex) || 0;
  const idx = lowIndex % lowPattern.length;
  const outcome = lowPattern[idx] === "win" ? "win" : "loss";
  return {
    outcome,
    reason: `algo_low_i${idx}`,
    cursorPatch: {
      ...state,
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
