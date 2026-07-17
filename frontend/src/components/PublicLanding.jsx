/**
 * Public marketing landing — unauthenticated root view.
 * Live BTC/ETH/SOL ticker via Binance WebSocket + REST fallback.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Timer,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Radio,
  Layers,
  Lock,
  ChevronRight,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

const PAIRS = [
  { symbol: "BTC", name: "Bitcoin", stream: "btcusdt@ticker" },
  { symbol: "ETH", name: "Ethereum", stream: "ethusdt@ticker" },
  { symbol: "SOL", name: "Solana", stream: "solusdt@ticker" },
];

const ADVANTAGES = [
  {
    icon: Zap,
    title: "Institutional Latency Execution",
    body: "Order routing tuned for sub-second decision loops — price vectors refresh every tick so your directional calls meet the market as it moves.",
  },
  {
    icon: Timer,
    title: "Advanced Seconds Settlement Engine",
    body: "Fixed-duration long and short contracts settle the instant the timer hits zero, with transparent WIN / LOSS outcomes in your activity feed.",
  },
  {
    icon: ShieldCheck,
    title: "Secured Wallet Infrastructure",
    body: "Session-protected balances, TRC-20 withdrawal rails, and identity controls keep your workspace locked down without slowing execution.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Create your account",
    body: "Register with an invite code and sign in to unlock your trading wallet.",
  },
  {
    step: "02",
    title: "Fund & configure",
    body: "Deposit USDT, set your TRC-20 address, and complete verification when ready.",
  },
  {
    step: "03",
    title: "Pick a market",
    body: "Select a major pair, watch the live chart, and choose duration plus stake.",
  },
  {
    step: "04",
    title: "Execute & settle",
    body: "Buy Long or Sell Short — settlement resolves automatically when time expires.",
  },
];

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
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
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={positive ? "#34d399" : "#fb7185"}
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
    yLabels.push({
      value: max - (range / 4) * i,
      y: pad.top + (i / 4) * (H - pad.top - pad.bottom),
    });
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
        <linearGradient id={`plg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
        <filter id={`plg-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
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
      <path d={area} fill={`url(#plg-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#plg-glow-${uid})`}
      />
      <circle cx={lx} cy={ly} r="8" fill={stroke} fillOpacity="0.18">
        <animate attributeName="r" values="6;11;6" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={lx} cy={ly} r="3.5" fill={stroke} />
    </svg>
  );
}

function useLiveMarketFeed() {
  const [markets, setMarkets] = useState({});
  const [seriesMap, setSeriesMap] = useState({});
  const [feedAge, setFeedAge] = useState(null);
  const [connected, setConnected] = useState(false);
  const targets = useRef({});
  const displays = useRef({});

  const ingestPrice = useCallback((symbol, price) => {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return;
    targets.current[symbol] = p;
    if (displays.current[symbol] == null) displays.current[symbol] = p;
    setMarkets((prev) => ({ ...prev, [symbol]: p }));
    setFeedAge(Date.now());
    setSeriesMap((prev) => {
      if (prev[symbol]?.length) return prev;
      return { ...prev, [symbol]: seedSeries(p) };
    });
  }, []);

  // REST bootstrap + fallback poll (public API)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await SecondsTradeAPI.publicMarkets();
        if (cancelled) return;
        for (const m of res.markets || []) {
          if (PAIRS.some((p) => p.symbol === m.asset)) {
            ingestPrice(m.asset, m.price);
          }
        }
      } catch {
        /* WS may still drive the feed */
      }
    };
    load();
    const poll = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [ingestPrice]);

  // Binance combined ticker WebSocket — real-time stream
  useEffect(() => {
    const streams = PAIRS.map((p) => p.stream).join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    let ws;
    let closed = false;
    let retryTimer;
    let retryMs = 1200;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 1.6, 12000);
        return;
      }
      ws.onopen = () => {
        setConnected(true);
        retryMs = 1200;
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const d = msg?.data || msg;
          const pair = String(d?.s || "").toUpperCase();
          const price = Number(d?.c ?? d?.p);
          if (!pair.endsWith("USDT") || !Number.isFinite(price)) return;
          const asset = pair.slice(0, -4);
          if (PAIRS.some((p) => p.symbol === asset)) ingestPrice(asset, price);
        } catch {
          /* ignore malformed ticks */
        }
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          retryTimer = setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 1.6, 12000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [ingestPrice]);

  // Per-second visual updates: ease toward live targets + flash series
  useEffect(() => {
    const id = setInterval(() => {
      const updates = {};
      for (const { symbol } of PAIRS) {
        const tgt = targets.current[symbol];
        if (tgt == null || !(tgt > 0)) continue;
        let cur = displays.current[symbol];
        if (cur == null) {
          cur = tgt;
        } else {
          const gap = tgt - cur;
          const absGap = Math.abs(gap);
          if (absGap < Math.abs(tgt) * 1e-8 || absGap < 1e-10) {
            cur = tgt + tgt * (Math.random() - 0.5) * 0.0001;
          } else {
            const ease = 0.12 + Math.random() * 0.08;
            const maxStep = Math.max(Math.abs(tgt) * 0.0004, absGap * 0.08);
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

  return { markets, seriesMap, feedAge, connected };
}

function MarketShowcase() {
  const { markets, seriesMap, feedAge, connected } = useLiveMarketFeed();
  const [selected, setSelected] = useState("BTC");
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);

  const meta = PAIRS.find((a) => a.symbol === selected) || PAIRS[0];
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

  return (
    <section id="markets" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live market ticker
          </div>
          <h2 className="font-display mt-1 text-xl font-semibold text-white md:text-2xl">
            Major pairs · second-by-second
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Switch assets to preview the active live chart vector.
          </p>
        </div>
        <div className="text-[11px] tabular-nums text-slate-500">
          {connected ? "Binance stream · live" : "Reconnecting…"}
          {feedAge ? ` · ${new Date(feedAge).toLocaleTimeString()}` : ""}
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="tablist"
        aria-label="Asset switcher"
      >
        {PAIRS.map(({ symbol, name }) => {
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
              className={`rounded-2xl border p-3.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${
                active
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-white/10 bg-[#0d1424] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">
                    {symbol}
                    <span className="text-slate-500">/USDT</span>
                  </div>
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
              <div
                className={`mt-2 font-mono text-sm font-semibold tabular-nums transition-colors ${
                  active && flash === "up"
                    ? "text-emerald-300"
                    : active && flash === "down"
                      ? "text-rose-300"
                      : "text-slate-100"
                }`}
              >
                ${formatPrice(p)}
              </div>
              <div className="mt-1.5">
                <MiniSpark series={s.slice(-24)} positive={up} />
              </div>
            </button>
          );
        })}
      </div>

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
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-xs font-bold text-amber-200 ring-1 ring-amber-400/25">
                {meta.symbol}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {meta.name}
                  <span className="text-slate-500"> / USDT</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <Radio className="h-3 w-3 text-emerald-400" />
                  Live spot · streaming plot
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
          <LivePreviewChart symbol={meta.symbol} series={series} positive={positive} />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

export default function PublicLanding({ onSignIn, onRegister }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070a12] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,_rgba(245,158,11,0.12),_transparent_45%),radial-gradient(ellipse_at_80%_10%,_rgba(16,185,129,0.08),_transparent_40%),linear-gradient(180deg,#0a0f1a_0%,#070a12_40%,#05080f_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070a12]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
            Nexus
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/10 sm:px-4 sm:text-sm"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 sm:px-4 sm:text-sm"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-14 px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        {/* Hero — brand first, one CTA group, no clutter */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#121a2b] via-[#0c1422] to-[#070d16] px-5 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl"
            >
              Nexus
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="mt-4 text-lg font-medium text-slate-100 sm:text-xl"
            >
              Trade crypto seconds with institutional clarity.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.45 }}
              className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base"
            >
              Live major-pair feeds, fixed-time long/short execution, and
              settlement you can trust — built for serious traders.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <button
                type="button"
                onClick={onRegister}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-300 hover:to-amber-400"
              >
                Open account
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign In
              </button>
            </motion.div>
          </div>
        </section>

        <MarketShowcase />

        {/* Advantage cards */}
        <section>
          <div className="mb-5 max-w-xl">
            <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
              Built for precision
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Platform advantages that keep every session sharp and secure.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {ADVANTAGES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: 0.05 * i, duration: 0.4 }}
                className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 md:p-6"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-snug text-white md:text-base">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 md:text-sm">
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
                How Exchange Trading Works
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Four steps from signup to settled outcome.
              </p>
            </div>
            <Layers className="hidden h-6 w-6 text-slate-600 sm:block" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map(({ step, title, body }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.06 * i }}
                className="relative rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
              >
                <div className="font-display text-2xl font-bold text-amber-400/80">
                  {step}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {body}
                </p>
                {i < WORKFLOW.length - 1 && (
                  <ChevronRight className="absolute right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-700 lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-[#0d1424] to-transparent px-5 py-8 text-center sm:px-8">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-semibold text-white md:text-xl">
            Ready to enter the terminal?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Sign in to your workspace or register a new Nexus account to start
            trading major pairs with live settlement.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 sm:w-auto"
            >
              Register
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} Nexus · Seconds exchange platform
      </footer>
    </div>
  );
}
