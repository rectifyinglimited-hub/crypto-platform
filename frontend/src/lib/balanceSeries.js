export function txDelta(tx) {
  const d = Number(tx?.ledgerDelta);
  if (Number.isFinite(d) && d !== 0) return d;
  return 0;
}

export function buildBalanceSeries({ current, createdAt, transactions }) {
  const now = Date.now();
  const balance = Number(current) || 0;
  const txs = (transactions || [])
    .map((t) => ({
      t: new Date(t.createdAt || t.updatedAt || now).getTime(),
      d: txDelta(t),
    }))
    .filter((x) => Number.isFinite(x.t) && x.d !== 0)
    .sort((a, b) => a.t - b.t);

  const sum = txs.reduce((s, x) => s + x.d, 0);
  let running = Number((balance - sum).toFixed(8));
  const origin = createdAt
    ? new Date(createdAt).getTime()
    : txs[0]?.t || now - 7 * 86400000;

  const points = [{ t: Math.min(origin, now), v: running }];
  for (const x of txs) {
    running = Number((running + x.d).toFixed(8));
    points.push({ t: x.t, v: running });
  }
  const last = points[points.length - 1];
  if (!last || now - last.t > 30_000) {
    points.push({ t: now, v: balance });
  } else {
    last.t = now;
    last.v = balance;
  }
  if (points.length === 1) {
    points.unshift({ t: now - 7 * 86400000, v: balance });
  }
  return points;
}

export function sliceSeries(points, rangeMs) {
  if (!points?.length) return [];
  if (!rangeMs) return points;
  const cutoff = Date.now() - rangeMs;
  const later = points.filter((p) => p.t >= cutoff);
  const before = [...points].reverse().find((p) => p.t < cutoff);
  if (before) return [{ t: cutoff, v: before.v }, ...later];
  if (later.length) return [{ t: cutoff, v: later[0].v }, ...later];
  return points;
}

export function flatSeries(balance) {
  const v = Number(balance) || 0;
  const now = Date.now();
  return [
    { t: now - 7 * 86400000, v },
    { t: now, v },
  ];
}
