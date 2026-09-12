/** Daily interest = principal × (admin daily % / 100). Accrues until repaid. */

export function loanSnapshot({
  principal,
  dailyPct,
  days,
  startedAt,
  now,
  repaidAt,
} = {}) {
  const p = Math.max(0, Number(principal) || 0);
  const pct = Math.max(0, Number(dailyPct) || 0);
  const termDays = Math.max(1, Number(days) || 1);
  const dailyInterest = Number(((p * pct) / 100).toFixed(8));
  const startMs = startedAt ? new Date(startedAt).getTime() : 0;
  const endMs = repaidAt
    ? new Date(repaidAt).getTime()
    : Number.isFinite(now)
      ? now
      : Date.now();
  const elapsedMs = startMs ? Math.max(0, endMs - startMs) : 0;
  const elapsedDays = startMs ? Math.floor(elapsedMs / 86400000) : 0;
  const accrued = Number((dailyInterest * elapsedDays).toFixed(8));
  const termInterest = Number((dailyInterest * termDays).toFixed(8));
  const totalDue = Number((p + accrued).toFixed(8));
  return {
    principal: p,
    dailyPct: pct,
    dailyInterest,
    termDays,
    elapsedDays,
    accrued,
    termInterest,
    totalDue,
    startedAt: startedAt || null,
    repaidAt: repaidAt || null,
  };
}

export function attachLoanView(order, now = Date.now()) {
  if (!order || order.kind !== "loan") return order;
  const m = order.meta || {};
  const startedAt =
    m.startedAt ||
    (order.status === "active" || order.status === "completed"
      ? order.reviewedAt || order.updatedAt
      : null);
  return {
    ...order,
    loan: loanSnapshot({
      principal: order.amount,
      dailyPct: m.dailyPct,
      days: m.days,
      startedAt,
      now,
      repaidAt: m.repaidAt,
    }),
  };
}
