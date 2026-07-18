/**
 * Direction-aware chart bias for Force Win / Force Lose.
 *
 * Force WIN:
 *   BUY LONG  → price UP  (green)
 *   SELL SHORT → price DOWN (red)
 * Force LOSE:
 *   BUY LONG  → price DOWN (red)
 *   SELL SHORT → price UP  (green)
 */

/**
 * @param {"long"|"short"} direction
 * @param {"win"|"loss"} forcedOutcome
 * @param {number} magnitude absolute percent (e.g. 0.08)
 * @returns {number} signed bias percent
 */
export function signedBiasForOutcome(direction, forcedOutcome, magnitude = 0.08) {
  const mag = Math.abs(Number(magnitude) || 0);
  if (!mag) return 0;
  const isWin = forcedOutcome === "win";
  const isLong = direction === "long";
  const shouldGoUp = (isWin && isLong) || (!isWin && !isLong);
  return shouldGoUp ? mag : -mag;
}

/**
 * Graph UP/DOWN maps to price direction; derive settlement outcome from trade side.
 * UP + long → win · UP + short → loss · DOWN + long → loss · DOWN + short → win
 */
export function outcomeFromGraphDirection(direction, graphDir) {
  if (graphDir === "up") {
    return direction === "long" ? "win" : "loss";
  }
  if (graphDir === "down") {
    return direction === "long" ? "loss" : "win";
  }
  return null;
}

/**
 * Signed bias for a pure price graph nudge (up = +, down = −).
 */
export function signedBiasForGraph(graphDir, magnitude = 0.08) {
  const mag = Math.abs(Number(magnitude) || 0);
  if (graphDir === "up") return mag;
  if (graphDir === "down") return -mag;
  return 0;
}
