/**
 * Authenticated Home — corporate landing with live Market Overview.
 * Sign In / Register and Buy/Sell are intentionally omitted (session active;
 * orders stay on the Trading tab).
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  CandlestickChart,
  Zap,
  ArrowRight,
  Globe2,
  Activity,
  BarChart3,
  Radio,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

const OVERVIEW_ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
];

const CORP_PILLARS = [
  {
    icon: Zap,
    title: "Institutional Latency Execution",
    body: "Latency-aware price trajectories and order loops built for professional terminal workflows.",
  },
  {
    icon: Activity,
    title: "Advanced Seconds Settlement Engine",
    body: "Fixed-duration contracts resolve the moment the timer hits zero with clear WIN / LOSS outcomes.",
  },
  {
    icon: ShieldCheck,
    title: "Secured Wallet Infrastructure",
    body: "Identity verification, TRC-20 wallet controls, and session-protected balances for every trader.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Select a market",
    body: "Choose a major pair from the live overview or Trading watchlist.",
  },
  {
    step: "02",
    title: "Set stake & duration",
    body: "Pick your seconds window and size the position from your Trading Wallet.",
  },
  {
    step: "03",
    title: "Buy Long or Sell Short",
    body: "Execute a directional call — the live chart updates every second.",
  },
  {
    step: "04",
    title: "Automatic settlement",
    body: "When the timer ends, profit or loss posts to Live Earnings and Market Activity.",
  },
];

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Seconds Trading",
    body: "Fixed-time long and short positions with live market feeds and precise countdown settlement.",
  },
  {
    icon: BarChart3,
    title: "Live Market Overview",
    body: "Second-by-second tick streams across major crypto pairs with interactive chart switching.",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    body: "Trades resolve the moment the timer hits zero — with clear WIN / LOSS outcomes in Market Activity.",
  },
  {
    icon: Globe2,
    title: "Global Markets",
    body: "Trade major crypto pairs and select equities from a single responsive terminal.",
  },
];

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
}

function formatUsd(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `-$${abs}` : `$${abs}`;
}

function seedSeries(base, len = 48) {
  const out = [base];
  let cur = base;
  for (let i = 1; i < len; i++) {
    cur = Math.max(0.0001, cur + (Math.random() - 0.5) * base * 0.00035);
    out.push(cur);
  }
  return out;
}

function MiniSpark({ series, positive, width = 88, height = 28 }) {
  if (!series?.length) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = width / Math.max(series.length - 1, 1);
  const d = series
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = positive ? "#34d399" : "#fb7185";
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LivePreviewChart({ symbol, series, positive }) {
  const uid = useId().replace(/:/g, "");
  const W = 720;
  const H = 280;
  const pad = { top: 18, right: 56, bottom: 22, left: 8 };

  if (!series?.length) {
    return (
      <div className="flex h-[220px] items-center justify-center gap-2 text-sm text-slate-500 sm:h-[280px]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Syncing live feed…
      </div>
    );
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = (W - pad.left - pad.right) / Math.max(series.length - 1, 1);
  const xy = series.map((v, i) => {
    const x = pad.left + i * step;
    const y = pad.top + ((max - v) / range) * (H - pad.top - pad.bottom);
    return [x, y];
  });
  const line = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xy[xy.length - 1][0]},${H - pad.bottom} L${xy[0][0]},${
    H - pad.bottom
  } Z`;

  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = max - (range / 4) * i;
    const y = pad.top + (i / 4) * (H - pad.top - pad.bottom);
    yLabels.push({ value, y });
  }

  const stroke = positive ? "#34d399" : "#fb7185";
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[220px] w-full sm:h-[260px] md:h-[280px]"
      role="img"
      aria-label={`${symbol} live price chart`}
    >
      <defs>
        <linearGradient id={`mog-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
        <filter id={`mog-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {yLabels.map((yl, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            y1={yl.y}
            x2={W - pad.right}
            y2={yl.y}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3 4"
          />
          <text
            x={W - pad.right + 6}
            y={yl.y + 3}
            fill="#64748b"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            {yl.value >= 1000
              ? yl.value.toFixed(0)
              : yl.value >= 1
                ? yl.value.toFixed(2)
                : yl.value.toFixed(4)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#mog-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#mog-glow-${uid})`}
      />

      <line
        x1={lx}
        y1={pad.top}
        x2={lx}
        y2={H - pad.bottom}
        stroke={stroke}
        strokeOpacity="0.18"
        strokeDasharray="2 3"
      />
      <circle cx={lx} cy={ly} r="8" fill={stroke} fillOpacity="0.18">
        <animate attributeName="r" values="6;11;6" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={lx} cy={ly} r="3.5" fill={stroke} />
    </svg>
  );
}

function MarketOverviewGrid() {
  const [selected, setSelected] = useState("BTC");
  const [markets, setMarkets] = useState({});
  const [seriesMap, setSeriesMap] = useState({});
  const [flash, setFlash] = useState(null);
  const [feedAge, setFeedAge] = useState(null);
  const targets = useRef({});
  const displays = useRef({});
  const flashTimer = useRef(null);

  const loadMarkets = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.markets();
      const list = (res.markets || []).filter((m) => m.assetType === "crypto");
      const next = {};
      for (const m of list) {
        if (OVERVIEW_ASSETS.some((a) => a.symbol === m.asset)) {
          next[m.asset] = Number(m.price) || 0;
          targets.current[m.asset] = Number(m.price) || 0;
          if (displays.current[m.asset] == null) {
            displays.current[m.asset] = Number(m.price) || 0;
          }
        }
      }
      setMarkets((prev) => ({ ...prev, ...next }));
      setFeedAge(Date.now());

      setSeriesMap((prev) => {
        const merged = { ...prev };
        for (const { symbol } of OVERVIEW_ASSETS) {
          if (!merged[symbol]?.length && next[symbol]) {
            merged[symbol] = seedSeries(next[symbol]);
          }
        }
        return merged;
      });
    } catch {
      /* ignore transient */
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    const poll = setInterval(loadMarkets, 1000);
    return () => clearInterval(poll);
  }, [loadMarkets]);

  // Second-by-second micro-movements toward live feed targets
  useEffect(() => {
    const id = setInterval(() => {
      const updates = {};
      for (const { symbol } of OVERVIEW_ASSETS) {
        const tgt = targets.current[symbol];
        if (tgt == null || !(tgt > 0)) continue;
        let cur = displays.current[symbol];
        if (cur == null) {
          cur = tgt;
        } else {
          const gap = tgt - cur;
          const absGap = Math.abs(gap);
          if (absGap < Math.abs(tgt) * 1e-8 || absGap < 1e-10) {
            cur = tgt + tgt * (Math.random() - 0.5) * 0.00012;
          } else {
            const ease = 0.05 + Math.random() * 0.04;
            const maxStep = Math.max(Math.abs(tgt) * 0.0003, absGap * 0.02);
            cur = cur + Math.sign(gap) * Math.min(absGap * ease, maxStep);
          }
        }
        displays.current[symbol] = cur;
        updates[symbol] = cur;
      }
      if (!Object.keys(updates).length) return;

      setSeriesMap((prev) => {
        const next = { ...prev };
        for (const [sym, p] of Object.entries(updates)) {
          const s = next[sym] ? [...next[sym], p] : seedSeries(p);
          next[sym] = s.slice(-72);
        }
        return next;
      });
      setMarkets((prev) => ({ ...prev, ...updates }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const meta = OVERVIEW_ASSETS.find((a) => a.symbol === selected) || OVERVIEW_ASSETS[0];
  const series = seriesMap[selected] || [];
  const price = series.length ? series[series.length - 1] : markets[selected] || 0;
  const first = series[0] || price;
  const changePct = first ? ((price - first) / first) * 100 : 0;
  const positive = changePct >= 0;
  const prev = series.length > 1 ? series[series.length - 2] : price;
  const tickUp = price >= prev;

  useEffect(() => {
    if (!series.length) return;
    setFlash(tickUp ? "up" : "down");
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 420);
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [price, tickUp, series.length]);

  const sessionHigh = series.length ? Math.max(...series) : price;
  const sessionLow = series.length ? Math.min(...series) : price;
  const spread = price ? ((sessionHigh - sessionLow) / price) * 100 : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Market Overview Grid
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white md:text-xl">
            Live multi-asset preview
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Select an asset to stream its real-time trajectory. Order entry stays on Trading.
          </p>
        </div>
        <div className="text-[11px] tabular-nums text-slate-500">
          {feedAge
            ? `Feed synced · ${new Date(feedAge).toLocaleTimeString()}`
            : "Connecting feed…"}
        </div>
      </div>

      {/* Asset switcher cards */}
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="tablist"
        aria-label="Asset switcher"
      >
        {OVERVIEW_ASSETS.map(({ symbol, name }) => {
          const s = seriesMap[symbol] || [];
          const p = s.length ? s[s.length - 1] : markets[symbol] || 0;
          const f = s[0] || p;
          const pct = f ? ((p - f) / f) * 100 : 0;
          const up = pct >= 0;
          const active = selected === symbol;
          return (
            <button
              key={symbol}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(symbol)}
              className={`rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-[#0d1424] hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">{symbol}</div>
                  <div className="text-[10px] text-slate-500">{name}</div>
                </div>
                <div
                  className={`text-[10px] font-semibold tabular-nums ${
                    up ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {up ? "+" : ""}
                  {pct.toFixed(2)}%
                </div>
              </div>
              <div className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-100">
                ${formatPrice(p)}
              </div>
              <div className="mt-1.5">
                <MiniSpark series={s.slice(-24)} positive={up} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main live chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className={`overflow-hidden rounded-2xl border bg-[#0a1220]/90 p-4 sm:p-5 ${
            flash === "up"
              ? "border-emerald-400/35"
              : flash === "down"
                ? "border-rose-400/35"
                : "border-white/10"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/15 text-xs font-bold text-cyan-200 ring-1 ring-cyan-400/25">
                {meta.symbol}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {meta.name}
                  <span className="text-slate-500"> / USDT</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Live spot · Streaming plot
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-mono text-xl font-bold tabular-nums sm:text-2xl ${
                  flash === "up"
                    ? "text-emerald-300"
                    : flash === "down"
                      ? "text-rose-300"
                      : "text-white"
                }`}
              >
                ${formatPrice(price)}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${
                  positive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {positive ? "+" : ""}
                {changePct.toFixed(2)}% session
              </div>
            </div>
          </div>

          <LivePreviewChart
            symbol={meta.symbol}
            series={series}
            positive={positive}
          />

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 sm:gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Session high
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-200 sm:text-sm">
                ${formatPrice(sessionHigh)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Session low
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-200 sm:text-sm">
                ${formatPrice(sessionLow)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Range
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-200 sm:text-sm">
                {spread.toFixed(3)}%
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

export default function HomeLanding({ user, walletUsdt = 0, liveEarnings = 0, onStartTrading }) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero — brand-first, no auth CTAs */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1424] via-[#0a1220] to-[#071018] px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300 ring-1 ring-cyan-400/25"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Nexus
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Nexus
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-2 text-lg font-medium text-slate-200 sm:text-xl"
          >
            Professional seconds{" "}
            <span className="bg-gradient-to-r from-cyan-200 to-emerald-300 bg-clip-text text-transparent">
              exchange platform
            </span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400 md:mx-0 md:text-base"
          >
            Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
            . Review live market overview here — open the Trading tab when you
            are ready to place live positions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:justify-start"
          >
            <button
              type="button"
              onClick={onStartTrading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              Open Trading Terminal
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Trading Wallet
              </div>
              <div
                className={`mt-1 text-lg font-bold tabular-nums ${
                  walletUsdt < 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {formatUsd(walletUsdt)}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/90">
                Live Earnings
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                {formatUsd(liveEarnings)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Market Overview */}
      <MarketOverviewGrid />

      {/* Platform advantages */}
      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Platform advantages
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Institutional execution, seconds settlement, and secured wallets.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {CORP_PILLARS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug text-white">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How Exchange Trading Works */}
      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            How Exchange Trading Works
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            From market selection to automatic settlement in four steps.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map(({ step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="text-lg font-bold text-cyan-400/80">{step}</div>
              <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Why traders choose Nexus
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Built for clarity, speed, and secure account management.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1424] px-5 py-6 text-center md:px-8">
        <h2 className="text-base font-semibold text-white md:text-lg">
          Ready when you are
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
          Your session is active. Use Profile / Settings for avatar, TRC-20
          wallet, and password — or jump straight into the Trading workspace to
          place Buy / Sell orders.
        </p>
        <button
          type="button"
          onClick={onStartTrading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Go to Trading
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
