/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/Dashboard.jsx
 * =============================================================================
 *  Premium responsive user hub.
 *    • KPI strip always visible.
 *    • Tabs — Trading | Wallet | Activity.
 *    • Trading    : Live BTC/ETH SVG chart + Spot Buy/Sell + Watchlist.
 *    • Wallet     : Balances + Deposit request + Withdraw request.
 *    • Activity   : Full transaction history from the backend.
 *    • Trades hit backend /api/trade/execute and update local user wallet.
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

import {
  AuthAPI,
  TradeAPI,
  WalletAPI,
  GatewayAPI,
  clearToken,
} from "../lib/api.js";
import LiveChatWidget from "./LiveChatWidget.jsx";
import KYCModule from "./KYCModule.jsx";
import QuantBot from "./QuantBot.jsx";

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
const WithdrawPanel = ({ wallet, toast }) => {
  const [symbol, setSymbol] = useState("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      toast("success", res.message || "Withdrawal submitted.");
      setAmount("");
      setAddress("");
    } catch (err) {
      toast("error", err?.message || "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <ArrowUpFromLine className="h-4 w-4 text-indigo-300" /> Withdraw
      </h3>

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
            <span>Available: {fmt(available, 4)} {symbol}</span>
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
const TxStatus = ({ status }) => {
  const map = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-400/25",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        map[status] || map.pending
      }`}
    >
      {status}
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
              <TxStatus status={t.status} />
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
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard({ user, onLogout, onOpenAdmin }) {
  const [tab, setTab] = useState("trading");
  const [kycOpen, setKycOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("BTC");
  const [market, setMarket] = useState(() =>
    MARKET_SEED.map((m) => ({
      ...m,
      spark: seedSpark(m.price, m.symbol === "USDT" ? 0.002 : 0.03),
    }))
  );
  const [chartSeries, setChartSeries] = useState({
    BTC: seedSpark(68240, 0.02, 90),
    ETH: seedSpark(3520, 0.02, 90),
  });
  const [me, setMe] = useState(user);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [toast, setToast] = useState({ kind: null, message: "" });

  const say = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2400);
  };

  // Wallet as plain object (Mongoose Map serializes to obj on JSON)
  const wallet = useMemo(() => {
    const w = me?.wallet;
    if (!w) return {};
    if (w instanceof Map) return Object.fromEntries(w);
    return { ...w };
  }, [me]);

  // Live tick — watchlist + chart series
  useEffect(() => {
    const id = setInterval(() => {
      setMarket((prev) =>
        prev.map((c) => {
          const drift = c.symbol === "USDT" ? 0.0005 : 0.008;
          const next = Math.max(
            0.0001,
            c.price + (Math.random() - 0.5) * drift * c.price
          );
          const spark = [...c.spark.slice(1), next];
          const change = ((next - c.spark[0]) / c.spark[0]) * 100;
          return { ...c, price: next, spark, change };
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
        return { BTC: step(prev.BTC), ETH: step(prev.ETH) };
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Live price for the active chart symbol
  const activePrice =
    chartSeries[chartSymbol]?.[chartSeries[chartSymbol].length - 1] || 0;

  // Transactions loader
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

  useEffect(() => {
    if (tab === "activity") loadTx();
  }, [tab]);

  const totalUsd = useMemo(() => {
    return Object.entries(wallet).reduce((sum, [sym, amt]) => {
      const meta = market.find((m) => m.symbol === sym) || { price: sym === "USDT" ? 1 : 0 };
      return sum + Number(amt || 0) * meta.price;
    }, 0);
  }, [wallet, market]);

  const handleLogout = async () => {
    try {
      await AuthAPI.logout().catch(() => {});
    } finally {
      clearToken();
      onLogout?.();
    }
  };

  const nav = [
    { key: "trading", label: "Trading", icon: BarChart3 },
    { key: "wallet", label: "Wallet", icon: Wallet },
    { key: "bots", label: "AI Bots", icon: Bot },
    { key: "activity", label: "Activity", icon: History },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-screen w-full overflow-hidden bg-[#070915] text-slate-100"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-white/5 bg-gray-900/60 px-5 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Nexus</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Crypto Suite
              </div>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center px-8 md:flex">
            <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                placeholder="Search markets, transactions…"
                className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-lg border border-white/5 bg-white/[0.02] p-2 text-slate-300 hover:bg-white/[0.05] sm:block">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400 text-[11px] font-bold text-white">
                {me?.initials ||
                  me?.fullName
                    ?.split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")
                    .toUpperCase() ||
                  "N"}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold leading-tight">
                  {me?.fullName || "Nexus User"}
                </div>
                <div className="text-[10px] text-slate-500">
                  @{me?.username || "guest"}
                </div>
              </div>
            </div>
            {(() => {
              const status = me?.kyc?.status || "unverified";
              const kycStyle =
                status === "approved"
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                  : status === "pending"
                  ? "border-amber-400/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                  : status === "rejected"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                  : "border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]";
              const Icon = status === "approved" ? BadgeCheck : ShieldCheck;
              const label =
                status === "approved"
                  ? "Verified"
                  : status === "pending"
                  ? "Review"
                  : status === "rejected"
                  ? "Rejected"
                  : "Verify";
              return (
                <motion.button
                  onClick={() => setKycOpen(true)}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold ${kycStyle}`}
                  title="Identity verification"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </motion.button>
              );
            })()}
            {me?.role === "admin" && (
              <motion.button
                onClick={onOpenAdmin}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/15"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </motion.button>
            )}
            <motion.button
              onClick={handleLogout}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </motion.button>
          </div>
        </motion.header>

        {/* KPI STRIP */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gray-900/60 p-5 backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl" />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Wallet className="h-3 w-3" /> Portfolio
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {fmtUSD(totalUsd)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <TrendingUp className="h-3 w-3" /> Live valuation
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <BarChart3 className="h-3 w-3" /> BTC Price
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {fmtUSD(chartSeries.BTC[chartSeries.BTC.length - 1])}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <BarChart3 className="h-3 w-3" /> ETH Price
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {fmtUSD(chartSeries.ETH[chartSeries.ETH.length - 1])}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Activity className="h-3 w-3" /> Open Assets
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {Object.entries(wallet).filter(([s, a]) => s !== "USDT" && a > 0).length}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-6 mb-4 flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1 w-fit backdrop-blur-sm">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`relative rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                tab === n.key ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === n.key && (
                <motion.span
                  layoutId="dash-tab"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/25 to-emerald-400/15 ring-1 ring-white/5"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "trading" && (
            <motion.div
              key="trading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                {["BTC", "ETH"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setChartSymbol(s)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                      chartSymbol === s
                        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                        : "border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s}/USDT
                  </button>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <PriceChart
                    symbol={chartSymbol}
                    name={chartSymbol === "BTC" ? "Bitcoin" : "Ethereum"}
                    series={chartSeries[chartSymbol]}
                  />
                </div>
                <SpotTrade
                  symbol={chartSymbol}
                  price={activePrice}
                  wallet={wallet}
                  onExecuted={(u) => setMe(u)}
                  toast={say}
                />
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <Coins className="h-4 w-4 text-emerald-300" /> Watchlist
                </h2>
                <div className="divide-y divide-white/5">
                  {market.map((c) => {
                    const positive = c.change >= 0;
                    return (
                      <div
                        key={c.symbol}
                        className="grid grid-cols-12 items-center gap-3 py-3"
                      >
                        <div className="col-span-4 flex items-center gap-3">
                          <div
                            className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-bold ${
                              positive
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {c.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{c.name}</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">
                              {c.symbol}/USDT
                            </div>
                          </div>
                        </div>
                        <div className="col-span-4 flex justify-center">
                          <Sparkline points={c.spark} positive={positive} />
                        </div>
                        <div className="col-span-4 text-right">
                          <div className="text-sm font-semibold tabular-nums">
                            {fmtUSD(c.price)}
                          </div>
                          <div
                            className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                              positive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {positive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {positive ? "+" : ""}
                            {c.change.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <Wallet className="h-4 w-4 text-indigo-300" /> Balances
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(wallet).map(([sym, amt]) => {
                    const meta = market.find((m) => m.symbol === sym) || {
                      price: sym === "USDT" ? 1 : 0,
                    };
                    return (
                      <div
                        key={sym}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            {sym}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {fmtUSD(Number(amt) * meta.price)}
                          </div>
                        </div>
                        <div className="mt-2 text-lg font-bold tabular-nums">
                          {fmt(amt, 6)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <DepositPanel toast={say} />
                <WithdrawPanel wallet={wallet} toast={say} />
              </div>
            </motion.div>
          )}

          {tab === "bots" && (
            <motion.div
              key="bots"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <QuantBot
                user={me}
                onUserUpdate={(u) => setMe(u)}
                toast={say}
              />
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TransactionsList
                transactions={transactions}
                loading={txLoading}
                onRefresh={loadTx}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-600">
          Nexus Crypto Suite · Live Market Simulation
        </p>
      </div>

      {/* Floating live-chat widget — deposit-aware auto-prompt */}
      {me?.role !== "admin" && (
        <LiveChatWidget
          user={me}
          contextHint={tab === "wallet" ? "deposit" : null}
        />
      )}

      {/* KYC identity verification modal */}
      <KYCModule
        user={me}
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        onUpdated={(u) => setMe(u)}
      />
    </motion.div>
  );
}
