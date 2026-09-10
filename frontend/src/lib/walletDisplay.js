/** Spendable wallet vs main-account display (AI Futures hold stays visible). */

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

export function displayUsdt(user, wallet) {
  return Number((spendableUsdt(user, wallet) + heldAiUsdt(user)).toFixed(8));
}
