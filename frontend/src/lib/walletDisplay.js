/** Spendable wallet vs main-account display (AI Futures + held Smart Spot stay visible). */

export function spendableUsdt(user, wallet) {
  const w = wallet || user?.wallet || {};
  if (w instanceof Map) return Number(w.get("USDT") || 0);
  return Number(w.USDT || 0);
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

/** One AI lock shown 50/50 on the two strategy cards. */
export function splitAiLockShares(principal) {
  const p = Number(principal || 0);
  if (!(p > 0)) return { ai: 0, spot: 0 };
  const ai = Number((p / 2).toFixed(8));
  return { ai, spot: Number((p - ai).toFixed(8)) };
}

export function displayUsdt(user, wallet) {
  return Number(
    (
      spendableUsdt(user, wallet) +
      heldAiUsdt(user) +
      heldSmartSpotUsdt(user)
    ).toFixed(8)
  );
}
