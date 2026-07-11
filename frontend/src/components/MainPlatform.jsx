/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/MainPlatform.jsx
 * =============================================================================
 *  Bitget-style pro trading masterpiece landing with:
 *    • Universal Dark / Light theme toggle (Sun/Moon spin) in the top nav
 *      AND duplicated inside the Sign In / Create Account panels so users
 *      can swap lighting while entering credentials.
 *    • Strict registration control — invite code is required and validated
 *      against /api/auth/register, with a beautiful in-form alert banner
 *      that surfaces the backend's 403 payload.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
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
  Sun,
  Moon,
  ShieldAlert,
} from "lucide-react";

import { AuthAPI, setToken } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Theme tokens — single source of truth for the dark / light palettes
// ---------------------------------------------------------------------------
const THEME_STORAGE_KEY = "nexus_theme";

const themeTokens = (theme) => {
  const dark = theme === "dark";
  return {
    theme,
    bg: dark ? "#0b0e11" : "#ffffff",
    bgAlt: dark ? "#0f1319" : "#f8fafc",
    card: dark ? "#12161c" : "#ffffff",
    cardAlt: dark ? "#0f1319" : "#f8fafc",
    border: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.10)",
    borderStrong: dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.16)",
    divider: dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.06)",
    text: dark ? "#e2e8f0" : "#0f172a",
    textStrong: dark ? "#f8fafc" : "#020617",
    textMuted: dark ? "#94a3b8" : "#475569",
    textFaint: dark ? "#64748b" : "#94a3b8",
    inputBg: dark ? "#1e2329" : "#ffffff",
    inputBorder: dark ? "#334155" : "#cbd5e1",
    hover: dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
    hoverStrong: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    green: "#02c076",
    greenSoft: dark ? "rgba(2,192,118,0.14)" : "rgba(2,192,118,0.12)",
    red: "#f6465d",
    redSoft: dark ? "rgba(246,70,93,0.14)" : "rgba(246,70,93,0.12)",
    amber: "#f59e0b",
    amberSoft: dark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.12)",
    indigo: "#6366f1",
    overlayGrad: dark
      ? "linear-gradient(180deg, rgba(11,14,17,0.55) 0%, rgba(11,14,17,0.92) 100%)"
      : "linear-gradient(180deg, rgba(248,250,252,0.55) 0%, rgba(248,250,252,0.92) 100%)",
    priceStripe: dark
      ? "linear-gradient(90deg, rgba(2,192,118,0.15) 0%, rgba(0,0,0,0) 50%, rgba(246,70,93,0.15) 100%)"
      : "linear-gradient(90deg, rgba(2,192,118,0.10) 0%, rgba(0,0,0,0) 50%, rgba(246,70,93,0.10) 100%)",
    ctaShadow: dark
      ? "0 10px 24px -12px rgba(2,192,118,0.55)"
      : "0 10px 24px -12px rgba(2,192,118,0.35)",
  };
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
const fmtUSD = (n, d = 2) =>
  Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  });
const fmtNum = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Candlestick seed & live tick
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
    arr.push({
      open,
      close,
      high,
      low,
      ts: Date.now() - (CANDLE_COUNT - i) * 60_000,
    });
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
// Order book seed
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
// ThemeToggle — Sun/Moon with rotate transition
// ---------------------------------------------------------------------------
const ThemeToggle = ({ theme, onToggle, t, compact = false }) => (
  <motion.button
    onClick={onToggle}
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.05 }}
    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    className="relative overflow-hidden rounded-md border transition"
    style={{
      backgroundColor: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)",
      borderColor: t.border,
      padding: compact ? 4 : 6,
    }}
    title={theme === "dark" ? "Light mode" : "Dark mode"}
  >
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={theme}
        initial={{ rotate: -180, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 180, opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {theme === "dark" ? (
          <Sun
            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
            style={{ color: t.amber }}
          />
        ) : (
          <Moon
            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
            style={{ color: t.indigo }}
          />
        )}
      </motion.span>
    </AnimatePresence>
  </motion.button>
);

// ---------------------------------------------------------------------------
// TopNav — brand + search + session CTAs + theme toggle
// ---------------------------------------------------------------------------
const TopNav = ({ onSignIn, onSignUp, authed, t, theme, onToggleTheme }) => (
  <div
    className="relative z-30 border-b backdrop-blur"
    style={{
      backgroundColor: theme === "dark" ? "rgba(11,14,17,0.95)" : "rgba(255,255,255,0.95)",
      borderColor: t.border,
      color: t.text,
    }}
  >
    <div className="flex h-12 items-center gap-4 px-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-md shadow-indigo-500/25">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight">Nexus</span>
        <span
          className="hidden text-[10px] font-medium uppercase tracking-widest sm:inline"
          style={{ color: t.textFaint }}
        >
          Pro Trading
        </span>
      </div>

      <nav className="hidden items-center gap-4 md:flex">
        {["Derivatives", "Spot", "Copy Trade", "Earn", "P2P"].map((label, i) => (
          <button
            key={label}
            className="text-[11px] font-semibold transition"
            style={{ color: i === 0 ? t.green : t.textMuted }}
          >
            {label}
          </button>
        ))}
      </nav>

      <div
        className="mx-4 hidden flex-1 items-center gap-2 rounded-md border px-2 py-1 md:flex"
        style={{
          backgroundColor: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
          borderColor: t.border,
        }}
      >
        <Search className="h-3 w-3" style={{ color: t.textFaint }} />
        <input
          placeholder="Search markets…"
          className="w-full bg-transparent text-[11px] outline-none"
          style={{ color: t.text }}
        />
        <kbd
          className="rounded border px-1 text-[9px]"
          style={{ borderColor: t.border, color: t.textFaint }}
        >
          /
        </kbd>
      </div>

      <ThemeToggle theme={theme} onToggle={onToggleTheme} t={t} />

      <button
        className="rounded-md border p-1.5 transition"
        style={{
          backgroundColor: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)",
          borderColor: t.border,
          color: t.textMuted,
        }}
      >
        <Bell className="h-3.5 w-3.5" />
      </button>

      {!authed && (
        <>
          <button
            onClick={onSignIn}
            className="rounded-md border px-3 py-1.5 text-[11px] font-semibold transition"
            style={{
              backgroundColor: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)",
              borderColor: t.border,
              color: t.textStrong,
            }}
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="rounded-md px-3 py-1.5 text-[11px] font-bold"
            style={{ backgroundColor: t.green, color: "#0b0e11" }}
          >
            Sign up
          </button>
        </>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// InstrumentBar
// ---------------------------------------------------------------------------
const Metric = ({ label, value, t }) => (
  <div className="flex flex-col">
    <div
      className="text-[9px] uppercase tracking-widest"
      style={{ color: t.textFaint }}
    >
      {label}
    </div>
    <div
      className="text-xs font-semibold tabular-nums leading-tight"
      style={{ color: t.text }}
    >
      {value}
    </div>
  </div>
);

const InstrumentBar = ({ price, change, high, low, volume, t, theme }) => {
  const positive = change >= 0;
  return (
    <div
      className="border-b"
      style={{ backgroundColor: t.bg, borderColor: t.border, color: t.text }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <button
          className="flex items-center gap-2 rounded-md border px-2.5 py-1 transition"
          style={{
            backgroundColor: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
            borderColor: t.border,
          }}
        >
          <div
            className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: "#f7931a" }}
          >
            ₿
          </div>
          <div className="text-left">
            <div className="text-xs font-bold" style={{ color: t.textStrong }}>
              BTC/USDT{" "}
              <span
                className="text-[9px] font-semibold"
                style={{ color: t.textFaint }}
              >
                PERP
              </span>
            </div>
            <div className="text-[9px]" style={{ color: t.textFaint }}>
              Perpetual · 125× Max
            </div>
          </div>
          <ChevronDown
            className="ml-1 h-3 w-3"
            style={{ color: t.textFaint }}
          />
        </button>

        <div className="flex flex-col">
          <div
            className="text-lg font-bold tabular-nums leading-none"
            style={{ color: positive ? t.green : t.red }}
          >
            {fmtNum(price)}
          </div>
          <div className="mt-0.5 text-[9px]" style={{ color: t.textFaint }}>
            ≈ {fmtUSD(price)}
          </div>
        </div>

        <Metric
          t={t}
          label="24h Change"
          value={
            <span style={{ color: positive ? t.green : t.red }}>
              {positive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          }
        />
        <Metric
          t={t}
          label="24h High"
          value={<span style={{ color: t.green }}>{fmtNum(high)}</span>}
        />
        <Metric
          t={t}
          label="24h Low"
          value={<span style={{ color: t.red }}>{fmtNum(low)}</span>}
        />
        <Metric
          t={t}
          label="24h Volume (BTC)"
          value={<span style={{ color: t.text }}>{fmtNum(volume, 3)}</span>}
        />
        <Metric
          t={t}
          label="Funding / Countdown"
          value={
            <span style={{ color: t.green }}>
              +0.0089%{" "}
              <span style={{ color: t.textFaint }}>· 04:12:33</span>
            </span>
          }
        />
        <Metric
          t={t}
          label="Open Interest"
          value={<span style={{ color: t.text }}>$4.28B</span>}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CandleChart
// ---------------------------------------------------------------------------
const ReadOut = ({ label, value, tone, t }) => (
  <div className="flex items-center gap-1 tabular-nums">
    <span style={{ color: t.textFaint }}>{label}</span>
    <span
      className="font-semibold"
      style={{
        color:
          tone === "green"
            ? t.green
            : tone === "red"
            ? t.red
            : t.text,
      }}
    >
      {value}
    </span>
  </div>
);

const CandleChart = ({ candles, timeframe, onTimeframe, t }) => {
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

  const yLabels = [];
  for (let i = 0; i <= 5; i++) {
    const value = maxP - (range / 5) * i;
    yLabels.push({ value, y: pad.top + (i / 5) * innerH });
  }

  const last = candles[candles.length - 1];
  const positive = last.close >= last.open;
  const gridStroke = t.theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.05)";
  const dashStroke = t.theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.06)";
  const labelColor = t.textFaint;

  return (
    <div
      className="flex h-full flex-col rounded-md border"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      <div
        className="flex items-center gap-1 border-b px-2 py-1.5"
        style={{ borderColor: t.border }}
      >
        {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframe(tf)}
            className="rounded px-2 py-0.5 text-[10px] font-semibold transition"
            style={{
              backgroundColor: timeframe === tf ? t.hoverStrong : "transparent",
              color: timeframe === tf ? t.textStrong : t.textFaint,
            }}
          >
            {tf}
          </button>
        ))}
        <div className="mx-2 h-4 w-px" style={{ backgroundColor: t.border }} />
        {["Indicators", "MA(7)", "MA(25)", "EMA(99)"].map((label, i) => (
          <button
            key={label}
            className="rounded px-2 py-0.5 text-[10px] font-medium"
            style={{ color: i === 0 ? t.text : t.textFaint }}
          >
            {label}
          </button>
        ))}
        <div
          className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest"
          style={{ color: t.textFaint }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: t.green }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          Live
        </div>
      </div>

      <div className="relative flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <defs>
            <pattern
              id={`cchart-grid-${t.theme}`}
              width="60"
              height={innerH / 5}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M 60 0 L 0 0 0 ${innerH / 5}`}
                fill="none"
                stroke={gridStroke}
              />
            </pattern>
          </defs>
          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill={`url(#cchart-grid-${t.theme})`}
          />
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                y1={yl.y}
                x2={pad.left + innerW}
                y2={yl.y}
                stroke={dashStroke}
                strokeDasharray="2 3"
              />
              <text
                x={pad.left + innerW + 6}
                y={yl.y + 3}
                fill={labelColor}
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {yl.value.toFixed(yl.value > 100 ? 0 : 2)}
              </text>
            </g>
          ))}

          {candles.map((c, i) => {
            const cx = pad.left + i * cw + cw / 2;
            const green = c.close >= c.open;
            const color = green ? t.green : t.red;
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

          <g>
            <line
              x1={pad.left}
              y1={y(last.close)}
              x2={pad.left + innerW}
              y2={y(last.close)}
              stroke={positive ? t.green : t.red}
              strokeDasharray="4 4"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <rect
              x={pad.left + innerW + 2}
              y={y(last.close) - 8}
              width={54}
              height={16}
              fill={positive ? t.green : t.red}
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

      <div
        className="grid grid-cols-4 gap-2 border-t px-2 py-1 text-[10px]"
        style={{ borderColor: t.border }}
      >
        <ReadOut t={t} label="O" value={fmtNum(last.open)} />
        <ReadOut t={t} label="H" value={fmtNum(last.high)} tone="green" />
        <ReadOut t={t} label="L" value={fmtNum(last.low)} tone="red" />
        <ReadOut
          t={t}
          label="C"
          value={fmtNum(last.close)}
          tone={positive ? "green" : "red"}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// OrderBook
// ---------------------------------------------------------------------------
const OrderBook = ({ mid, t }) => {
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
    const color = positive ? t.green : t.red;
    const bg = positive ? t.greenSoft : t.redSoft;
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
        <span className="relative font-semibold" style={{ color }}>
          {r.price.toFixed(2)}
        </span>
        <span className="relative text-right" style={{ color: t.text }}>
          {r.size.toFixed(3)}
        </span>
        <span className="relative text-right" style={{ color: t.textFaint }}>
          {(r.price * r.size).toFixed(0)}
        </span>
      </motion.div>
    );
  };

  return (
    <div
      className="flex h-full flex-col rounded-md border"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      <div
        className="flex items-center justify-between border-b px-2 py-1.5"
        style={{ borderColor: t.border }}
      >
        <div
          className="flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: t.text }}
        >
          <Layers className="h-3 w-3" style={{ color: t.textMuted }} /> Order
          Book
        </div>
        <div className="flex items-center gap-1">
          {["0.01", "0.1"].map((g) => (
            <button
              key={g}
              className="rounded border px-1.5 py-0.5 text-[9px] font-semibold transition"
              style={{
                backgroundColor: t.theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)",
                borderColor: t.border,
                color: t.textMuted,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest"
        style={{ color: t.textFaint }}
      >
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

      <div
        className="border-y px-2 py-2"
        style={{ borderColor: t.border, background: t.priceStripe }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-lg font-bold tabular-nums"
            style={{ color: t.green }}
          >
            {mid.toFixed(2)}
          </div>
          <div className="text-right">
            <div
              className="text-[9px] uppercase tracking-widest"
              style={{ color: t.textFaint }}
            >
              Index
            </div>
            <div
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: t.text }}
            >
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
// BottomTabs
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

const Th = ({ children, t, className = "" }) => (
  <th
    className={`px-3 py-1.5 text-left font-semibold ${className}`}
    style={{ color: t.textFaint }}
  >
    {children}
  </th>
);

const Td = ({ children, className = "", style }) => (
  <td className={`px-3 py-1.5 ${className}`} style={style}>
    {children}
  </td>
);

const SideBadge = ({ side, t }) => {
  const positive = side === "long" || side === "buy";
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
      style={{
        color: positive ? t.green : t.red,
        backgroundColor: positive ? t.greenSoft : t.redSoft,
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

const BottomTabs = ({ t }) => {
  const [tab, setTab] = useState("positions");
  const tabs = [
    { key: "positions", label: "Open Positions (3)", icon: Activity },
    { key: "trades", label: "Trade History", icon: History },
    { key: "orders", label: "Order History", icon: ListOrdered },
    { key: "wallet", label: "Asset Wallet", icon: Wallet },
  ];

  const rowBorder = t.divider;

  return (
    <div
      className="rounded-md border"
      style={{ backgroundColor: t.card, borderColor: t.border }}
    >
      <div
        className="flex items-center gap-4 border-b px-3 py-1.5"
        style={{ borderColor: t.border }}
      >
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="relative flex items-center gap-1.5 py-1 text-[11px] font-semibold transition"
            style={{ color: tab === tb.key ? t.textStrong : t.textFaint }}
          >
            <tb.icon className="h-3 w-3" /> {tb.label}
            {tab === tb.key && (
              <motion.span
                layoutId="bottom-tab-underline"
                className="absolute -bottom-1.5 left-0 right-0 h-0.5"
                style={{ backgroundColor: t.green }}
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
              style={{ color: t.text }}
            >
              <thead
                className="text-[9px] uppercase tracking-widest"
                style={{ color: t.textFaint }}
              >
                <tr>
                  <Th t={t}>Contract</Th>
                  <Th t={t}>Side</Th>
                  <Th t={t}>Size</Th>
                  <Th t={t}>Entry</Th>
                  <Th t={t}>Mark</Th>
                  <Th t={t}>Leverage</Th>
                  <Th t={t} className="text-right">PnL (USDT)</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.positions.map((p, i) => {
                  const positive = p.pnl >= 0;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${rowBorder}` }}>
                      <Td className="font-semibold">{p.pair}</Td>
                      <Td>
                        <SideBadge side={p.side} t={t} />
                      </Td>
                      <Td>{p.size} BTC</Td>
                      <Td>{fmtNum(p.entry)}</Td>
                      <Td>{fmtNum(p.mark)}</Td>
                      <Td>{p.lev}×</Td>
                      <Td
                        className="text-right font-semibold"
                        style={{ color: positive ? t.green : t.red }}
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
              style={{ color: t.text }}
            >
              <thead
                className="text-[9px] uppercase tracking-widest"
                style={{ color: t.textFaint }}
              >
                <tr>
                  <Th t={t}>Time</Th>
                  <Th t={t}>Contract</Th>
                  <Th t={t}>Side</Th>
                  <Th t={t}>Price</Th>
                  <Th t={t} className="text-right">Filled</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.trades.map((tr, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${rowBorder}` }}>
                    <Td style={{ color: t.textMuted }}>{tr.ts}</Td>
                    <Td className="font-semibold">{tr.pair}</Td>
                    <Td>
                      <SideBadge side={tr.side === "buy" ? "long" : "short"} t={t} />
                    </Td>
                    <Td>{fmtNum(tr.price)}</Td>
                    <Td className="text-right">{tr.size}</Td>
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
              style={{ color: t.text }}
            >
              <thead
                className="text-[9px] uppercase tracking-widest"
                style={{ color: t.textFaint }}
              >
                <tr>
                  <Th t={t}>Contract</Th>
                  <Th t={t}>Type</Th>
                  <Th t={t}>Side</Th>
                  <Th t={t}>Price</Th>
                  <Th t={t}>Size</Th>
                  <Th t={t}>Filled</Th>
                  <Th t={t} className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.orders.map((o, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${rowBorder}` }}>
                    <Td className="font-semibold">{o.pair}</Td>
                    <Td>{o.type}</Td>
                    <Td>
                      <SideBadge side={o.side === "buy" ? "long" : "short"} t={t} />
                    </Td>
                    <Td>{fmtNum(o.price)}</Td>
                    <Td>{o.size}</Td>
                    <Td>{o.filled}</Td>
                    <Td
                      className="text-right"
                      style={{ color: t.textMuted }}
                    >
                      {o.status}
                    </Td>
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
              style={{ color: t.text }}
            >
              <thead
                className="text-[9px] uppercase tracking-widest"
                style={{ color: t.textFaint }}
              >
                <tr>
                  <Th t={t}>Asset</Th>
                  <Th t={t}>Total Balance</Th>
                  <Th t={t}>Available</Th>
                  <Th t={t} className="text-right">≈ USD</Th>
                </tr>
              </thead>
              <tbody>
                {TAB_MOCK.wallet.map((w, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${rowBorder}` }}>
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

// ---------------------------------------------------------------------------
// TradeExecution
// ---------------------------------------------------------------------------
const InputRow = ({ label, value, onChange, suffix, readOnly, compact, t }) => (
  <div
    className="flex items-center justify-between rounded-md border px-2"
    style={{
      backgroundColor: t.inputBg,
      borderColor: t.inputBorder,
      paddingTop: compact ? 4 : 6,
      paddingBottom: compact ? 4 : 6,
    }}
  >
    <span
      className="text-[10px] uppercase tracking-widest"
      style={{ color: t.textFaint }}
    >
      {label}
    </span>
    <input
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder="0.00"
      className="w-full bg-transparent text-right text-[11px] font-semibold outline-none"
      style={{ color: t.text }}
    />
    {suffix && (
      <span
        className="ml-1 text-[9px] uppercase tracking-widest"
        style={{ color: t.textFaint }}
      >
        {suffix}
      </span>
    )}
  </div>
);

const MetaCell = ({ label, value, tone, t }) => (
  <div>
    <div
      className="text-[9px] uppercase tracking-widest"
      style={{ color: t.textFaint }}
    >
      {label}
    </div>
    <div
      className="text-[11px] font-semibold tabular-nums"
      style={{
        color:
          tone === "red"
            ? t.red
            : tone === "green"
            ? t.green
            : t.text,
      }}
    >
      {value}
    </div>
  </div>
);

const TradeExecution = ({ price, t }) => {
  const [type, setType] = useState("market");
  const [side, setSide] = useState("long");
  const [leverage, setLeverage] = useState(25);
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState(price ? price.toFixed(2) : "");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");

  const notional = (parseFloat(amount) || 0) * price;
  const cost = notional / (leverage || 1);
  const liq =
    side === "long"
      ? price * (1 - 1 / leverage)
      : price * (1 + 1 / leverage);

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        className="grid grid-cols-2 rounded-md border text-[10px] font-semibold"
        style={{
          backgroundColor: t.theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
          borderColor: t.border,
        }}
      >
        <button
          className="rounded-md py-1.5"
          style={{
            backgroundColor: t.hoverStrong,
            color: t.textStrong,
          }}
        >
          Cross
        </button>
        <button className="py-1.5" style={{ color: t.textFaint }}>
          Isolated
        </button>
      </div>

      <div>
        <div
          className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest"
          style={{ color: t.textFaint }}
        >
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> Leverage
          </span>
          <span className="font-bold tabular-nums" style={{ color: t.textStrong }}>
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
        <div
          className="mt-1 flex justify-between text-[9px]"
          style={{ color: t.textFaint }}
        >
          <span>1×</span>
          <span>25×</span>
          <span>50×</span>
          <span>75×</span>
          <span>100×</span>
          <span>125×</span>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-md border p-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: t.theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
          borderColor: t.border,
        }}
      >
        {["limit", "market", "trigger"].map((tp) => (
          <button
            key={tp}
            onClick={() => setType(tp)}
            className="rounded py-1 uppercase tracking-wider"
            style={{
              backgroundColor: type === tp ? t.hoverStrong : "transparent",
              color: type === tp ? t.textStrong : t.textFaint,
            }}
          >
            {tp}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {type !== "market" && (
          <InputRow
            t={t}
            label="Price"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            suffix="USDT"
          />
        )}
        <InputRow
          t={t}
          label={type === "market" ? "Market" : "Amount"}
          value={type === "market" ? price.toFixed(2) : amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="BTC"
          readOnly={type === "market"}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => {
              const bp = 5000 * leverage;
              const btc = ((bp * (p / 100)) / price).toFixed(4);
              setAmount(btc);
            }}
            className="rounded border py-1 text-[10px] font-semibold transition"
            style={{
              backgroundColor: t.theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
              borderColor: t.border,
              color: t.textMuted,
            }}
          >
            {p}%
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <InputRow t={t} label="TP" value={tp} onChange={(e) => setTp(e.target.value)} compact />
        <InputRow t={t} label="SL" value={sl} onChange={(e) => setSl(e.target.value)} compact />
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-md border p-2 text-[10px]"
        style={{
          backgroundColor: t.theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.03)",
          borderColor: t.border,
        }}
      >
        <MetaCell t={t} label="Cost" value={fmtUSD(cost || 0)} />
        <MetaCell t={t} label="Notional" value={fmtUSD(notional || 0)} />
        <MetaCell t={t} label="Est. Liq" value={fmtUSD(liq)} tone="red" />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSide("long")}
          className="flex flex-col items-center rounded-md py-2.5 text-sm font-bold"
          style={{
            backgroundColor: t.green,
            color: "#0b0e11",
            boxShadow: t.ctaShadow,
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
          className="flex flex-col items-center rounded-md py-2.5 text-sm font-bold text-white"
          style={{
            backgroundColor: t.red,
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

// ---------------------------------------------------------------------------
// Compact input (auth forms)
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
  required,
  t,
}) => {
  const [focused, setFocused] = useState(false);
  const focusColor =
    accent === "emerald"
      ? "rgba(2,192,118,0.75)"
      : accent === "amber"
      ? "rgba(245,158,11,0.75)"
      : "rgba(99, 102, 241, 0.75)";
  const focusRing =
    accent === "emerald"
      ? "0 0 0 3px rgba(2,192,118,0.16)"
      : accent === "amber"
      ? "0 0 0 3px rgba(245,158,11,0.20)"
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
            : accent === "amber"
            ? "rgba(245,158,11,0.35)"
            : t.inputBorder,
          boxShadow: focused ? focusRing : "0 0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex items-center rounded-md border px-2.5 py-2"
        style={{ backgroundColor: t.inputBg }}
      >
        {Icon && (
          <Icon
            className="mr-2 h-3.5 w-3.5 shrink-0"
            style={{
              color: error
                ? t.red
                : focused
                ? accent === "amber"
                  ? t.amber
                  : t.green
                : t.textFaint,
            }}
          />
        )}
        <div className="flex-1">
          <div
            className="text-[9px] uppercase tracking-widest"
            style={{ color: accent === "amber" ? t.amber : t.textFaint }}
          >
            {label}
            {required && (
              <span className="ml-1 font-bold" style={{ color: t.red }}>
                *
              </span>
            )}
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete={autoComplete}
            className="w-full bg-transparent text-[12px] font-semibold outline-none"
            style={{ color: t.text }}
          />
        </div>
        {rightSlot && <div className="ml-1">{rightSlot}</div>}
      </motion.div>
      {error && (
        <div
          className="mt-1 flex items-center gap-1 pl-0.5 text-[10px]"
          style={{ color: t.red }}
        >
          <AlertTriangle className="h-2.5 w-2.5" /> {error}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AlertBanner — used to surface backend/403 messages nicely
// ---------------------------------------------------------------------------
const AlertBanner = ({ kind = "error", message, onClose, t }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex items-start gap-2 rounded-md border px-3 py-2 text-[11px]"
        style={{
          backgroundColor:
            kind === "error"
              ? t.redSoft
              : kind === "warning"
              ? t.amberSoft
              : t.greenSoft,
          borderColor:
            kind === "error"
              ? "rgba(246,70,93,0.35)"
              : kind === "warning"
              ? "rgba(245,158,11,0.35)"
              : "rgba(2,192,118,0.35)",
          color:
            kind === "error" ? t.red : kind === "warning" ? t.amber : t.green,
        }}
      >
        {kind === "warning" ? (
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span className="flex-1 font-semibold leading-snug">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Panel header — shared by SignIn / SignUp; includes the theme toggle
// so users can flip lighting from inside the auth panel too.
// ---------------------------------------------------------------------------
const PanelHeader = ({ icon: Icon, title, onBack, t, theme, onToggleTheme }) => (
  <div className="mb-2 flex items-center justify-between">
    <div
      className="flex items-center gap-2 text-sm font-bold"
      style={{ color: t.textStrong }}
    >
      <Icon className="h-4 w-4" style={{ color: t.green }} /> {title}
    </div>
    <div className="flex items-center gap-1.5">
      <ThemeToggle
        theme={theme}
        onToggle={onToggleTheme}
        t={t}
        compact
      />
      <button
        onClick={onBack}
        className="rounded p-1 transition"
        style={{ color: t.textMuted }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// SignInForm
// ---------------------------------------------------------------------------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,24}$/;

const SignInForm = ({
  onSuccess,
  onSwitchToSignUp,
  onBack,
  notify,
  t,
  theme,
  onToggleTheme,
}) => {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
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
      setBanner(err?.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-2.5">
      <PanelHeader
        icon={LogIn}
        title="Sign in"
        onBack={onBack}
        t={t}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <AlertBanner
        kind="error"
        message={banner}
        onClose={() => setBanner("")}
        t={t}
      />

      <CompactInput
        t={t}
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />
      <CompactInput
        t={t}
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
            className="rounded p-1"
            style={{ color: t.textMuted }}
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
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold disabled:opacity-70"
        style={{
          backgroundColor: t.green,
          color: "#0b0e11",
          boxShadow: t.ctaShadow,
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

      <div
        className="mt-auto text-center text-[10px]"
        style={{ color: t.textFaint }}
      >
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-bold"
          style={{ color: t.green }}
        >
          Create account →
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// SignUpForm — invite code is REQUIRED with alert styling
// ---------------------------------------------------------------------------
const SignUpForm = ({
  onSuccess,
  onSwitchToSignIn,
  onBack,
  notify,
  t,
  theme,
  onToggleTheme,
}) => {
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
  const [banner, setBanner] = useState("");

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
    if (!values.inviteCode.trim())
      e.inviteCode = "* Required to create account";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
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
        inviteCode: values.inviteCode.trim().toUpperCase(),
      });
      if (!res?.token || !res?.user) throw { message: "Malformed response." };
      setToken(res.token);
      notify(
        "success",
        `Welcome to Nexus, ${res.user.fullName?.split(" ")[0]}!`
      );
      setTimeout(() => onSuccess(res.user), 400);
    } catch (err) {
      const msg =
        err?.message ||
        (Array.isArray(err?.details) && err.details[0]?.message) ||
        "Registration failed.";
      setBanner(msg);
      // Highlight invite-code field on 403 denials
      if (
        typeof msg === "string" &&
        msg.toLowerCase().includes("invitation code")
      ) {
        setErrors((prev) => ({
          ...prev,
          inviteCode: "* Required to create account",
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex h-full flex-col gap-2.5 overflow-y-auto pr-1"
    >
      <PanelHeader
        icon={UserPlus}
        title="Create Account"
        onBack={onBack}
        t={t}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <AlertBanner
        kind={banner?.toLowerCase().includes("invitation") ? "warning" : "error"}
        message={banner}
        onClose={() => setBanner("")}
        t={t}
      />

      <CompactInput
        t={t}
        label="Full name"
        icon={UserIcon}
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
        error={errors.fullName}
      />
      <CompactInput
        t={t}
        label="Username"
        icon={AtSign}
        autoComplete="username"
        value={values.username}
        onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
        error={errors.username}
      />
      <CompactInput
        t={t}
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={errors.email}
      />
      <CompactInput
        t={t}
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
            className="rounded p-1"
            style={{ color: t.textMuted }}
          >
            {showPw ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>
        }
      />

      {/* Invite code — required, amber alert accent */}
      <div>
        <CompactInput
          t={t}
          label="Invite Code"
          icon={Ticket}
          required
          accent="amber"
          value={values.inviteCode}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              inviteCode: e.target.value.toUpperCase(),
            }))
          }
          error={errors.inviteCode}
        />
        <div
          className="mt-1 flex items-center gap-1 pl-0.5 text-[10px] font-semibold"
          style={{ color: t.amber }}
        >
          <ShieldAlert className="h-2.5 w-2.5" />
          <span>* Required to create account — provided by an administrator</span>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={submitting}
        whileHover={!submitting ? { scale: 1.01 } : undefined}
        whileTap={!submitting ? { scale: 0.99 } : undefined}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold disabled:opacity-70"
        style={{
          backgroundColor: t.green,
          color: "#0b0e11",
          boxShadow: t.ctaShadow,
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

      <div
        className="text-center text-[10px]"
        style={{ color: t.textFaint }}
      >
        Already registered?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="font-bold"
          style={{ color: t.green }}
        >
          Sign in →
        </button>
      </div>
      <p className="text-center text-[9px]" style={{ color: t.textFaint }}>
        By continuing you agree to the Nexus Terms.
      </p>
    </form>
  );
};

// ---------------------------------------------------------------------------
// AuthOverlay — blurred glass over the trade panel
// ---------------------------------------------------------------------------
const AuthOverlay = ({
  onSignIn,
  onSignUp,
  t,
  theme,
  onToggleTheme,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-10 flex items-center justify-center rounded-md p-4"
    style={{
      background: t.overlayGrad,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
    }}
  >
    <div className="absolute right-3 top-3 z-20">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} t={t} compact />
    </div>

    <div
      className="w-full rounded-lg border p-5 text-center shadow-2xl"
      style={{
        backgroundColor: t.card,
        borderColor: t.borderStrong,
        color: t.text,
      }}
    >
      <div
        className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl"
        style={{
          backgroundColor: t.greenSoft,
          boxShadow: "0 6px 20px -8px rgba(2,192,118,0.6)",
        }}
      >
        <ShieldCheck className="h-5 w-5" style={{ color: t.green }} />
      </div>
      <h3
        className="text-sm font-bold tracking-tight"
        style={{ color: t.textStrong }}
      >
        Sign in or register an account
      </h3>
      <p
        className="mx-auto mt-1 max-w-[240px] text-[11px]"
        style={{ color: t.textMuted }}
      >
        Create your Nexus account to interact with this platform and place real
        perpetual futures orders.
      </p>
      <div className="mt-4 grid gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSignIn}
          className="w-full rounded-md py-2 text-xs font-bold"
          style={{
            backgroundColor: t.green,
            color: "#0b0e11",
            boxShadow: t.ctaShadow,
          }}
        >
          Sign in
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSignUp}
          className="w-full rounded-md border py-2 text-xs font-bold"
          style={{
            backgroundColor: t.hover,
            borderColor: t.borderStrong,
            color: t.textStrong,
          }}
        >
          Register an account
        </motion.button>
      </div>
      <div
        className="mt-4 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-widest"
        style={{ color: t.textFaint }}
      >
        <BookOpen className="h-2.5 w-2.5" />
        Learn more about Nexus Pro
      </div>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose, t }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-md border px-3 py-2 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: kind === "success" ? t.greenSoft : t.redSoft,
          borderColor:
            kind === "success"
              ? "rgba(2,192,118,0.35)"
              : "rgba(246,70,93,0.35)",
          color: kind === "success" ? t.green : t.red,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          {kind === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-1 opacity-70 hover:opacity-100"
          >
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
  // Theme — persisted per browser
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* ignore */
    }
    return "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const t = useMemo(() => themeTokens(theme), [theme]);
  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const [candles, setCandles] = useState(seedCandles);
  const [timeframe, setTimeframe] = useState("15m");
  const [mode, setMode] = useState("trade"); // trade | signin | signup
  const [toast, setToast] = useState({ kind: null, message: "" });

  const notify = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2600);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
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
      className="min-h-screen w-full transition-colors duration-300"
      style={{ backgroundColor: t.bg, color: t.text }}
      data-theme={theme}
    >
      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
        t={t}
      />

      <TopNav
        onSignIn={() => setMode("signin")}
        onSignUp={() => setMode("signup")}
        t={t}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <InstrumentBar
        price={price}
        change={change}
        high={high24h}
        low={low24h}
        volume={volume}
        t={t}
        theme={theme}
      />

      <div className="flex flex-col gap-2 p-2 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:w-3/4">
          <div className="grid gap-2 lg:grid-cols-3" style={{ minHeight: 380 }}>
            <div className="lg:col-span-2">
              <CandleChart
                candles={candles}
                timeframe={timeframe}
                onTimeframe={setTimeframe}
                t={t}
              />
            </div>
            <div>
              <OrderBook mid={price} t={t} />
            </div>
          </div>
          <BottomTabs t={t} />
        </div>

        {/* Right 25% — Execution + Auth panel morph */}
        <div className="lg:w-[340px] lg:shrink-0">
          <div
            className="relative overflow-hidden rounded-md border p-3"
            style={{
              backgroundColor: t.card,
              borderColor: t.border,
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
                  <div className="pointer-events-auto">
                    <TradeExecution price={price} t={t} />
                  </div>
                  <AuthOverlay
                    onSignIn={() => setMode("signin")}
                    onSignUp={() => setMode("signup")}
                    t={t}
                    theme={theme}
                    onToggleTheme={toggleTheme}
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
                    t={t}
                    theme={theme}
                    onToggleTheme={toggleTheme}
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
                    t={t}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <footer
        className="border-t py-2 text-center text-[9px] uppercase tracking-widest"
        style={{
          backgroundColor: t.bg,
          borderColor: t.border,
          color: t.textFaint,
        }}
      >
        Nexus Pro · Institutional-grade perpetual futures · Live simulation
      </footer>
    </div>
  );
}
