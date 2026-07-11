/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/MainPlatform.jsx
 * =============================================================================
 *  The Nexus landing masterpiece.  A full-screen live futures trading interface
 *  where the right-hand control panel morphs (Framer Motion, shared layoutId)
 *  between the trading execution block and compact Sign In / Sign Up forms.
 *
 *  Layout
 *    ┌──────────────────────────────────────────────────────────────┐
 *    │  HeaderBar  (brand · live ticker · action buttons)           │
 *    ├────────────────────────────────────────┬─────────────────────┤
 *    │                                        │                     │
 *    │  Chart + Order Book + Positions        │   RightPanel        │
 *    │  (Left 70%)                            │   (Right 30%)       │
 *    │                                        │   trade | auth      │
 *    │                                        │                     │
 *    └────────────────────────────────────────┴─────────────────────┘
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  AtSign,
  Globe2,
  ShieldCheck,
  LogIn,
  UserPlus,
  X,
  BookOpen,
  BarChart3,
  Layers,
  Ticket,
} from "lucide-react";

import { AuthAPI, setToken } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Static seed data — replace with WebSocket feed in production
// ---------------------------------------------------------------------------
const TICKER_SEED = [
  { symbol: "BTC", pair: "BTC/USDT", price: 68240, change: 2.14 },
  { symbol: "ETH", pair: "ETH/USDT", price: 3520, change: 1.28 },
  { symbol: "SOL", pair: "SOL/USDT", price: 168, change: 4.62 },
  { symbol: "BNB", pair: "BNB/USDT", price: 578, change: -0.71 },
  { symbol: "XRP", pair: "XRP/USDT", price: 0.58, change: -0.87 },
  { symbol: "ADA", pair: "ADA/USDT", price: 0.42, change: 3.02 },
  { symbol: "AVAX", pair: "AVAX/USDT", price: 34.8, change: 1.44 },
  { symbol: "DOGE", pair: "DOGE/USDT", price: 0.128, change: 6.85 },
];

const POSITION_NAMES = [
  "0xAda…f4",
  "quantumWhale",
  "sats_bull",
  "orbit.mercer",
  "leverage_lord",
  "0xC9b…12",
  "pnl_kraken",
  "vega.node",
  "shortstack",
  "moonrails",
];

// Utility number formatters
const fmtUSD = (n, d) =>
  Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d ?? (Number(n) < 1 ? 4 : 2),
  });
const fmt = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Animated Background — grid + drifting particles
// ---------------------------------------------------------------------------
const AnimatedBackground = () => {
  const [particles] = useState(() =>
    Array.from({ length: 44 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      dur: Math.random() * 20 + 20,
      delay: Math.random() * 10,
    }))
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]">
        <defs>
          <pattern
            id="grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Ambient blobs */}
      <motion.div
        className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-3xl"
        animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-cyan-500/15 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Drifting particles */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-emerald-300/40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [-8, 8, -8],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// HeaderBar — brand + live ticker + action buttons
// ---------------------------------------------------------------------------
const HeaderBar = ({ tickers, onSignIn, onSignUp }) => (
  <header className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">Nexus</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Futures · Spot · Quant
          </div>
        </div>
      </div>

      {/* Ticker strip */}
      <div className="hidden max-w-2xl flex-1 overflow-hidden md:block">
        <div className="scroll-fade relative overflow-hidden">
          <motion.div
            className="flex gap-6 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          >
            {[...tickers, ...tickers].map((t, i) => {
              const positive = t.change >= 0;
              return (
                <div
                  key={`${t.pair}-${i}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="font-semibold text-slate-300">
                    {t.pair}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-100">
                    {fmtUSD(t.price)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      positive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {positive ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {positive ? "+" : ""}
                    {t.change.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="#docs"
          className="hidden items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] md:flex"
        >
          <BookOpen className="h-3 w-3" /> Docs
        </a>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSignIn}
          className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.05]"
        >
          Sign in
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={onSignUp}
          className="rounded-lg bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-indigo-500/25"
        >
          Create account
        </motion.button>
      </div>
    </div>
  </header>
);

// ---------------------------------------------------------------------------
// MainChart — SVG line + area + Y-axis + pulsing marker
// ---------------------------------------------------------------------------
const buildSpark = (base, len = 90, drift = 0.02) => {
  const out = [base];
  for (let i = 1; i < len; i++) {
    const step = (Math.random() - 0.5) * drift * base;
    out.push(Math.max(0.0001, out[i - 1] + step));
  }
  return out;
};

const MainChart = ({ symbol, series, name }) => {
  const W = 900;
  const H = 340;
  const pad = { top: 20, right: 60, bottom: 30, left: 10 };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = (W - pad.left - pad.right) / (series.length - 1);
  const xy = series.map((v, i) => {
    const x = pad.left + i * step;
    const y = pad.top + ((max - v) / range) * (H - pad.top - pad.bottom);
    return [x, y];
  });
  const d = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${d} L${xy[xy.length - 1][0]},${H - pad.bottom} L${xy[0][0]},${
    H - pad.bottom
  } Z`;

  const last = series[series.length - 1];
  const first = series[0];
  const change = ((last - first) / first) * 100;
  const positive = change >= 0;

  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = max - (range / 4) * i;
    const y = pad.top + (i / 4) * (H - pad.top - pad.bottom);
    yLabels.push({ value, y });
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-5 backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-[11px] font-bold text-emerald-300">
            {symbol}
          </div>
          <div>
            <div className="text-sm font-semibold">
              {name} <span className="text-slate-500">/USDT</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Perpetual · 100× Max
            </div>
          </div>
        </div>

        <div className="ml-auto text-right">
          <div className="text-2xl font-bold tabular-nums leading-none">
            {fmtUSD(last)}
          </div>
          <div
            className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
              positive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {positive ? "+" : ""}
            {change.toFixed(2)}% · 24h
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {["1H", "4H", "1D", "1W"].map((tf, i) => (
            <button
              key={tf}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                i === 1
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                  : "border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={`grad-main-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={positive ? "#34d399" : "#fb7185"}
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor={positive ? "#34d399" : "#fb7185"}
              stopOpacity="0"
            />
          </linearGradient>
          <filter
            id={`glow-main-${symbol}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="3.5" result="cb" />
            <feMerge>
              <feMergeNode in="cb" />
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
              {yl.value.toFixed(yl.value > 100 ? 0 : 2)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#grad-main-${symbol})`} />
        <path
          d={d}
          fill="none"
          stroke={positive ? "#34d399" : "#fb7185"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-main-${symbol})`}
        />

        <g>
          <line
            x1={xy[xy.length - 1][0]}
            y1={pad.top}
            x2={xy[xy.length - 1][0]}
            y2={H - pad.bottom}
            stroke={positive ? "#34d399" : "#fb7185"}
            strokeOpacity="0.15"
            strokeDasharray="2 3"
          />
          <circle
            cx={xy[xy.length - 1][0]}
            cy={xy[xy.length - 1][1]}
            r="8"
            fill={positive ? "#34d399" : "#fb7185"}
            fillOpacity="0.15"
          >
            <animate
              attributeName="r"
              values="6;14;6"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={xy[xy.length - 1][0]}
            cy={xy[xy.length - 1][1]}
            r="4"
            fill={positive ? "#34d399" : "#fb7185"}
          />
        </g>
      </svg>

      {/* Indicator strip */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { k: "RSI", v: "58.4" },
          { k: "MACD", v: "+142" },
          { k: "MA(50)", v: fmtUSD(last * 0.99) },
          { k: "24h Vol", v: "1.28B" },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5"
          >
            <div className="text-[9px] uppercase tracking-widest text-slate-500">
              {s.k}
            </div>
            <div className="text-xs font-semibold tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// OrderBook — glowing green (bids) / red (asks) with depth bars
// ---------------------------------------------------------------------------
const buildOrderBook = (mid) => {
  const bids = [];
  const asks = [];
  for (let i = 0; i < 12; i++) {
    const bStep = (Math.random() * 0.02 + 0.005) * (i + 1);
    const aStep = (Math.random() * 0.02 + 0.005) * (i + 1);
    bids.push({
      price: mid - mid * bStep,
      size: Math.random() * 4 + 0.1,
    });
    asks.push({
      price: mid + mid * aStep,
      size: Math.random() * 4 + 0.1,
    });
  }
  return { bids, asks };
};

const OrderBook = ({ mid }) => {
  const [book, setBook] = useState(() => buildOrderBook(mid));

  useEffect(() => {
    const id = setInterval(() => setBook(buildOrderBook(mid)), 1400);
    return () => clearInterval(id);
  }, [mid]);

  const maxSize = Math.max(
    ...book.bids.map((r) => r.size),
    ...book.asks.map((r) => r.size)
  );

  const Row = ({ side, r }) => {
    const pct = (r.size / maxSize) * 100;
    const positive = side === "bid";
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: side === "bid" ? -6 : 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="relative grid grid-cols-3 gap-2 rounded px-2 py-0.5 text-[11px] tabular-nums"
      >
        <div
          className={`pointer-events-none absolute inset-y-0 ${
            positive ? "right-0" : "left-0"
          } rounded ${
            positive ? "bg-emerald-500/10" : "bg-rose-500/10"
          }`}
          style={{ width: `${pct}%` }}
        />
        <span
          className={`relative col-span-1 font-semibold ${
            positive ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {r.price.toFixed(2)}
        </span>
        <span className="relative col-span-1 text-right text-slate-300">
          {r.size.toFixed(3)}
        </span>
        <span className="relative col-span-1 text-right text-slate-500">
          {(r.price * r.size).toFixed(0)}
        </span>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-slate-950/50 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Layers className="h-3.5 w-3.5 text-indigo-300" /> Order Book
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          0.01 depth
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-white/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        <div>Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>
      <div className="mt-1 space-y-0.5">
        <AnimatePresence initial={false}>
          {book.asks
            .slice()
            .reverse()
            .map((r, i) => (
              <Row key={`a-${i}`} side="ask" r={r} />
            ))}
        </AnimatePresence>
      </div>
      <div className="my-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-center">
        <div className="text-lg font-bold tabular-nums text-emerald-300">
          {fmtUSD(mid)}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-slate-500">
          Mark Price
        </div>
      </div>
      <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {book.bids.map((r, i) => (
            <Row key={`b-${i}`} side="bid" r={r} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PositionsTracker — global animated positions grid
// ---------------------------------------------------------------------------
const seedPositions = () => {
  const symbols = ["BTC", "ETH", "SOL", "AVAX", "BNB", "DOGE"];
  return Array.from({ length: 8 }).map(() => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? "long" : "short";
    const size = +(Math.random() * 5 + 0.05).toFixed(3);
    const pnl = (Math.random() - 0.4) * 500;
    const lev = [10, 20, 25, 50, 100][Math.floor(Math.random() * 5)];
    const trader =
      POSITION_NAMES[Math.floor(Math.random() * POSITION_NAMES.length)];
    return {
      id: `${trader}-${symbol}-${Math.random()}`,
      trader,
      symbol,
      side,
      size,
      pnl,
      lev,
      ts: Date.now(),
    };
  });
};

const PositionsTracker = () => {
  const [rows, setRows] = useState(seedPositions);

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const dropOne = prev.slice(0, -1);
        const next = seedPositions()[0];
        return [next, ...dropOne];
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Activity className="h-3.5 w-3.5 text-emerald-300" /> Global
          Positions
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Live
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 border-b border-white/5 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        <div className="col-span-3">Trader</div>
        <div className="col-span-2">Pair</div>
        <div className="col-span-2">Side</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-1">Lev</div>
        <div className="col-span-2 text-right">PnL</div>
      </div>
      <ul className="mt-1 space-y-1">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="grid grid-cols-12 items-center gap-2 rounded-lg px-1 py-1.5 text-[11px] hover:bg-white/[0.02]"
            >
              <div className="col-span-3 truncate font-mono text-slate-300">
                {r.trader}
              </div>
              <div className="col-span-2 font-semibold">
                {r.symbol}
                <span className="text-slate-500">/USDT</span>
              </div>
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    r.side === "long"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {r.side === "long" ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  )}
                  {r.side}
                </span>
              </div>
              <div className="col-span-2 tabular-nums text-slate-300">
                {r.size}
              </div>
              <div className="col-span-1 text-slate-400">{r.lev}×</div>
              <div
                className={`col-span-2 text-right font-semibold tabular-nums ${
                  r.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {r.pnl >= 0 ? "+" : ""}
                {r.pnl.toFixed(2)}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TradeMode — default right panel content
// ---------------------------------------------------------------------------
const TradeMode = ({ price, symbol, onSignIn, onSignUp }) => {
  const [side, setSide] = useState("long");
  const [type, setType] = useState("market");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(20);

  const notional = (parseFloat(amount) || 0) * price;
  const liq = side === "long" ? price * (1 - 1 / leverage) : price * (1 + 1 / leverage);

  return (
    <motion.div
      key="trade"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* Long / Short */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1">
        {["long", "short"].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`relative rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition ${
              side === s
                ? s === "long"
                  ? "text-emerald-200"
                  : "text-rose-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {side === s && (
              <motion.span
                layoutId="trade-side-pill"
                className={`absolute inset-0 rounded-lg ${
                  s === "long" ? "bg-emerald-500/20" : "bg-rose-500/20"
                }`}
              />
            )}
            <span className="relative flex items-center justify-center gap-1">
              {s === "long" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {s}
            </span>
          </button>
        ))}
      </div>

      {/* Limit / Market */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
        {["limit", "market", "stop"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
              type === t
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
          <span>Size ({symbol})</span>
          <span>≈ {fmtUSD(notional)}</span>
        </div>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-transparent text-lg font-semibold text-slate-100 outline-none placeholder:text-slate-600"
        />
      </div>

      {/* Leverage slider */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> Leverage
          </span>
          <span className="font-semibold text-emerald-300">{leverage}×</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-emerald-400"
        />
        <div className="mt-1 flex justify-between text-[9px] text-slate-500">
          <span>1×</span>
          <span>25×</span>
          <span>50×</span>
          <span>100×</span>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-500">
            Mark
          </div>
          <div className="font-semibold tabular-nums">{fmtUSD(price)}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-500">
            Est. Liq
          </div>
          <div className="font-semibold tabular-nums text-rose-300">
            {fmtUSD(liq)}
          </div>
        </div>
      </div>

      {/* Sign-in CTA */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25"
      >
        <LogIn className="h-4 w-4" /> Sign in to trade
      </motion.button>
      <button
        onClick={onSignUp}
        className="w-full text-center text-[11px] text-slate-400 hover:text-slate-200"
      >
        No account?{" "}
        <span className="font-semibold text-indigo-300">Create one →</span>
      </button>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Compact input primitive shared by SignIn / SignUp
// ---------------------------------------------------------------------------
const CompactInput = ({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  error,
  rightSlot,
  accent = "indigo",
  autoComplete,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = !!value;
  const focusColor =
    accent === "emerald"
      ? "rgba(16, 185, 129, 0.75)"
      : "rgba(99, 102, 241, 0.75)";
  const focusRing =
    accent === "emerald"
      ? "0 0 0 4px rgba(16, 185, 129, 0.14)"
      : "0 0 0 4px rgba(99, 102, 241, 0.16)";

  return (
    <div className="w-full">
      <motion.div
        initial={false}
        animate={{
          borderColor: error
            ? "rgba(244, 63, 94, 0.6)"
            : focused
            ? focusColor
            : "rgba(255, 255, 255, 0.06)",
          boxShadow: focused ? focusRing : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative flex items-center rounded-xl border bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm"
      >
        {Icon && (
          <Icon
            className={`mr-2 h-4 w-4 shrink-0 ${
              error
                ? "text-rose-400"
                : focused
                ? accent === "emerald"
                  ? "text-emerald-300"
                  : "text-indigo-300"
                : "text-slate-500"
            }`}
          />
        )}
        <div className="relative flex-1">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{
              y: focused || hasValue ? -18 : 0,
              scale: focused || hasValue ? 0.8 : 1,
              color: error
                ? "#fb7185"
                : focused
                ? "#c7d2fe"
                : "#94a3b8",
            }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-none absolute left-0 top-1/2 origin-left -translate-y-1/2 text-[11px] font-medium"
          >
            {label}
          </motion.label>
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete={autoComplete}
            className="w-full bg-transparent pt-1.5 text-sm font-medium text-slate-100 outline-none"
          />
        </div>
        {rightSlot && <div className="ml-1">{rightSlot}</div>}
      </motion.div>
      {error && (
        <div className="mt-1 flex items-center gap-1 pl-0.5 text-[10px] text-rose-400">
          <AlertTriangle className="h-2.5 w-2.5" /> {error}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SignInMode
// ---------------------------------------------------------------------------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,24}$/;

const SignInMode = ({ onAuthSuccess, onSwitchToSignUp, onBack, notify }) => {
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!emailRegex.test(values.email)) errs.email = "Valid email required.";
    if (!values.password) errs.password = "Password required.";
    setErrors(errs);
    if (Object.keys(errs).length || submitting) return;

    setSubmitting(true);
    try {
      const res = await AuthAPI.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (!res?.token || !res?.user)
        throw { message: "Malformed server response." };
      setToken(res.token);
      notify("success", `Welcome back, ${res.user.fullName?.split(" ")[0]}`);
      setTimeout(() => onAuthSuccess(res.user), 400);
    } catch (err) {
      notify("error", err?.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      key="signin"
      onSubmit={submit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="space-y-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LogIn className="h-4 w-4 text-emerald-300" /> Sign in
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <CompactInput
        id="signin-email"
        label="Email address"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />

      <CompactInput
        id="signin-password"
        label="Password"
        icon={Lock}
        type={showPw ? "text" : "password"}
        autoComplete="current-password"
        value={values.password}
        onChange={(e) =>
          setValues((v) => ({ ...v, password: e.target.value }))
        }
        error={errors.password}
        accent="emerald"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {showPw ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        }
      />

      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={!submitting ? { scale: 1.01 } : undefined}
        whileTap={!submitting ? { scale: 0.99 } : undefined}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.button>

      <div className="text-center text-[11px] text-slate-400">
        New to Nexus?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-semibold text-indigo-300 hover:text-indigo-200"
        >
          Create account
        </button>
      </div>
    </motion.form>
  );
};

// ---------------------------------------------------------------------------
// SignUpMode
// ---------------------------------------------------------------------------
const SignUpMode = ({ onAuthSuccess, onSwitchToSignIn, onBack, notify }) => {
  const [values, setValues] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (values.fullName.trim().length < 2) e.fullName = "Enter your full name.";
    if (!usernameRegex.test(values.username))
      e.username = "3-24 chars: letters, numbers, . _ -";
    if (!emailRegex.test(values.email))
      e.email = "Enter a valid email address.";
    if (values.password.length < 8) e.password = "Min 8 characters.";
    else if (!/[A-Z]/.test(values.password))
      e.password = "Add an uppercase letter.";
    else if (!/[a-z]/.test(values.password))
      e.password = "Add a lowercase letter.";
    else if (!/\d/.test(values.password)) e.password = "Add a number.";
    if (values.confirmPassword !== values.password)
      e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length || submitting) return;

    setSubmitting(true);
    try {
      const res = await AuthAPI.register({
        fullName: values.fullName.trim(),
        username: values.username.trim().toLowerCase(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        inviteCode: values.inviteCode || null,
      });
      if (!res?.token || !res?.user)
        throw { message: "Malformed server response." };
      setToken(res.token);
      notify(
        "success",
        `Welcome to Nexus, ${res.user.fullName?.split(" ")[0]}!`
      );
      setTimeout(() => onAuthSuccess(res.user), 400);
    } catch (err) {
      notify(
        "error",
        err?.message ||
          (Array.isArray(err?.details) && err.details[0]?.message) ||
          "Registration failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      key="signup"
      onSubmit={submit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className="space-y-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-emerald-300" /> Create Account
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <CompactInput
        id="su-fullName"
        label="Full name"
        icon={UserIcon}
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
        error={errors.fullName}
      />
      <CompactInput
        id="su-username"
        label="Username"
        icon={AtSign}
        autoComplete="username"
        value={values.username}
        onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
        error={errors.username}
      />
      <CompactInput
        id="su-email"
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />
      <CompactInput
        id="su-password"
        label="Password"
        icon={Lock}
        type={showPw ? "text" : "password"}
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        error={errors.password}
        accent="emerald"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {showPw ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        }
      />
      <CompactInput
        id="su-confirm"
        label="Confirm password"
        icon={ShieldCheck}
        type={showPw ? "text" : "password"}
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={(e) =>
          setValues((v) => ({ ...v, confirmPassword: e.target.value }))
        }
        error={errors.confirmPassword}
        accent="emerald"
      />
      <CompactInput
        id="su-invite"
        label="Invite code (optional)"
        icon={Ticket}
        value={values.inviteCode}
        onChange={(e) =>
          setValues((v) => ({ ...v, inviteCode: e.target.value.toUpperCase() }))
        }
      />

      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={!submitting ? { scale: 1.01 } : undefined}
        whileTap={!submitting ? { scale: 0.99 } : undefined}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            Create account <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.button>

      <div className="text-center text-[11px] text-slate-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-semibold text-indigo-300 hover:text-indigo-200"
        >
          Sign in
        </button>
      </div>
      <p className="text-center text-[10px] text-slate-500">
        By continuing you agree to the Nexus Terms.
      </p>
    </motion.form>
  );
};

// ---------------------------------------------------------------------------
// Notification toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-xl ${
          kind === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-rose-400/25 bg-rose-500/10 text-rose-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {kind === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Main MainPlatform export
// ---------------------------------------------------------------------------
export default function MainPlatform({ onAuthSuccess }) {
  const [mode, setMode] = useState("trade"); // trade | signin | signup
  const [chartSymbol, setChartSymbol] = useState("BTC");
  const [tickers, setTickers] = useState(TICKER_SEED);
  const [chartSeries, setChartSeries] = useState(() => ({
    BTC: buildSpark(68240, 90, 0.02),
    ETH: buildSpark(3520, 90, 0.02),
    SOL: buildSpark(168, 90, 0.03),
  }));
  const [toast, setToast] = useState({ kind: null, message: "" });

  const notify = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2600);
  };

  // Live tick — update ticker + chart series
  useEffect(() => {
    const id = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const drift = 0.008;
          const nextPrice = Math.max(
            0.0001,
            t.price + (Math.random() - 0.5) * drift * t.price
          );
          const change = t.change + (Math.random() - 0.5) * 0.2;
          return { ...t, price: nextPrice, change };
        })
      );
      setChartSeries((prev) => {
        const step = (base) => {
          const last = base[base.length - 1];
          const next = Math.max(
            0.0001,
            last + (Math.random() - 0.5) * 0.012 * last
          );
          return [...base.slice(1), next];
        };
        return {
          BTC: step(prev.BTC),
          ETH: step(prev.ETH),
          SOL: step(prev.SOL),
        };
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const activePrice =
    chartSeries[chartSymbol]?.[chartSeries[chartSymbol].length - 1] || 0;
  const activeName =
    chartSymbol === "BTC"
      ? "Bitcoin"
      : chartSymbol === "ETH"
      ? "Ethereum"
      : "Solana";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100"
    >
      <AnimatedBackground />
      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <HeaderBar
          tickers={tickers}
          onSignIn={() => setMode("signin")}
          onSignUp={() => setMode("signup")}
        />

        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
          {/* LEFT — Trading dashboard (70%) */}
          <div className="flex-1 space-y-4 lg:min-w-0">
            {/* Symbol selector */}
            <div className="flex items-center gap-2">
              {["BTC", "ETH", "SOL"].map((s) => (
                <button
                  key={s}
                  onClick={() => setChartSymbol(s)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                    chartSymbol === s
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                      : "border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}/USDT · Perp
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                Streaming
              </div>
            </div>

            {/* Chart + Order book grid */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MainChart
                  symbol={chartSymbol}
                  name={activeName}
                  series={chartSeries[chartSymbol]}
                />
              </div>
              <div className="min-h-[400px]">
                <OrderBook mid={activePrice} />
              </div>
            </div>

            {/* Positions tracker */}
            <PositionsTracker />
          </div>

          {/* RIGHT — Control / auth panel (30%) */}
          <div className="lg:w-[380px] lg:shrink-0">
            <motion.div
              layoutId="right-panel"
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="sticky top-4 rounded-2xl border border-white/5 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-400/10 opacity-60 blur-xl" />
              <div className="relative">
                {/* Prominent top action row */}
                <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] p-1">
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { key: "trade", label: "Preview" },
                      { key: "signin", label: "Sign in" },
                      { key: "signup", label: "Create" },
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`relative rounded-lg py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                          mode === m.key
                            ? "text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {mode === m.key && (
                          <motion.span
                            layoutId="right-mode-pill"
                            className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/25 to-emerald-400/20"
                          />
                        )}
                        <span className="relative">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
                  <BarChart3 className="h-3 w-3 text-emerald-300" />
                  Sign in / create account to start real trading
                </div>

                <AnimatePresence mode="wait">
                  {mode === "trade" && (
                    <TradeMode
                      key="trade"
                      symbol={chartSymbol}
                      price={activePrice}
                      onSignIn={() => setMode("signin")}
                      onSignUp={() => setMode("signup")}
                    />
                  )}
                  {mode === "signin" && (
                    <SignInMode
                      key="signin"
                      notify={notify}
                      onAuthSuccess={onAuthSuccess}
                      onSwitchToSignUp={() => setMode("signup")}
                      onBack={() => setMode("trade")}
                    />
                  )}
                  {mode === "signup" && (
                    <SignUpMode
                      key="signup"
                      notify={notify}
                      onAuthSuccess={onAuthSuccess}
                      onSwitchToSignIn={() => setMode("signin")}
                      onBack={() => setMode("trade")}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <footer className="border-t border-white/5 bg-slate-950/60 py-3 text-center text-[10px] uppercase tracking-widest text-slate-600 backdrop-blur-xl">
          Nexus · Institutional-grade crypto derivatives · Live simulation
        </footer>
      </div>
    </motion.div>
  );
}
