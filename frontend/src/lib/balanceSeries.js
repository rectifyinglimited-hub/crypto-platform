/**
 * USDT trend from real ledger events.
 * Starts on the day balance first appears, stays flat until the next
 * credit/debit, then steps up (earn) or down (loss).
 */

export function txDelta(tx) {
  const d = Number(tx?.ledgerDelta);
  if (Number.isFinite(d) && d !== 0) return d;
  const amt = Number(tx?.usdValue || tx?.amount || 0);
  if (!Number.isFinite(amt) || amt === 0) return 0;
  const status = String(tx?.status || "");
  const kind = String(tx?.kind || "");
  if (
    kind === "deposit" &&
    (status === "approved" || status === "completed")
  ) {
    return amt;
  }
  if (
    kind === "withdrawal" &&
    (status === "approved" ||
      status === "completed" ||
      (status === "pending" && tx?.fundsHeld))
  ) {
    return -amt;
  }
  if (
    kind === "referral" &&
    (status === "approved" || status === "completed")
  ) {
    return amt;
  }
  return 0;
}

function toStepped(events, now, live) {
  if (!events.length) {
    return [
      { t: now - 60_000, v: live },
      { t: now, v: live },
    ];
  }
  let start = events.findIndex((p) => Math.abs(p.v) > 1e-8);
  if (start < 0) start = 0;
  const core = events.slice(start);
  const out = [{ t: core[0].t, v: core[0].v }];
  for (let i = 1; i < core.length; i += 1) {
    const prev = core[i - 1];
    const cur = core[i];
    if (cur.t > prev.t) out.push({ t: cur.t, v: prev.v });
    out.push({ t: cur.t, v: cur.v });
  }
  const last = out[out.length - 1];
  if (now > last.t + 500) {
    if (Math.abs(live - last.v) > 1e-8) {
      out.push({ t: now, v: last.v });
    }
    out.push({ t: now, v: live });
  } else {
    last.v = live;
    last.t = now;
  }
  return out;
}

export function buildBalanceSeries({ current, transactions }) {
  const now = Date.now();
  const balance = Number(current) || 0;
  const txs = (transactions || [])
    .map((t) => ({
      t: new Date(t.createdAt || t.updatedAt || now).getTime(),
      d: txDelta(t),
    }))
    .filter((x) => Number.isFinite(x.t) && x.d !== 0)
    .sort((a, b) => a.t - b.t || a.d - b.d);

  const sum = txs.reduce((s, x) => s + x.d, 0);
  let running = Number((balance - sum).toFixed(8));
  const events = [];
  for (const x of txs) {
    running = Number((running + x.d).toFixed(8));
    events.push({ t: x.t, v: running });
  }
  return toStepped(events, now, balance);
}

export function sliceSeries(points, rangeMs) {
  if (!points?.length) return [];
  if (!rangeMs) return points;
  const cutoff = Date.now() - rangeMs;
  const later = points.filter((p) => p.t >= cutoff);
  const before = [...points].reverse().find((p) => p.t < cutoff);
  // Only hold into the window if there was a real earlier balance.
  // Do not invent days of history before the first funding.
  if (before) return [{ t: cutoff, v: before.v }, ...later];
  return later.length ? later : points;
}

export function flatSeries(balance) {
  const v = Number(balance) || 0;
  const now = Date.now();
  return [
    { t: now - 60_000, v },
    { t: now, v },
  ];
}
