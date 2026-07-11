/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/MainPlatform.jsx
 * =============================================================================
 *  Bitget-style pro trading masterpiece landing.
 *
 *    ┌───────────────────────────────────────────────────────────┐
 *    │  TopNav  (brand · search · notifications · session CTAs)  │
 *    ├───────────────────────────────────────────────────────────┤
 *    │  InstrumentBar  (BTC/USDT Perp · live · 24h High/Low/Vol) │
 *    ├───────────────────────────────────┬───────────────────────┤
 *    │  Candlestick Chart │ Order Book   │  Trade Execution      │
 *    │  (2/3 of 75%)      │ (1/3 of 75%) │  (right 25%)          │
 *    │                    │              │                       │
 *    │                    │              │  ┌─ Auth overlay ─┐   │
 *    │                    │              │  │  (when logged  │   │
 *    │                    │              │  │   out — flip   │   │
 *    │                    │              │  │   morphs into  │   │
 *    │                    │              │  │   Sign In /Up) │   │
 *    │                    │              │  └────────────────┘   │
 *    ├───────────────────────────────────┤                       │
 *    │  Bottom Data Center               │                       │
 *    │  [Positions|Trades|Orders|Wallet] │                       │
 *    └───────────────────────────────────┴───────────────────────┘
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
  Search,
  Bell,
  ChevronDown,
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
  ShieldCheck,
  LogIn,
  UserPlus,
  X,
  Zap,
  Layers,
  Wallet,
  History,
  ListOrdered,
  Activity,
  Ticket,
  BookOpen,
} from "lucide-react";

import { AuthAPI, setToken } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Colour tokens — mirror Bitget-style palette
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0b0e11",
  card: "#12161c",
  border: "rgba(255,255,255,0.06)",
  greenSolid: "#02c076",
  greenSoft: "rgba(2, 192, 118, 0.12)",
  redSolid: "#f6465d",
  redSoft: "rgba(246, 70, 93, 0.12)",
};

const fmtUSD = (n, d = 2) =>
  Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  });
const fmtNum = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Candlestick seed & live-tick generation
// ---------------------------------------------------------------------------
const CANDLE_COUNT = 68;

const seedCandles = (basePrice = 68240) => {
  const arr = [];
  let last = basePrice;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const open = last;
    const drift = (Math.random() - 0.5) * 0.008 * last;
    const close = Math.max(1, open + drift);
    const spread = Math.random() * 0.006 * last + 5;
    const high = Math.max(open, close) + Math.random() * spread;
    const low = Math.min(open, close) - Math.random() * spread;
    arr.push({ open, close, high, low, ts: Date.now() - (CANDLE_COUNT - i) * 60_000 });
    last = close;
  }
  return arr;
};

const nextCandle = (prev) => {
  const last = prev[prev.length - 1];
  const open = last.close;
  const drift = (Math.random() - 0.5) * 0.01 * open;
  const close = Math.max(1, open + drift);
  const spread = Math.random() * 0.008 * open + 5;
  const high = Math.max(open, close) + Math.random() * spread;
  const low = Math.min(open, close) - Math.random() * spread;
  return { open, close, high, low, ts: Date.now() };
};

// ---------------------------------------------------------------------------
// Order book seed & tick
// ---------------------------------------------------------------------------
const seedBook = (mid) => {
  const asks = [];
  const bids = [];
  for (let i = 0; i < 14; i++) {
    const aStep = (Math.random() * 0.02 + 0.002) * (i + 1);
    const bStep = (Math.random() * 0.02 + 0.002) * (i + 1);
    asks.push({ price: mid + mid * aStep, size: Math.random() * 4 + 0.05 });
    bids.push({ price: mid - mid * bStep, size: Math.random() * 4 + 0.05 });
  }
  return { asks, bids };
};

// ---------------------------------------------------------------------------
// TopNav — full-width brand + session actions
// ---------------------------------------------------------------------------
const TopNav = ({ onSignIn, onSignUp, authed }) => (
  <div className="relative z-30 border-b border-white/5 bg-[#0b0e11]/95 backdrop-blur">
    <div className="flex h-12 items-center gap-4 px-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-md shadow-indigo-500/25">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight">Nexus</span>
        <span className="hidden text-[10px] font-medium uppercase tracking-widest text-slate-500 sm:inline">
          Pro Trading
        </span>
      </div>

      <nav className="hidden items-center gap-4 md:flex">
        {["Derivatives", "Spot", "Copy Trade", "Earn", "P2P"].map((t, i) => (
          <button
            key={t}
            className={`text-[11px] font-semibold ${
              i === 0
                ? "text-emerald-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mx-4 hidden flex-1 items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 md:flex">
        <Search className="h-3 w-3 text-slate-500" />
        <input
          placeholder="Search markets…"
          className="w-full bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
        />
        <kbd className="rounded border border-white/10 px-1 text-[9px] text-slate-500">
          /
        </kbd>
      </div>

      <button className="rounded-md border border-white/5 bg-white/[0.02] p-1.5 text-slate-400 hover:bg-white/[0.05]">
        <Bell className="h-3.5 w-3.5" />
      </button>

      {!authed && (
        <>
          <button
            onClick={onSignIn}
            className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.05]"
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="rounded-md px-3 py-1.5 text-[11px] font-bold text-black"
            style={{ backgroundColor: COLORS.greenSolid }}
          >
            Sign up
          </button>
        </>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// InstrumentBar — BTC/USDT Perp + 24h vitals
// ---------------------------------------------------------------------------
const InstrumentBar = ({ price, change, high, low, volume, funding }) => {
  const positive = change >= 0;
  return (
    <div className="border-b border-white/5 bg-[#0b0e11]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        {/* Instrument */}
        <button className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1 hover:bg-white/[0.05]">
          <div
            className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: "#f7931a" }}
          >
            ₿
          </div>
          <div className="text-left">
            <div className="text-xs font-bold">
              BTC/USDT{" "}
              <span className="text-[9px] font-semibold text-slate-500">
                PERP
              </span>
            </div>
            <div className="text-[9px] text-slate-500">Perpetual · 125× Max</div>
          </div>
          <ChevronDown className="ml-1 h-3 w-3 text-slate-500" />
        </button>

        {/* Live price */}
        <div className="flex flex-col">
          <div
            className="text-lg font-bold tabular-nums leading-none"
            style={{ color: positive ? COLORS.greenSolid : COLORS.redSolid }}
          >
            {fmtNum(price)}
          </div>
          <div className="mt-0.5 text-[9px] text-slate-500">
            ≈ {fmtUSD(price)}
          </div>
        </div>

        {/* 24h change */}
        <Metric
          label="24h Change"
          value={
            <span
              style={{
                color: positive ? COLORS.greenSolid : COLORS.redSolid,
              }}
            >
              {positive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          }
        />

        <Metric
          label="24h High"
          value={<span style={{ color: COLORS.greenSolid }}>{fmtNum(high)}</span>}
        />
        <Metric
          label="24h Low"
          value={<span style={{ color: COLORS.redSolid }}>{fmtNum(low)}</span>}
        />
        <Metric
          label="24h Volume (BTC)"
          value={<span className="text-slate-200">{fmtNum(volume, 3)}</span>}
        />
        <Metric
          label="Funding / Countdown"
          value={
            <span className="text-emerald-300">
              +0.0089% <span className="text-slate-500">· 04:12:33</span>
            </span>
          }
        />
        <Metric
          label="Open Interest"
          value={<span className="text-slate-200">$4.28B</span>}
        />
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="flex flex-col">
    <div className="text-[9px] uppercase tracking-widest text-slate-500">
      {label}
    </div>
    <div className="text-xs font-semibold tabular-nums leading-tight">
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// CandleChart — SVG candlesticks with wicks, grid, latest-price line
// ---------------------------------------------------------------------------
const CandleChart = ({ candles, timeframe, onTimeframe }) => {
  const W = 900;
  const H = 340;
  const pad = { top: 12, right: 60, bottom: 22, left: 4 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const maxP = Math.max(...highs);
  const minP = Math.min(...lows);
  const range = maxP - minP || 1;

  const y = (p) => pad.top + ((maxP - p) / range) * innerH;
  const cw = innerW / candles.length;
  const bodyW = Math.max(2, cw * 0.65);

  // Y grid labels (6 tiers)
  const yLabels = [];
  for (let i = 0; i <= 5; i++) {
    const value = maxP - (range / 5) * i;
    yLabels.push({ value, y: pad.top + (i / 5) * innerH });
  }

  const last = candles[candles.length - 1];
  const positive = last.close >= last.open;

  return (
    <div
      className="flex h-full flex-col rounded-md border border-white/5 bg-[#0f1319]"
      style={{ backgroundColor: COLORS.card }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-white/5 px-2 py-1.5">
        {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframe(tf)}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
              timeframe === tf
                ? "bg-white/10 text-slate-100"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {tf}
          </button>
        ))}
        <div className="mx-2 h-4 w-px bg-white/5" />
        {["Indicators", "MA(7)", "MA(25)", "EMA(99)"].map((t, i) => (
          <button
            key={t}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              i === 0 ? "text-slate-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: COLORS.greenSolid }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Live
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <defs>
            <pattern
              id="cchart-grid"
              width="60"
              height={innerH / 5}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 60 0 L 0 0 0 ${innerH / 5}`}
                fill="none"
                stroke="rgba(255,255,255,0.03)"
              />
            </pattern>
          </defs>

          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="url(#cchart-grid)"
          />

          {/* Y grid + labels */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                y1={yl.y}
                x2={pad.left + innerW}
                y2={yl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 3"
              />
              <text
                x={pad.left + innerW + 6}
                y={yl.y + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {yl.value.toFixed(yl.value > 100 ? 0 : 2)}
              </text>
            </g>
          ))}

          {/* Candles */}
          {candles.map((c, i) => {
            const cx = pad.left + i * cw + cw / 2;
            const green = c.close >= c.open;
            const color = green ? COLORS.greenSolid : COLORS.redSolid;
            const bodyTop = y(Math.max(c.open, c.close));
            const bodyBot = y(Math.min(c.open, c.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);
            return (
              <g key={i}>
                <line
                  x1={cx}
                  y1={y(c.high)}
                  x2={cx}
                  y2={y(c.low)}
                  stroke={color}
                  strokeWidth="1"
                />
                <rect
                  x={cx - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  fill={color}
                  opacity="0.95"
                />
              </g>
            );
          })}

          {/* Last-price line + label */}
          <g>
            <line
              x1={pad.left}
              y1={y(last.close)}
              x2={pad.left + innerW}
              y2={y(last.close)}
              stroke={positive ? COLORS.greenSolid : COLORS.redSolid}
              strokeDasharray="4 4"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <rect
              x={pad.left + innerW + 2}
              y={y(last.close) - 8}
              width={54}
              height={16}
              fill={positive ? COLORS.greenSolid : COLORS.redSolid}
              rx="2"
            />
            <text
              x={pad.left + innerW + 29}
              y={y(last.close) + 3}
              textAnchor="middle"
              fill="#000"
              fontSize="10"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
            >
              {fmtNum(last.close)}
            </text>
          </g>
        </svg>
      </div>

      {/* Below-chart volume placeholder / OHLC readout */}
      <div className="grid grid-cols-4 gap-2 border-t border-white/5 px-2 py-1 text-[10px]">
        <ReadOut label="O" value={fmtNum(last.open)} />
        <ReadOut label="H" value={fmtNum(last.high)} tone="green" />
        <ReadOut label="L" value={fmtNum(last.low)} tone="red" />
        <ReadOut
          label="C"
          value={fmtNum(last.close)}
          tone={positive ? "green" : "red"}
        />
      </div>
    </div>
  );
};

const ReadOut = ({ label, value, tone }) => (
  <div className="flex items-center gap-1 tabular-nums">
    <span className="text-slate-500">{label}</span>
    <span
      className="font-semibold"
      style={{
        color:
          tone === "green"
            ? COLORS.greenSolid
            : tone === "red"
            ? COLORS.redSolid
            : "#e2e8f0",
      }}
    >
      {value}
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// OrderBook — asks (top, red) · glowing mark price · bids (bottom, green)
// ---------------------------------------------------------------------------
const OrderBook = ({ mid }) => {
  const [book, setBook] = useState(() => seedBook(mid));

  useEffect(() => {
    const id = setInterval(() => setBook(seedBook(mid)), 1400);
    return () => clearInterval(id);
  }, [mid]);

  const maxSize = Math.max(
    ...book.bids.map((r) => r.size),
    ...book.asks.map((r) => r.size)
  );

  const Row = ({ side, r }) => {
    const pct = (r.size / maxSize) * 100;
    const positive = side === "bid";
    const color = positive ? COLORS.greenSolid : COLORS.redSolid;
    const bg = positive ? COLORS.greenSoft : COLORS.redSoft;
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="relative grid grid-cols-3 items-center gap-2 px-2 py-[3px] text-[10px] tabular-nums"
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0"
          style={{ width: `${pct}%`, backgroundColor: bg }}
        />
        <span
          className="relative font-semibold"
          style={{ color }}
        >
          {r.price.toFixed(2)}
        </span>
        <span className="relative text-right text-slate-300">
          {r.size.toFixed(3)}
        </span>
        <span className="relative text-right text-slate-500">
          {(r.price * r.size).toFixed(0)}
        </span>
      </motion.div>
    );
  };

  return (
    <div
      className="flex h-full flex-col rounded-md border border-white/5"
      style={{ backgroundColor: COLORS.card }}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Layers className="h-3 w-3 text-slate-400" /> Order Book
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded border border-white/5 bg-white/[0.02] px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 hover:bg-white/[0.05]">
            0.01
          </button>
          <button className="rounded border border-white/5 bg-white/[0.02] px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 hover:bg-white/[0.05]">
            0.1
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        <div>Price (USDT)</div>
        <div className="text-right">Size (BTC)</div>
        <div className="text-right">Total</div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col justify-end">
          <AnimatePresence initial={false}>
            {book.asks
              .slice()
              .reverse()
              .map((r, i) => (
                <Row key={`a-${i}`} side="ask" r={r} />
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Mark-price stripe */}
      <div
        className="border-y border-white/5 px-2 py-2"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,192,118,0.15) 0%, rgba(0,0,0,0) 50%, rgba(246,70,93,0.15) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-lg font-bold tabular-nums"
            style={{ color: COLORS.greenSolid }}
          >
            {mid.toFixed(2)}
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-widest text-slate-500">
              Index
            </div>
            <div className="text-[10px] font-semibold text-slate-200 tabular-nums">
              {(mid * 0.9998).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {book.bids.map((r, i) => (
              <Row key={`b-${i}`} side="bid" r={r} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BottomTabs — Positions / Trades / Orders / Wallet
// ---------------------------------------------------------------------------
const TAB_MOCK = {
  positions: [
    { pair: "BTC/USDT", side: "long", size: 0.05, entry: 67980, mark: 68240, pnl: 13.0, lev: 25 },
    { pair: "ETH/USDT", side: "short", size: 1.2, entry: 3560, mark: 3520, pnl: 48.0, lev: 15 },
    { pair: "SOL/USDT", side: "long", size: 12, entry: 165, mark: 168, pnl: 36.0, lev: 20 },
  ],
  trades: [
    { pair: "BTC/USDT", side: "buy", price: 68210, size: 0.02, ts: "10:22:14" },
    { pair: "ETH/USDT", side: "sell", price: 3524, size: 0.35, ts: "10:20:44" },
    { pair: "BTC/USDT", side: "buy", price: 68180, size: 0.015, ts: "10:19:12" },
    { pair: "SOL/USDT", side: "buy", price: 167.9, size: 5, ts: "10:18:03" },
  ],
  orders: [
    { pair: "BTC/USDT", type: "Limit", side: "buy", price: 67500, size: 0.1, filled: 0, status: "Open" },
    { pair: "ETH/USDT", type: "Stop", side: "sell", price: 3400, size: 0.5, filled: 0, status: "Open" },
    { pair: "BTC/USDT", type: "Limit", side: "sell", price: 69000, size: 0.05, filled: 0.02, status: "Partially Filled" },
  ],
  wallet: [
    { asset: "USDT", balance: 5000, avail: 4832.15, usd: 5000 },
    { asset: "BTC", balance: 0.0125, avail: 0.0125, usd: 853 },
    { asset: "ETH", balance: 0.42, avail: 0.42, usd: 1478 },
    { asset: "SOL", balance: 3.75, avail: 3.75, usd: 630 },
  ],
};

const BottomTabs = () => {
  const [tab, setTab] = useState("positions");
  const tabs = [
    { key: "positions", label: "Open Positions (3)", icon: Activity },
    { key: "trades", label: "Trade History", icon: History },
    { key: "orders", label: "Order History", icon: ListOrdered },
    { key: "wallet", label: "Asset Wallet", icon: Wallet },
  ];

  return (
    <div
      className="rounded-md border border-white/5"
      style={{ backgroundColor: COLORS.card }}
    >
      <div className="flex items-center gap-4 border-b border-white/5 px-3 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 py-1 text-[11px] font-semibold ${
              tab === t.key ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <t.icon className="h-3 w-3" /> {t.label}
            {tab === t.key && (
              <motion.span
                layoutId="bottom-tab-underline"
                className="absolute -bottom-1.5 left-0 right-0 h-0.5"
                style={{ backgroundColor: COLORS.greenSolid }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "positions" && (
            <motion.table
              key="positions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-[10px] tabular-nums"
            >
              <thead className="text-[9px] uppercase tracking-widest text-slate-500">
                <tr>
                  <Th>Contract</Th>
                  <Th>Side</Th>
                  <Th>Size</Th>
                  <Th>Entry</Th>
                  <Th>Mark</Th>
                  <Th>Leverage</Th>
                  <Th className="text-right">PnL (USDT)</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.positions.map((p, i) => {
                  const positive = p.pnl >= 0;
                  return (
                    <tr
                      key={i}
                      className="border-t border-white/[0.03] hover:bg-white/[0.02]"
                    >
                      <Td className="font-semibold">{p.pair}</Td>
                      <Td>
                        <SideBadge side={p.side} />
                      </Td>
                      <Td>{p.size} BTC</Td>
                      <Td>{fmtNum(p.entry)}</Td>
                      <Td>{fmtNum(p.mark)}</Td>
                      <Td>{p.lev}×</Td>
                      <Td
                        className="text-right font-semibold"
                        style={{
                          color: positive ? COLORS.greenSolid : COLORS.redSolid,
                        }}
                      >
                        {positive ? "+" : ""}
                        {p.pnl.toFixed(2)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </motion.table>
          )}

          {tab === "trades" && (
            <motion.table
              key="trades"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-[10px] tabular-nums"
            >
              <thead className="text-[9px] uppercase tracking-widest text-slate-500">
                <tr>
                  <Th>Time</Th>
                  <Th>Contract</Th>
                  <Th>Side</Th>
                  <Th>Price</Th>
                  <Th className="text-right">Filled</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.trades.map((t, i) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <Td className="text-slate-400">{t.ts}</Td>
                    <Td className="font-semibold">{t.pair}</Td>
                    <Td>
                      <SideBadge side={t.side === "buy" ? "long" : "short"} />
                    </Td>
                    <Td>{fmtNum(t.price)}</Td>
                    <Td className="text-right">{t.size}</Td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          )}

          {tab === "orders" && (
            <motion.table
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-[10px] tabular-nums"
            >
              <thead className="text-[9px] uppercase tracking-widest text-slate-500">
                <tr>
                  <Th>Contract</Th>
                  <Th>Type</Th>
                  <Th>Side</Th>
                  <Th>Price</Th>
                  <Th>Size</Th>
                  <Th>Filled</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.orders.map((o, i) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <Td className="font-semibold">{o.pair}</Td>
                    <Td>{o.type}</Td>
                    <Td>
                      <SideBadge side={o.side === "buy" ? "long" : "short"} />
                    </Td>
                    <Td>{fmtNum(o.price)}</Td>
                    <Td>{o.size}</Td>
                    <Td>{o.filled}</Td>
                    <Td className="text-right text-slate-300">{o.status}</Td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          )}

          {tab === "wallet" && (
            <motion.table
              key="wallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-[10px] tabular-nums"
            >
              <thead className="text-[9px] uppercase tracking-widest text-slate-500">
                <tr>
                  <Th>Asset</Th>
                  <Th>Total Balance</Th>
                  <Th>Available</Th>
                  <Th className="text-right">≈ USD</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.wallet.map((w, i) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <Td className="font-semibold">{w.asset}</Td>
                    <Td>{w.balance}</Td>
                    <Td>{w.avail}</Td>
                    <Td className="text-right">{fmtUSD(w.usd)}</Td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Th = ({ children, className = "" }) => (
  <th
    className={`px-3 py-1.5 text-left font-semibold ${className}`}
  >
    {children}
  </th>
);

const Td = ({ children, className = "", style }) => (
  <td className={`px-3 py-1.5 ${className}`} style={style}>
    {children}
  </td>
);

const SideBadge = ({ side }) => {
  const positive = side === "long" || side === "buy";
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
      style={{
        color: positive ? COLORS.greenSolid : COLORS.redSolid,
        backgroundColor: positive ? COLORS.greenSoft : COLORS.redSoft,
      }}
    >
      {positive ? (
        <ArrowUpRight className="h-2 w-2" />
      ) : (
        <ArrowDownRight className="h-2 w-2" />
      )}
      {side}
    </span>
  );
};

// ---------------------------------------------------------------------------
// TradeExecution — full right panel body (Long/Short + leverage + size)
// ---------------------------------------------------------------------------
const TradeExecution = ({ price }) => {
  const [type, setType] = useState("market");
  const [side, setSide] = useState("long");
  const [leverage, setLeverage] = useState(25);
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState(price ? price.toFixed(2) : "");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");

  useEffect(() => {
    // Keep limit price roughly in sync with market until user edits
    setLimitPrice((prev) => (prev === "" ? "" : prev));
  }, [price]);

  const notional = (parseFloat(amount) || 0) * price;
  const cost = notional / (leverage || 1);
  const liq = side === "long" ? price * (1 - 1 / leverage) : price * (1 + 1 / leverage);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Cross / Isolated tabs */}
      <div className="grid grid-cols-2 rounded-md border border-white/5 bg-white/[0.02] text-[10px] font-semibold">
        <button className="rounded-md py-1.5 text-slate-200" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          Cross
        </button>
        <button className="py-1.5 text-slate-500 hover:text-slate-300">Isolated</button>
      </div>

      {/* Leverage */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> Leverage
          </span>
          <span className="font-bold text-slate-100 tabular-nums">
            {leverage}×
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={125}
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-emerald-400"
        />
        <div className="mt-1 flex justify-between text-[9px] text-slate-500">
          <span>1×</span>
          <span>25×</span>
          <span>50×</span>
          <span>75×</span>
          <span>100×</span>
          <span>125×</span>
        </div>
      </div>

      {/* Limit / Market */}
      <div className="grid grid-cols-3 gap-1 rounded-md border border-white/5 bg-white/[0.02] p-0.5 text-[10px] font-semibold">
        {["limit", "market", "trigger"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded py-1 uppercase tracking-wider ${
              type === t
                ? "bg-white/[0.06] text-slate-100"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Price + Amount */}
      <div className="space-y-2">
        {type !== "market" && (
          <InputRow
            label="Price"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            suffix="USDT"
          />
        )}
        <InputRow
          label={type === "market" ? "Market" : "Amount"}
          value={type === "market" ? price.toFixed(2) : amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="BTC"
          readOnly={type === "market"}
        />
      </div>

      {/* Percentage selectors */}
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => {
              // fake buying power = leverage * some USDT
              const bp = 5000 * leverage;
              const btc = ((bp * (p / 100)) / price).toFixed(4);
              setAmount(btc);
            }}
            className="rounded border border-white/5 bg-white/[0.02] py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
          >
            {p}%
          </button>
        ))}
      </div>

      {/* TP / SL */}
      <div className="grid grid-cols-2 gap-2">
        <InputRow
          label="TP"
          value={tp}
          onChange={(e) => setTp(e.target.value)}
          compact
        />
        <InputRow
          label="SL"
          value={sl}
          onChange={(e) => setSl(e.target.value)}
          compact
        />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-1 rounded-md border border-white/5 bg-white/[0.02] p-2 text-[10px]">
        <MetaCell label="Cost" value={fmtUSD(cost || 0)} />
        <MetaCell label="Notional" value={fmtUSD(notional || 0)} />
        <MetaCell label="Est. Liq" value={fmtUSD(liq)} tone="red" />
      </div>

      {/* Buy / Sell */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSide("long")}
          className="flex flex-col items-center rounded-md py-2.5 text-sm font-bold text-black shadow-lg"
          style={{
            backgroundColor: COLORS.greenSolid,
            boxShadow: "0 10px 24px -12px rgba(2,192,118,0.55)",
          }}
        >
          <span>Buy / Long</span>
          <span className="text-[10px] font-semibold opacity-80">
            {fmtNum(price)}
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSide("short")}
          className="flex flex-col items-center rounded-md py-2.5 text-sm font-bold text-white shadow-lg"
          style={{
            backgroundColor: COLORS.redSolid,
            boxShadow: "0 10px 24px -12px rgba(246,70,93,0.55)",
          }}
        >
          <span>Sell / Short</span>
          <span className="text-[10px] font-semibold opacity-80">
            {fmtNum(price)}
          </span>
        </motion.button>
      </div>
    </div>
  );
};

const InputRow = ({ label, value, onChange, suffix, readOnly, compact }) => (
  <div
    className={`flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2 ${
      compact ? "py-1" : "py-1.5"
    }`}
  >
    <span className="text-[10px] uppercase tracking-widest text-slate-500">
      {label}
    </span>
    <input
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder="0.00"
      className="w-full bg-transparent text-right text-[11px] font-semibold text-slate-100 outline-none placeholder:text-slate-600"
    />
    {suffix && (
      <span className="ml-1 text-[9px] uppercase tracking-widest text-slate-500">
        {suffix}
      </span>
    )}
  </div>
);

const MetaCell = ({ label, value, tone }) => (
  <div>
    <div className="text-[9px] uppercase tracking-widest text-slate-500">
      {label}
    </div>
    <div
      className="text-[11px] font-semibold tabular-nums"
      style={{
        color:
          tone === "red"
            ? COLORS.redSolid
            : tone === "green"
            ? COLORS.greenSolid
            : "#e2e8f0",
      }}
    >
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Compact input primitive (auth forms)
// ---------------------------------------------------------------------------
const CompactInput = ({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  error,
  rightSlot,
  autoComplete,
  accent = "emerald",
}) => {
  const [focused, setFocused] = useState(false);
  const focusColor =
    accent === "emerald"
      ? "rgba(2,192,118,0.75)"
      : "rgba(99, 102, 241, 0.75)";
  const focusRing =
    accent === "emerald"
      ? "0 0 0 3px rgba(2,192,118,0.16)"
      : "0 0 0 3px rgba(99, 102, 241, 0.16)";

  return (
    <div>
      <motion.div
        initial={false}
        animate={{
          borderColor: error
            ? "rgba(246, 70, 93, 0.6)"
            : focused
            ? focusColor
            : "rgba(255,255,255,0.06)",
          boxShadow: focused ? focusRing : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex items-center rounded-md border bg-white/[0.03] px-2.5 py-2"
      >
        {Icon && (
          <Icon
            className="mr-2 h-3.5 w-3.5 shrink-0"
            style={{
              color: error
                ? COLORS.redSolid
                : focused
                ? COLORS.greenSolid
                : "#64748b",
            }}
          />
        )}
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-widest text-slate-500">
            {label}
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete={autoComplete}
            className="w-full bg-transparent text-[12px] font-semibold text-slate-100 outline-none"
          />
        </div>
        {rightSlot && <div className="ml-1">{rightSlot}</div>}
      </motion.div>
      {error && (
        <div
          className="mt-1 flex items-center gap-1 pl-0.5 text-[10px]"
          style={{ color: COLORS.redSolid }}
        >
          <AlertTriangle className="h-2.5 w-2.5" /> {error}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SignInForm
// ---------------------------------------------------------------------------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,24}$/;

const SignInForm = ({ onSuccess, onSwitchToSignUp, onBack, notify }) => {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      if (!res?.token || !res?.user) throw { message: "Malformed response." };
      setToken(res.token);
      notify("success", `Welcome back, ${res.user.fullName?.split(" ")[0]}`);
      setTimeout(() => onSuccess(res.user), 400);
    } catch (err) {
      notify("error", err?.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <LogIn className="h-4 w-4" style={{ color: COLORS.greenSolid }} />
          Sign in
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
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />
      <CompactInput
        label="Password"
        icon={Lock}
        type={showPw ? "text" : "password"}
        autoComplete="current-password"
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        error={errors.password}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {showPw ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>
        }
      />

      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={!submitting ? { scale: 1.01 } : undefined}
        whileTap={!submitting ? { scale: 0.99 } : undefined}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-black disabled:opacity-70"
        style={{
          backgroundColor: COLORS.greenSolid,
          boxShadow: "0 10px 24px -12px rgba(2,192,118,0.55)",
        }}
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

      <div className="mt-auto text-center text-[10px] text-slate-500">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-bold text-emerald-300 hover:text-emerald-200"
        >
          Create account →
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// SignUpForm
// ---------------------------------------------------------------------------
const SignUpForm = ({ onSuccess, onSwitchToSignIn, onBack, notify }) => {
  const [values, setValues] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    inviteCode: "",
  });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (values.fullName.trim().length < 2) e.fullName = "Enter your full name.";
    if (!usernameRegex.test(values.username))
      e.username = "3-24 chars: letters, numbers, . _ -";
    if (!emailRegex.test(values.email)) e.email = "Enter a valid email.";
    if (values.password.length < 8) e.password = "Min 8 characters.";
    else if (!/[A-Z]/.test(values.password))
      e.password = "Add an uppercase letter.";
    else if (!/[a-z]/.test(values.password))
      e.password = "Add a lowercase letter.";
    else if (!/\d/.test(values.password)) e.password = "Add a number.";
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
      if (!res?.token || !res?.user) throw { message: "Malformed response." };
      setToken(res.token);
      notify(
        "success",
        `Welcome to Nexus, ${res.user.fullName?.split(" ")[0]}!`
      );
      setTimeout(() => onSuccess(res.user), 400);
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
    <form onSubmit={submit} className="flex h-full flex-col gap-2.5 overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="h-4 w-4" style={{ color: COLORS.greenSolid }} />
          Create Account
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
        label="Full name"
        icon={UserIcon}
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
        error={errors.fullName}
      />
      <CompactInput
        label="Username"
        icon={AtSign}
        autoComplete="username"
        value={values.username}
        onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
        error={errors.username}
      />
      <CompactInput
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />
      <CompactInput
        label="Password"
        icon={Lock}
        type={showPw ? "text" : "password"}
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        error={errors.password}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {showPw ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>
        }
      />
      <CompactInput
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
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-black disabled:opacity-70"
        style={{
          backgroundColor: COLORS.greenSolid,
          boxShadow: "0 10px 24px -12px rgba(2,192,118,0.55)",
        }}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating…
          </>
        ) : (
          <>
            Create account <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.button>

      <div className="text-center text-[10px] text-slate-500">
        Already registered?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-bold text-emerald-300 hover:text-emerald-200"
        >
          Sign in →
        </button>
      </div>
      <p className="text-center text-[9px] text-slate-600">
        By continuing you agree to the Nexus Terms.
      </p>
    </form>
  );
};

// ---------------------------------------------------------------------------
// AuthOverlay — blurred glass card sitting over the trade panel
// ---------------------------------------------------------------------------
const AuthOverlay = ({ onSignIn, onSignUp }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-10 flex items-center justify-center rounded-md p-4"
    style={{
      background:
        "linear-gradient(180deg, rgba(11,14,17,0.55) 0%, rgba(11,14,17,0.9) 100%)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
    }}
  >
    <div className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-5 text-center shadow-2xl">
      <div
        className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl"
        style={{
          backgroundColor: COLORS.greenSoft,
          boxShadow: "0 6px 20px -8px rgba(2,192,118,0.6)",
        }}
      >
        <ShieldCheck className="h-5 w-5" style={{ color: COLORS.greenSolid }} />
      </div>
      <h3 className="text-sm font-bold tracking-tight">
        Sign in or register an account
      </h3>
      <p className="mx-auto mt-1 max-w-[240px] text-[11px] text-slate-400">
        Create your Nexus account to interact with this platform and place
        real perpetual futures orders.
      </p>
      <div className="mt-4 grid gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSignIn}
          className="w-full rounded-md py-2 text-xs font-bold text-black"
          style={{
            backgroundColor: COLORS.greenSolid,
            boxShadow: "0 8px 20px -10px rgba(2,192,118,0.55)",
          }}
        >
          Sign in
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSignUp}
          className="w-full rounded-md border border-white/10 bg-white/[0.03] py-2 text-xs font-bold text-slate-100 hover:bg-white/[0.06]"
        >
          Register an account
        </motion.button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-widest text-slate-500">
        <BookOpen className="h-2.5 w-2.5" />
        Learn more about Nexus Pro
      </div>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-md border px-3 py-2 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor:
            kind === "success"
              ? "rgba(2,192,118,0.12)"
              : "rgba(246,70,93,0.12)",
          borderColor:
            kind === "success"
              ? "rgba(2,192,118,0.35)"
              : "rgba(246,70,93,0.35)",
          color: kind === "success" ? COLORS.greenSolid : COLORS.redSolid,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          {kind === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span>{message}</span>
          <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function MainPlatform({ onAuthSuccess }) {
  const [candles, setCandles] = useState(seedCandles);
  const [timeframe, setTimeframe] = useState("15m");
  const [mode, setMode] = useState("trade"); // "trade" | "signin" | "signup"
  const [toast, setToast] = useState({ kind: null, message: "" });

  const notify = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2600);
  };

  // Live candle updates
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        // 50% chance: extend the last candle; else create a new one.
        if (Math.random() > 0.5) {
          const arr = [...prev];
          const last = { ...arr[arr.length - 1] };
          const drift = (Math.random() - 0.5) * 0.006 * last.close;
          const newClose = Math.max(1, last.close + drift);
          last.close = newClose;
          last.high = Math.max(last.high, newClose);
          last.low = Math.min(last.low, newClose);
          arr[arr.length - 1] = last;
          return arr;
        } else {
          return [...prev.slice(1), nextCandle(prev)];
        }
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const price = last.close;
  const change = ((last.close - first.open) / first.open) * 100;
  const high24h = Math.max(...candles.map((c) => c.high));
  const low24h = Math.min(...candles.map((c) => c.low));
  const volume = useMemo(
    () => candles.reduce((s, c) => s + (c.high - c.low) * 3, 0),
    [candles]
  );

  return (
    <div
      className="min-h-screen w-full text-slate-100"
      style={{ backgroundColor: COLORS.bg }}
    >
      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <TopNav
        onSignIn={() => setMode("signin")}
        onSignUp={() => setMode("signup")}
      />
      <InstrumentBar
        price={price}
        change={change}
        high={high24h}
        low={low24h}
        volume={volume}
      />

      {/* Body grid — left 75%, right 25% */}
      <div className="flex gap-2 p-2 lg:flex-row flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:w-3/4">
          {/* Chart + Order Book */}
          <div className="grid gap-2 lg:grid-cols-3" style={{ minHeight: 380 }}>
            <div className="lg:col-span-2">
              <CandleChart
                candles={candles}
                timeframe={timeframe}
                onTimeframe={setTimeframe}
              />
            </div>
            <div>
              <OrderBook mid={price} />
            </div>
          </div>

          {/* Bottom data center */}
          <BottomTabs />
        </div>

        {/* Right 25% — Execution + Auth overlay morph */}
        <div className="lg:w-[340px] lg:shrink-0">
          <div
            className="relative overflow-hidden rounded-md border border-white/5 p-3"
            style={{
              backgroundColor: COLORS.card,
              minHeight: 620,
              perspective: 1200,
            }}
          >
            <AnimatePresence mode="wait">
              {mode === "trade" ? (
                <motion.div
                  key="trade"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="relative h-full min-h-[600px]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="pointer-events-none">
                    {/* Behind the overlay we still render the (fake) execution
                        panel so users see what's about to unlock. */}
                    <div className="pointer-events-auto">
                      <TradeExecution price={price} />
                    </div>
                  </div>
                  <AuthOverlay
                    onSignIn={() => setMode("signin")}
                    onSignUp={() => setMode("signup")}
                  />
                </motion.div>
              ) : mode === "signin" ? (
                <motion.div
                  key="signin"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="h-full min-h-[600px]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <SignInForm
                    notify={notify}
                    onSuccess={onAuthSuccess}
                    onSwitchToSignUp={() => setMode("signup")}
                    onBack={() => setMode("trade")}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="h-full min-h-[600px]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <SignUpForm
                    notify={notify}
                    onSuccess={onAuthSuccess}
                    onSwitchToSignIn={() => setMode("signin")}
                    onBack={() => setMode("trade")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer
        className="border-t border-white/5 py-2 text-center text-[9px] uppercase tracking-widest text-slate-600"
        style={{ backgroundColor: COLORS.bg }}
      >
        Nexus Pro · Institutional-grade perpetual futures · Live simulation
      </footer>
    </div>
  );
}
