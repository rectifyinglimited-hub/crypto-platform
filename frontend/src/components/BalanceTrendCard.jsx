/**
 * Account total-balance trend — dark/teal equiti style.
 * Line rises when USDT goes up, falls when it goes down.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { WalletAPI } from "../lib/api.js";
import {
  buildBalanceSeries,
  flatSeries,
  sliceSeries,
} from "../lib/balanceSeries.js";

const RANGES = [
  { id: "7d", label: "7D", ms: 7 * 86400000 },
  { id: "30d", label: "30D", ms: 30 * 86400000 },
  { id: "all", label: "All", ms: 0 },
];

function fmtUsd(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtAxis(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000) return `${(Number(n) / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2);
}

function fmtX(t, spanMs) {
  const d = new Date(t);
  if (spanMs && spanMs <= 8 * 86400000) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short" });
}

export default function BalanceTrendCard({ user }) {
  const fillId = useId().replace(/:/g, "");
  const live = Number(user?.wallet?.USDT || 0);
  const [range, setRange] = useState("30d");
  const [raw, setRaw] = useState(() => flatSeries(live));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await WalletAPI.balanceHistory();
        if (cancelled) return;
        if (Array.isArray(res?.series) && res.series.length >= 2) {
          setRaw(res.series);
          return;
        }
      } catch {
        /* older API — reconstruct from existing history */
      }
      try {
        const res = await WalletAPI.transactions();
        if (cancelled) return;
        setRaw(
          buildBalanceSeries({
            current: live,
            createdAt: user?.createdAt,
            transactions: res?.transactions || [],
          })
        );
      } catch {
        if (!cancelled) setRaw(flatSeries(live));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [live, user?.createdAt, user?.id, user?._id]);

  const series = useMemo(() => {
    const spec = RANGES.find((r) => r.id === range);
    const sliced = sliceSeries(raw, spec?.ms || 0);
    if (sliced.length >= 2) {
      const next = sliced.map((p) => ({ ...p }));
      next[next.length - 1].v = live;
      next[next.length - 1].t = Date.now();
      return next;
    }
    return flatSeries(live);
  }, [raw, range, live]);

  const first = series[0]?.v ?? live;
  const last = live;
  const changeAbs = last - first;
  const changePct = first !== 0 ? (changeAbs / Math.abs(first)) * 100 : 0;
  const up = changeAbs > 0.00000001;
  const down = changeAbs < -0.00000001;
  const stroke = up ? "#2dd4bf" : down ? "#fb7185" : "#00C2B3";
  const fillTop = up ? "#2dd4bf" : down ? "#fb7185" : "#00C2B3";

  const W = 640;
  const H = 188;
  const pad = { t: 14, r: 12, b: 28, l: 44 };
  const vals = series.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.max(Math.abs(max) * 0.08, 1);
  const lo = min - span * 0.12;
  const hi = max + span * 0.12;
  const rng = hi - lo || 1;
  const xy = series.map((p, i) => {
    const x =
      pad.l + (i / Math.max(series.length - 1, 1)) * (W - pad.l - pad.r);
    const y = pad.t + ((hi - p.v) / rng) * (H - pad.t - pad.b);
    return [x, y];
  });
  const line = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xy[xy.length - 1][0]},${H - pad.b} L${xy[0][0]},${
    H - pad.b
  } Z`;
  const yTicks = [0, 0.5, 1].map((t) => ({
    y: pad.t + t * (H - pad.t - pad.b),
    v: hi - t * rng,
  }));
  const spanMs = series[series.length - 1].t - series[0].t;
  const xTicks = [0, 0.33, 0.66, 1].map((t) => {
    const i = Math.min(
      series.length - 1,
      Math.round(t * (series.length - 1))
    );
    return { x: xy[i][0], label: fmtX(series[i].t, spanMs) };
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
            Total balance
          </div>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <div className="text-3xl font-bold tabular-nums text-white">
              ${fmtUsd(last)}
            </div>
            <span className="mb-1 text-sm font-medium text-slate-400">USDT</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                up
                  ? "bg-emerald-500/15 text-emerald-300"
                  : down
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-white/5 text-slate-400"
              }`}
            >
              {up ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                up
                  ? "bg-emerald-500/10 text-emerald-200/90"
                  : down
                    ? "bg-rose-500/10 text-rose-200/90"
                    : "bg-white/5 text-slate-400"
              }`}
            >
              {up ? "+" : ""}
              ${fmtUsd(changeAbs)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 rounded-xl border border-white/10 bg-black/20 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                range === r.id
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 h-44 w-full"
        role="img"
        aria-label="Account balance trend"
      >
        <defs>
          <linearGradient id={`balFill-${fillId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTop} stopOpacity="0.32" />
            <stop offset="100%" stopColor={fillTop} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={t.y}
              y2={t.y}
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={pad.l - 6}
              y={t.y + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize="10"
            >
              {fmtAxis(t.v)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={H - 8}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
          >
            {t.label}
          </text>
        ))}
        <path d={area} fill={`url(#balFill-${fillId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {xy.length > 0 && (
          <circle
            cx={xy[xy.length - 1][0]}
            cy={xy[xy.length - 1][1]}
            r="4.2"
            fill={stroke}
            stroke="#0d1424"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
