/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/Dashboard.jsx
 * =============================================================================
 *  Mobile-first Seconds Trading hub.
 *    Tabs via sticky bottom nav: Home | Wallet | Trade | History
 *    Side drawer for profile / KYC / admin / sign out
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Bell,
  Search,
  Sparkles,
  RefreshCw,
  Coins,
  BarChart3,
  Activity,
  ShieldCheck,
  Copy,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Bot,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";

import LiveChatWidget from "./LiveChatWidget.jsx";
import KYCModule from "./KYCModule.jsx";
import AppShell from "./AppShell.jsx";
import HomeLanding from "./HomeLanding.jsx";
import SecondsTrading from "./SecondsTrading.jsx";
import CryptoWatchlist from "./CryptoWatchlist.jsx";
import MarketActivity from "./MarketActivity.jsx";
import TradeHistory from "./TradeHistory.jsx";
import ProfileSetup from "./ProfileSetup.jsx";
import { AuthAPI, WalletAPI, SecondsTradeAPI, clearToken } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Constants + mock market seed
// ---------------------------------------------------------------------------
const seedSpark = (base, drift = 0.02, len = 60) => {
  const out = [base];
  for (let i = 1; i < len; i++) {
    const step = (Math.random() - 0.5) * drift * base;
    out.push(Math.max(0.0001, out[i - 1] + step));
  }
  return out;
};

const MARKET_SEED = [
  { symbol: "BTC", name: "Bitcoin", price: 68240, change: 2.14 },
  { symbol: "ETH", name: "Ethereum", price: 3520, change: 1.28 },
  { symbol: "SOL", name: "Solana", price: 168, change: 4.62 },
  { symbol: "USDT", name: "Tether", price: 1.0, change: 0.01 },
  { symbol: "XRP", name: "XRP", price: 0.58, change: -0.87 },
  { symbol: "ADA", name: "Cardano", price: 0.42, change: 3.02 },
];

const fmtUSD = (n) =>
  Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number(n) < 1 ? 4 : 2,
  });
const fmt = (n, d = 6) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
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
            className="ml-2 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Sparkline (used in watchlist)
// ---------------------------------------------------------------------------
const Sparkline = ({ points, positive = true, width = 96, height = 32 }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke = positive ? "#34d399" : "#fb7185";
  const fill = positive ? "rgba(52,211,153,0.15)" : "rgba(251,113,133,0.15)";
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={fill} />
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
};

// ---------------------------------------------------------------------------
// PriceChart — main interactive live chart (BTC/ETH)
// ---------------------------------------------------------------------------
const PriceChart = ({ symbol, series, name }) => {
  const W = 900;
  const H = 320;
  const pad = { top: 20, right: 60, bottom: 24, left: 10 };
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

  // Y-axis labels (5 tiers)
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = max - (range / 4) * i;
    const y = pad.top + (i / 4) * (H - pad.top - pad.bottom);
    yLabels.push({ value, y });
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-[11px] font-bold text-emerald-300">
            {symbol}
          </div>
          <div>
            <div className="text-sm font-semibold">
              {name}/USDT
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Live spot · Simulation
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{fmtUSD(last)}</div>
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              positive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {positive ? "+" : ""}
            {change.toFixed(2)}%
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={positive ? "#34d399" : "#fb7185"}
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor={positive ? "#34d399" : "#fb7185"}
              stopOpacity="0"
            />
          </linearGradient>
          <filter id={`glow-${symbol}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y grid */}
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

        {/* Area */}
        <path d={area} fill={`url(#grad-${symbol})`} />

        {/* Line */}
        <path
          d={d}
          fill="none"
          stroke={positive ? "#34d399" : "#fb7185"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${symbol})`}
        />

        {/* Current price marker */}
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
              values="6;12;6"
              dur="1.6s"
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
    </div>
  );
};

// ---------------------------------------------------------------------------
// SpotTrade — connected to backend
// ---------------------------------------------------------------------------
const SpotTrade = ({ symbol, price, wallet, onExecuted, toast }) => {
  const [side, setSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const usdt = wallet?.USDT || 0;
  const assetBal = wallet?.[symbol] || 0;

  const usdValue = (parseFloat(amount) || 0) * price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await TradeAPI.execute({ side, symbol, amount: amt, price });
      onExecuted?.(res.user);
      setAmount("");
      // Server signals force-loss with override === "force_loss" so the
      // toast can turn red even though the request itself succeeded.
      const kind = res?.override === "force_loss" ? "error" : "success";
      toast(kind, res.message || "Trade filled.");
    } catch (err) {
      toast("error", err?.message || "Trade failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const fill = (pct) => {
    if (side === "buy") {
      setAmount(((usdt * pct) / price).toFixed(6));
    } else {
      setAmount((assetBal * pct).toFixed(6));
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Activity className="h-4 w-4 text-indigo-300" /> Spot Order
      </h3>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1">
        {["buy", "sell"].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`relative rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition ${
              side === s
                ? s === "buy"
                  ? "text-emerald-300"
                  : "text-rose-300"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {side === s && (
              <motion.span
                layoutId="spot-pill"
                className={`absolute inset-0 rounded-lg ${
                  s === "buy" ? "bg-emerald-500/15" : "bg-rose-500/15"
                }`}
              />
            )}
            <span className="relative">{s}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Amount ({symbol})</span>
            <span>
              Bal: {fmt(side === "buy" ? usdt : assetBal, 4)}{" "}
              {side === "buy" ? "USDT" : symbol}
            </span>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-lg font-semibold text-slate-100 outline-none placeholder:text-slate-600"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            ≈ {fmtUSD(usdValue)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => fill(p)}
              className="rounded-lg border border-white/5 bg-white/[0.02] py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
            >
              {p * 100}%
            </button>
          ))}
        </div>

        <motion.button
          type="submit"
          disabled={submitting || !parseFloat(amount)}
          whileHover={!submitting ? { scale: 1.01 } : undefined}
          whileTap={!submitting ? { scale: 0.99 } : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60 ${
            side === "buy"
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-emerald-500/25"
              : "bg-gradient-to-r from-rose-500 to-rose-400 shadow-rose-500/25"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Executing…
            </>
          ) : (
            <>
              {side === "buy" ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {side === "buy" ? "Buy" : "Sell"} {symbol}
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DepositPanel — dynamic bank / EasyPaisa / USDT rails from admin gateway
// ---------------------------------------------------------------------------
const GatewayField = ({ label, value, onCopy }) => {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
          {label}
        </div>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-1 text-emerald-200 hover:bg-emerald-500/15"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <code className="block break-all rounded-lg bg-black/30 px-2 py-1.5 font-mono text-[11px] text-emerald-100">
        {value}
      </code>
    </div>
  );
};

const DepositPanel = ({ toast }) => {
  const [symbol, setSymbol] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [gateway, setGateway] = useState(null);
  const [gwLoading, setGwLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGwLoading(true);
    GatewayAPI.current()
      .then((r) => {
        if (!cancelled) setGateway(r.settings || {});
      })
      .catch(() => {
        if (!cancelled) setGateway({});
      })
      .finally(() => {
        if (!cancelled) setGwLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = (value, label) => {
    try {
      navigator.clipboard?.writeText(value);
      toast("success", `${label} copied.`);
    } catch {
      /* ignore */
    }
  };

  const hasAnyRail =
    gateway &&
    (gateway.accountNumber ||
      gateway.easyPaisaNumber ||
      gateway.jazzCashNumber ||
      gateway.usdtTrc20Address ||
      gateway.usdtErc20Address);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !parseFloat(amount)) return;
    setSubmitting(true);
    try {
      const res = await WalletAPI.depositRequest({
        symbol,
        amount: parseFloat(amount),
        network: "MANUAL",
        txHash: txHash || null,
      });
      toast("success", res.message || "Deposit submitted.");
      setAmount("");
      setTxHash("");
    } catch (err) {
      toast("error", err?.message || "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <ArrowDownToLine className="h-4 w-4 text-emerald-300" /> Deposit Funds
      </h3>

      {gwLoading && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading platform payment details…
        </div>
      )}

      {!gwLoading && !hasAnyRail && (
        <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
          The admin hasn't configured any payment rails yet. Please use the
          chat below to request deposit instructions.
        </div>
      )}

      {!gwLoading && hasAnyRail && (
        <div className="mb-4 space-y-2">
          {(gateway.bankName ||
            gateway.accountTitle ||
            gateway.accountNumber ||
            gateway.iban) && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                <Send className="h-3 w-3" /> Bank Transfer
              </div>
              <div className="space-y-1 text-xs">
                {gateway.bankName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank</span>
                    <span className="font-semibold text-slate-100">
                      {gateway.bankName}
                    </span>
                  </div>
                )}
                {gateway.accountTitle && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Title</span>
                    <span className="font-semibold text-slate-100">
                      {gateway.accountTitle}
                    </span>
                  </div>
                )}
                {gateway.accountNumber && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Account #</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-emerald-200">
                        {gateway.accountNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copy(gateway.accountNumber, "Account number")
                        }
                        className="rounded p-1 text-emerald-300 hover:bg-white/5"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                {gateway.iban && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">IBAN</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-emerald-200">
                        {gateway.iban}
                      </code>
                      <button
                        type="button"
                        onClick={() => copy(gateway.iban, "IBAN")}
                        className="rounded p-1 text-emerald-300 hover:bg-white/5"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <GatewayField
              label="EasyPaisa"
              value={gateway.easyPaisaNumber}
              onCopy={copy}
            />
            <GatewayField
              label="JazzCash"
              value={gateway.jazzCashNumber}
              onCopy={copy}
            />
            <GatewayField
              label="USDT · TRC20"
              value={gateway.usdtTrc20Address}
              onCopy={copy}
            />
            <GatewayField
              label="USDT · ERC20"
              value={gateway.usdtErc20Address}
              onCopy={copy}
            />
          </div>

          {gateway.instructions && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-slate-300 whitespace-pre-wrap">
              {gateway.instructions}
            </div>
          )}
        </div>
      )}

      {/* Premium sub-text banner — nudges user to chat with admin */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-indigo-400/25 bg-gradient-to-r from-indigo-500/10 to-emerald-400/10 p-3 text-[11px] text-indigo-100">
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
        <span>
          After transferring funds, please use the live chat widget below to
          instantly notify the administrator with your transaction receipt.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Credit To
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {["USDT", "BTC", "ETH", "SOL"].map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Amount deposited
            </label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Reference / Tx Hash (optional)
          </label>
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Transfer reference or blockchain hash"
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm font-mono text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>

        <motion.button
          type="submit"
          disabled={submitting || !parseFloat(amount)}
          whileHover={!submitting ? { scale: 1.01 } : undefined}
          whileTap={!submitting ? { scale: 0.99 } : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Deposit Request
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// WithdrawPanel
// ---------------------------------------------------------------------------
const WithdrawPanel = ({ wallet, user, toast, onWalletUpdate }) => {
  const [symbol, setSymbol] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState(user?.trc20Address || "");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.trc20Address && network === "TRC20") {
      setAddress(user.trc20Address);
    }
  }, [user?.trc20Address, network]);

  const available = wallet?.[symbol] || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !parseFloat(amount) || !address.trim()) return;
    setSubmitting(true);
    try {
      const res = await WalletAPI.withdrawRequest({
        symbol,
        amount: parseFloat(amount),
        address: address.trim(),
        network,
      });
      toast("success", res.message || "Withdrawal Pending Approval.");
      if (res.wallet) onWalletUpdate?.(res.wallet);
      setAmount("");
    } catch (err) {
      toast("error", err?.message || "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <ArrowUpFromLine className="h-4 w-4 text-indigo-300" /> Withdrawal
      </h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Request any amount up to your available balance. Funds are held as
        Pending Approval until admin reviews.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Asset
          </label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {["USDT", "BTC", "ETH", "SOL"].map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Network
          </label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
          >
            {["TRC20", "ERC20", "BEP20"].map((n) => (
              <option key={n} value={n} className="bg-slate-900">
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Destination address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste destination wallet address"
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm font-mono text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <span>Amount</span>
            <span>
              Available: {fmt(available, 4)} {symbol}
            </span>
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
        <motion.button
          type="submit"
          disabled={submitting || !parseFloat(amount) || !address.trim()}
          whileHover={!submitting ? { scale: 1.01 } : undefined}
          whileTap={!submitting ? { scale: 0.99 } : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Withdrawal Request
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TransactionList — for Activity tab (from backend)
// ---------------------------------------------------------------------------
const TxStatus = ({ status, kind }) => {
  const map = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-400/25",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  };
  let label = status;
  if (status === "pending" && kind === "deposit") {
    label = "Pending Verification";
  } else if (status === "pending" && kind === "withdrawal") {
    label = "Pending Approval";
  } else if (status === "approved") {
    label = "Approved";
  } else if (status === "rejected") {
    label = "Declined";
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        map[status] || map.pending
      }`}
    >
      {label}
    </span>
  );
};

const TransactionsList = ({ transactions, loading, onRefresh }) => (
  <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm">
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-slate-400" /> All Transactions
      </h3>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1 text-[10px] text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        Refresh
      </button>
    </div>
    <ul className="divide-y divide-white/5">
      <AnimatePresence initial={false}>
        {transactions.map((t) => (
          <motion.li
            key={t._id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            layout
            className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm"
          >
            <div className="col-span-3 flex items-center gap-3">
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg ${
                  t.kind === "trade"
                    ? "bg-indigo-500/15 text-indigo-300"
                    : t.kind === "deposit"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {t.kind === "deposit" ? (
                  <ArrowDownToLine className="h-4 w-4" />
                ) : t.kind === "withdrawal" ? (
                  <ArrowUpFromLine className="h-4 w-4" />
                ) : t.side === "buy" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold capitalize">
                  {t.kind}
                  {t.side ? ` · ${t.side}` : ""}
                </div>
                <div className="text-[10px] text-slate-500">
                  {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="col-span-2 text-slate-300">{t.symbol}</div>
            <div className="col-span-2 tabular-nums text-slate-200">
              {fmt(t.amount, 6)}
            </div>
            <div className="col-span-2 text-xs text-slate-500">
              {t.network || "—"}
            </div>
            <div className="col-span-3 text-right">
              <TxStatus status={t.status} kind={t.kind} />
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
      {!loading && transactions.length === 0 && (
        <li className="px-5 py-10 text-center text-xs text-slate-500">
          No transactions yet.
        </li>
      )}
    </ul>
  </div>
);

// ---------------------------------------------------------------------------
// Main Dashboard — mobile-first Seconds Trading shell
// ---------------------------------------------------------------------------
export default function Dashboard({ user, onLogout, onOpenAdmin }) {
  const [tab, setTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [me, setMe] = useState(user);
  const [globalTradingEnabled, setGlobalTradingEnabled] = useState(true);
  const [liveEarnings, setLiveEarnings] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [toast, setToast] = useState({ kind: null, message: "" });
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [chatHint, setChatHint] = useState(null);

  const openDepositChat = () => {
    setChatHint("deposit");
    setChatOpenSignal((n) => n + 1);
    say("success", "Opening Live Chat to arrange your deposit…");
  };

  const say = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2600);
  };

  const wallet = useMemo(() => {
    const w = me?.wallet;
    if (!w) return {};
    if (w instanceof Map) return Object.fromEntries(w);
    return { ...w };
  }, [me]);

  const walletUsdt = Number(wallet.USDT || 0);
  const tradingSuspended =
    globalTradingEnabled === false || me?.tradingAllowed === false;

  const loadTx = async () => {
    setTxLoading(true);
    try {
      const res = await WalletAPI.transactions();
      setTransactions(res.transactions || []);
    } catch {
      /* ignore */
    } finally {
      setTxLoading(false);
    }
  };

  const loadLiveEarnings = async () => {
    try {
      const res = await SecondsTradeAPI.history();
      let total = 0;
      for (const t of res.trades || []) {
        const s = String(t.status || "").toLowerCase();
        if (s === "won" || s === "win") {
          total += Math.max(0, Number(t.payout || 0) - Number(t.stake || 0));
        }
      }
      setLiveEarnings(total);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === "history" || tab === "home") loadTx();
    if (tab === "home" || tab === "trading") loadLiveEarnings();
  }, [tab]);

  // Keep Trading Wallet / permissions in sync when admin changes access
  useEffect(() => {
    let cancelled = false;
    const refreshMe = async () => {
      try {
        const res = await AuthAPI.me();
        if (!cancelled && res?.user) {
          setMe((prev) => ({
            ...prev,
            ...res.user,
            wallet: res.user.wallet ?? prev?.wallet,
          }));
          if (typeof res.globalTradingEnabled === "boolean") {
            setGlobalTradingEnabled(res.globalTradingEnabled);
          }
        }
      } catch {
        /* ignore transient */
      }
    };
    refreshMe();
    loadLiveEarnings();
    const id = setInterval(refreshMe, 2500);
    const eId = setInterval(loadLiveEarnings, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(eId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AuthAPI.logout().catch(() => {});
    } finally {
      clearToken();
      onLogout?.();
    }
  };

  const handleUserUpdate = (u) => {
    if (!u) return;
    setMe((prev) => ({
      ...prev,
      ...u,
      wallet: u.wallet || prev?.wallet,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <AppShell
        user={me}
        tab={tab}
        onTabChange={setTab}
        drawerOpen={drawerOpen}
        onDrawerOpen={() => setDrawerOpen(true)}
        onDrawerClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
        onOpenAdmin={onOpenAdmin}
        onOpenKyc={() => setKycOpen(true)}
      >
        {/* Unverified restriction banner — clears instantly when KYC is approved */}
        {me?.kyc?.status !== "approved" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onClick={() => setKycOpen(true)}
            className="mb-4 flex w-full items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-3 text-left"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-amber-100">
                {me?.kyc?.status === "pending"
                  ? "Identity verification under review"
                  : "Unverified account — trading limits apply"}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-200/70">
                {me?.kyc?.status === "pending"
                  ? "An admin is reviewing your documents. This banner clears when you are Verified."
                  : "Complete Identity Verification to remove restrictions. Tap to verify."}
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {me?.kyc?.status === "pending" ? "Pending" : "Verify"}
            </span>
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          {tab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <HomeLanding
                user={me}
                walletUsdt={walletUsdt}
                liveEarnings={liveEarnings}
                onStartTrading={() => setTab("trading")}
              />
            </motion.div>
          )}

          {tab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-2xl space-y-4"
            >
              <ProfileSetup
                user={me}
                toast={say}
                onSaved={(u) => handleUserUpdate(u)}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {tab === "trading" && (
            <motion.div
              key="trading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="min-w-0 space-y-4">
                <SecondsTrading
                  walletUsdt={walletUsdt}
                  onWalletUpdate={handleUserUpdate}
                  onToast={say}
                  tradingSuspended={tradingSuspended}
                />
                <CryptoWatchlist
                  onSelectAsset={(symbol) => {
                    window.dispatchEvent(
                      new CustomEvent("nexus:select-asset", {
                        detail: { asset: symbol, assetType: "crypto" },
                      })
                    );
                  }}
                />
              </div>
              <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
                <MarketActivity sticky={false} />
              </div>
            </motion.div>
          )}

          {tab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-3xl space-y-4"
            >
              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
                  Trading Wallet
                </div>
                <div className="mt-1 text-3xl font-bold text-white">
                  <span
                    className={
                      walletUsdt < 0 ? "text-rose-400" : "text-white"
                    }
                  >
                    {walletUsdt < 0 ? "-" : ""}$
                    {Math.abs(walletUsdt).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>{" "}
                  <span className="text-base font-medium text-slate-400">
                    USDT
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  New accounts start at $0.00 · Deposit via Live Chat with
                  screenshot proof for admin approval
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2">
                {Object.entries(wallet).map(([sym, amt]) => (
                  <div
                    key={sym}
                    className="rounded-xl border border-white/10 bg-[#0d1424] p-3"
                  >
                    <div className="text-[10px] uppercase text-slate-500">
                      {sym}
                    </div>
                    <div className="mt-1 text-sm font-bold tabular-nums">
                      {fmt(amt, 6)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Deposit → Live Chat Support */}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
                  Deposit Menu
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  To add funds, open Live Chat and choose Deposit. Transfer to
                  the shown address, upload your screenshot, then wait for
                  admin approval to top up your Trading Wallet.
                </p>
                <button
                  type="button"
                  onClick={openDepositChat}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-emerald-950"
                >
                  <MessageCircle className="h-4 w-4" />
                  Deposit via Live Chat
                </button>
              </div>
              <WithdrawPanel
                wallet={wallet}
                user={me}
                toast={say}
                onWalletUpdate={(w) =>
                  setMe((prev) => ({ ...prev, wallet: w }))
                }
              />
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-4xl space-y-4"
            >
              <TradeHistory />
              <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">
                  Wallet ledger
                </h3>
                <TransactionsList
                  transactions={transactions}
                  loading={txLoading}
                  onRefresh={loadTx}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AppShell>

      <KYCModule
        user={me}
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        onUpdated={(u) => setMe(u)}
      />

      {/* Single floating Live Chat — Deposit CTA opens it */}
      {me?.role !== "admin" && (
        <LiveChatWidget
          user={me}
          contextHint={chatHint || (tab === "wallet" ? "deposit" : null)}
          openSignal={chatOpenSignal}
          onDepositSubmitted={() => {
            loadTx();
            say(
              "success",
              "Deposit Pending Verification — awaiting admin approval."
            );
          }}
        />
      )}
    </motion.div>
  );
}
