/**
 * CXM-style platform pages — Market, Spot/Perpetual trade, C2C, Carbon ETF,
 * AI Compute, ICO, Copy Trade, Loan, NFT Market and the Assets hub.
 * Rendered by Dashboard.jsx inside <PlatformShell>.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  LineChart,
  Repeat,
  Users,
  Leaf,
  Cpu,
  Rocket,
  Copy,
  Landmark,
  Wallet,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  Upload,
  FileCheck,
  LayoutGrid,
  History,
  Lock,
  CreditCard,
  Gift,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Plus,
  ChevronLeft,
  Crown,
  BarChart3,
} from "lucide-react";
import { AuthAPI, PlatformAPI, WalletAPI, assetUrl } from "../lib/api.js";
import DepositSection from "./DepositSection.jsx";
import WithdrawSection, { NetworkLogo } from "./WithdrawSection.jsx";
import CopyTradeModule from "./CopyTradeModule.jsx";
import BrandLogo from "./BrandLogo.jsx";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
export function useCatalog(kind) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    PlatformAPI.catalog(kind)
      .then((r) => setItems(r.items || []))
      .catch((err) => setError(err?.message || "Failed to load."))
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const fmtUsd = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const fmtNum = (n, d = 6) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d });

function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] p-4 ${className}`}>
      {children}
    </div>
  );
}

const STATUS_TONE = {
  approved: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  active: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  completed: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  filled: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  open: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  rejected: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  cancelled: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  unverified: "border-slate-500/25 bg-white/5 text-slate-400",
};

function StatusBadge({ status }) {
  const s = String(status || "unverified").toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        STATUS_TONE[s] || STATUS_TONE.unverified
      }`}
    >
      {s}
    </span>
  );
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon className="h-8 w-8 text-slate-700" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function OrderModal({
  open,
  onClose,
  title,
  subtitle,
  fixedAmount = null,
  minAmount,
  maxAmount,
  submitLabel = "Confirm",
  onSubmit,
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handle = async () => {
    setSubmitting(true);
    try {
      await onSubmit(fixedAmount != null ? fixedAmount : parseFloat(amount));
    } catch {
      /* toast surfaced by caller */
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || (fixedAmount == null && !(parseFloat(amount) > 0));

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c1222] p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {subtitle && <p className="mb-4 text-xs text-slate-500">{subtitle}</p>}

        {fixedAmount == null ? (
          <div className="mb-4">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Amount
            </label>
            <input
              type="number"
              step="any"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/40"
            />
            {(minAmount || maxAmount) && (
              <div className="mt-1 text-[10px] text-slate-600">
                {minAmount ? `Min ${minAmount}` : ""}
                {minAmount && maxAmount ? " · " : ""}
                {maxAmount ? `Max ${maxAmount}` : ""}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-white">
            Price <span className="float-right font-bold text-cyan-300">{fmtUsd(fixedAmount)}</span>
          </div>
        )}

        <button type="button" disabled={disabled} onClick={handle} className={`${PRIMARY_BTN} w-full`}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. MarketPage
// ---------------------------------------------------------------------------
function pseudoChange(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 1000;
  return (h / 1000) * 8 - 4;
}

export function MarketPage({ onNavigate, onTradePair }) {
  const { items, loading } = useCatalog("market_pair");
  const [cat, setCat] = useState("Crypto");
  const [q, setQ] = useState("");
  const filtered = items.filter((it) => {
    if ((it.meta?.category || "Crypto") !== cat) return false;
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      String(it.title || "").toLowerCase().includes(s) ||
      String(it.meta?.base || "").toLowerCase().includes(s)
    );
  });

  const openTrade = (it) => {
    const category = it.meta?.category || cat || "Crypto";
    const base = String(it.meta?.base || it.title?.split("/")?.[0] || "BTC")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const payload = {
      asset: category === "Crypto" && base ? base : "BTC",
      assetType: "crypto",
      pair: it.title,
      category,
    };
    if (typeof onTradePair === "function") {
      onTradePair(payload);
      return;
    }
    onNavigate?.("delivery");
  };

  return (
    <div>
      <PageHeader
        icon={LineChart}
        title="Market"
        subtitle={`${items.length || "…"} pairs across Forex & Crypto`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {["Crypto", "Forex"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                cat === c ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pair…"
          className="min-w-[160px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/40"
        />
        <div className="text-[11px] text-slate-500">{filtered.length} shown</div>
      </div>
      <Card className="overflow-hidden !p-0">
        {loading ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <EmptyState icon={LineChart} label="No pairs listed yet." />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0d1424]">
              <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3 font-semibold">Pair</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Category</th>
                <th className="px-4 py-3 font-semibold">24h Change</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((it) => {
                const change = pseudoChange(it._id);
                const positive = change >= 0;
                return (
                  <tr key={it._id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{it.title}</div>
                      <div className="text-[11px] text-slate-500">{it.subtitle}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">
                      {it.meta?.category}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${
                        positive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openTrade(it)}
                        className="rounded-lg border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 to-teal-500/15 px-3.5 py-1.5 text-xs font-bold text-cyan-200 shadow-sm transition hover:from-cyan-500/30 hover:to-teal-500/25"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. SpotTradePage
// ---------------------------------------------------------------------------
const SPOT_COINS_FALLBACK = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "SOL"];

export function SpotTradePage({ onToast, onWalletUpdate, onOpenTradeDesk }) {
  const { items: pairs } = useCatalog("market_pair");
  const spotCoins = useMemo(() => {
    const fromCat = pairs
      .filter((p) => (p.meta?.category || "Crypto") === "Crypto")
      .map((p) => p.meta?.base)
      .filter(Boolean);
    const uniq = [...new Set(fromCat.map((s) => String(s).toUpperCase()))];
    return uniq.length ? uniq.slice(0, 120) : SPOT_COINS_FALLBACK;
  }, [pairs]);
  const [symbol, setSymbol] = useState("BTC");
  const [side, setSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [assets, setAssets] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [coinQ, setCoinQ] = useState("");

  useEffect(() => {
    if (spotCoins.length && !spotCoins.includes(symbol)) {
      setSymbol(spotCoins[0]);
    }
  }, [spotCoins, symbol]);

  const shownCoins = coinQ.trim()
    ? spotCoins.filter((c) => c.toLowerCase().includes(coinQ.trim().toLowerCase()))
    : spotCoins;

  const loadAssets = useCallback(() => {
    PlatformAPI.assets().then(setAssets).catch(() => {});
  }, []);
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const spotUsdt = Number(assets?.accounts?.spot || 0);
  const coinBal = Number(assets?.wallet?.[symbol] || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.order({ kind: "spot", side, symbol, amount: amt, meta: { side, symbol } });
      onToast?.("success", res.message || "Spot order filled.");
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setAmount("");
      loadAssets();
    } catch (err) {
      onToast?.("error", err?.message || "Order failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader icon={Repeat} title="Spot Trade" subtitle="Simplified market buy / sell" />
      {typeof onOpenTradeDesk === "function" && (
        <button
          type="button"
          onClick={() =>
            onOpenTradeDesk({ asset: symbol, assetType: "crypto", pair: `${symbol}/USDT` })
          }
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
        >
          <LineChart className="h-4 w-4" />
          Open {symbol} chart & Delivery trade
        </button>
      )}
      <Card>
        <input
          value={coinQ}
          onChange={(e) => setCoinQ(e.target.value)}
          placeholder={`Search ${spotCoins.length} coins…`}
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-200 outline-none"
        />
        <div className="mb-4 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {shownCoins.slice(0, 60).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSymbol(c)}
              className={`rounded-xl border py-2 text-xs font-bold transition ${
                symbol === c
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}/USDT
            </button>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1">
          {["buy", "sell"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
                side === s
                  ? s === "buy"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                  : "text-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
              <span>Amount ({symbol})</span>
              <span>Avail: {side === "buy" ? fmtUsd(spotUsdt) : `${fmtNum(coinBal, 6)} ${symbol}`}</span>
            </div>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-600"
            />
          </div>
          <button type="submit" disabled={submitting || !parseFloat(amount)} className={`${PRIMARY_BTN} w-full`}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : side === "buy" ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {side === "buy" ? "Buy" : "Sell"} {symbol}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. PerpetualTradePage
// ---------------------------------------------------------------------------
export function PerpetualTradePage({ onToast, onWalletUpdate, onOpenTradeDesk }) {
  const { items: pairs } = useCatalog("market_pair");
  const coinList = useMemo(() => {
    const fromCat = pairs
      .filter((p) => (p.meta?.category || "Crypto") === "Crypto")
      .map((p) => p.meta?.base)
      .filter(Boolean);
    const uniq = [...new Set(fromCat.map((s) => String(s).toUpperCase()))];
    return uniq.length ? uniq.slice(0, 120) : SPOT_COINS_FALLBACK;
  }, [pairs]);
  const [symbol, setSymbol] = useState("BTC");
  const [side, setSide] = useState("long");
  const [leverage, setLeverage] = useState(10);
  const [amount, setAmount] = useState("");
  const [assets, setAssets] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [coinQ, setCoinQ] = useState("");
  const shown = coinQ.trim()
    ? coinList.filter((c) => c.toLowerCase().includes(coinQ.trim().toLowerCase()))
    : coinList;

  const loadAssets = useCallback(() => {
    PlatformAPI.assets().then(setAssets).catch(() => {});
  }, []);
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const contractUsdt = Number(assets?.accounts?.contract || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.order({
        kind: "perpetual",
        side,
        symbol,
        amount: amt,
        meta: { side, symbol, leverage },
      });
      onToast?.("success", res.message || `${side === "long" ? "Long" : "Short"} position opened.`);
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setAmount("");
      loadAssets();
    } catch (err) {
      onToast?.("error", err?.message || "Order failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader icon={TrendingUp} title="Perpetual" subtitle="Market long / short with leverage" />
      {typeof onOpenTradeDesk === "function" && (
        <button
          type="button"
          onClick={() =>
            onOpenTradeDesk({ asset: symbol, assetType: "crypto", pair: `${symbol}/USDT` })
          }
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15"
        >
          <LineChart className="h-4 w-4" />
          Open {symbol} chart & Delivery trade
        </button>
      )}
      <Card>
        <input
          value={coinQ}
          onChange={(e) => setCoinQ(e.target.value)}
          placeholder={`Search ${coinList.length} coins…`}
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-200 outline-none"
        />
        <div className="mb-4 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {shown.slice(0, 60).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSymbol(c)}
              className={`rounded-xl border py-2 text-xs font-bold transition ${
                symbol === c
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}/USDT
            </button>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1">
          {["long", "short"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
                side === s
                  ? s === "long"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                  : "text-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mb-3">
          <label className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Leverage</span>
            <span className="font-bold text-cyan-300">{leverage}x</span>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
              <span>Margin (USDT)</span>
              <span>Avail: {fmtUsd(contractUsdt)}</span>
            </div>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-600"
            />
          </div>
          <button type="submit" disabled={submitting || !parseFloat(amount)} className={`${PRIMARY_BTN} w-full`}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : side === "long" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {side === "long" ? "Buy / Long" : "Sell / Short"} {symbol}
          </button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. C2CPage — Binance-style P2P (admin ads only)
// ---------------------------------------------------------------------------
export function C2CPage({ onToast, onWalletUpdate }) {
  const { items, loading } = useCatalog("c2c_ad");
  const [tab, setTab] = useState("buy"); // buy | sell | orders
  const [active, setActive] = useState(null);
  const [fiatAmt, setFiatAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [sellBank, setSellBank] = useState({
    userBankName: "",
    userAccountName: "",
    userAccountNumber: "",
  });

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await PlatformAPI.orders("c2c");
      setOrders(res.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "orders") loadOrders();
  }, [tab, loadOrders]);

  const ads = items.filter((ad) => {
    // merchant sell → user buy; merchant buy → user sell
    if (tab === "buy") return ad.meta?.side === "sell";
    if (tab === "sell") return ad.meta?.side === "buy";
    return true;
  });

  const rate = Number(active?.price || 1) || 1;
  const fiat = parseFloat(fiatAmt) || 0;
  const usdtQty = rate > 0 ? fiat / rate : 0;

  const placeOrder = async () => {
    if (!active || !fiat || fiat <= 0 || busy) return;
    const userSide = active.meta?.side === "sell" ? "buy" : "sell";
    if (userSide === "sell") {
      if (
        !sellBank.userBankName.trim() ||
        !sellBank.userAccountNumber.trim()
      ) {
        onToast?.("error", "Add your bank / wallet details to receive fiat.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await PlatformAPI.order({
        kind: "c2c",
        catalogId: active._id,
        amount: fiat,
        side: userSide,
        meta: {
          asset: active.meta?.asset,
          fiat: active.meta?.fiat,
          price: active.price,
          ...(userSide === "sell" ? sellBank : {}),
        },
      });
      onToast?.(
        "success",
        res.message || "C2C order placed."
      );
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setActive(null);
      setFiatAmt("");
      setTab("orders");
      loadOrders();
    } catch (err) {
      onToast?.("error", err?.message || "Order failed.");
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (orderId) => {
    try {
      const res = await PlatformAPI.updateOrder(orderId, {
        action: "mark_paid",
        paymentRef,
      });
      onToast?.("success", res.message || "Marked paid.");
      setPaymentRef("");
      loadOrders();
    } catch (err) {
      onToast?.("error", err?.message || "Failed to mark paid.");
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      onToast?.("success", `${label} copied.`);
    } catch {
      onToast?.("error", "Could not copy.");
    }
  };

  return (
    <div>
      <PageHeader
        icon={Users}
        title="C2C"
        subtitle="P2P desk — pay via bank / wallet shown on the ad, admin sets rates"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: "buy", label: "Buy USDT" },
          { id: "sell", label: "Sell USDT" },
          { id: "orders", label: "My orders" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              tab === t.id
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "buy" || tab === "sell") && (
        <>
          {loading ? (
            <LoadingBlock />
          ) : ads.length === 0 ? (
            <EmptyState
              icon={Users}
              label={
                tab === "buy"
                  ? "No buy ads yet — admin will post rates."
                  : "No sell ads yet — admin will post rates."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="hidden grid-cols-12 gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 sm:grid">
                <div className="col-span-3">Advertiser</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-3">Limit / Payment</div>
                <div className="col-span-4 text-right">Action</div>
              </div>
              <ul className="divide-y divide-white/5">
                {ads.map((ad) => (
                  <li
                    key={ad._id}
                    className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-12 sm:items-center"
                  >
                    <div className="sm:col-span-3">
                      <div className="font-semibold text-white">{ad.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {ad.meta?.payment || "Bank Transfer"}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-lg font-bold tabular-nums text-cyan-300">
                        {fmtNum(ad.price, 2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {ad.meta?.fiat} / {ad.meta?.asset || "USDT"}
                      </div>
                    </div>
                    <div className="sm:col-span-3 text-[11px] text-slate-400">
                      <div>
                        {ad.meta?.min} – {ad.meta?.max} {ad.meta?.fiat}
                      </div>
                      {ad.meta?.bankName && (
                        <div className="mt-0.5 text-slate-500">{ad.meta.bankName}</div>
                      )}
                    </div>
                    <div className="sm:col-span-4 sm:text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActive(ad);
                          setFiatAmt(String(ad.meta?.min || ""));
                        }}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          tab === "buy"
                            ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                            : "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                        }`}
                      >
                        {tab === "buy" ? "Buy" : "Sell"} {ad.meta?.asset || "USDT"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {ordersLoading ? (
            <LoadingBlock />
          ) : orders.length === 0 ? (
            <EmptyState icon={Users} label="No C2C orders yet." />
          ) : (
            orders.map((o) => {
              const m = o.meta || {};
              return (
                <Card key={o._id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">
                      {(o.side || "").toUpperCase()} · {m.usdtAmount || "—"} USDT
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                      {o.status}
                      {m.paidAt ? " · paid" : ""}
                    </span>
                  </div>
                  <div className="mb-3 text-[11px] text-slate-500">
                    {m.fiatAmount} {m.fiat} @ rate {m.rate} · {m.payment}
                  </div>

                  {o.side === "buy" &&
                    ["pending", "active"].includes(o.status) &&
                    !m.settledAt && (
                      <div className="mb-3 space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
                          Pay here
                        </div>
                        {[
                          ["Method", m.payment],
                          ["Bank", m.bankName],
                          ["Name", m.accountName],
                          ["Account", m.accountNumber],
                          ["IBAN", m.iban],
                        ]
                          .filter(([, v]) => v)
                          .map(([label, val]) => (
                            <div
                              key={label}
                              className="flex items-center justify-between gap-2 text-xs text-slate-300"
                            >
                              <span className="text-slate-500">{label}</span>
                              <button
                                type="button"
                                className="font-mono text-right text-white hover:text-cyan-200"
                                onClick={() => copyText(val, label)}
                              >
                                {val}
                              </button>
                            </div>
                          ))}
                        {m.paymentNote && (
                          <p className="text-[11px] text-slate-500">{m.paymentNote}</p>
                        )}
                        {o.status === "pending" && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <input
                              value={paymentRef}
                              onChange={(e) => setPaymentRef(e.target.value)}
                              placeholder="Payment reference / TID"
                              className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => markPaid(o._id)}
                              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200"
                            >
                              I paid
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  {o.side === "sell" && o.status === "pending" && (
                    <p className="text-[11px] text-amber-200/80">
                      USDT escrowed. Merchant will transfer fiat to{" "}
                      {m.userBankName || "your account"} · {m.userAccountNumber || "—"}.
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && setActive(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1222] p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    {active.meta?.side === "sell" ? "Buy" : "Sell"}{" "}
                    {active.meta?.asset || "USDT"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rate {active.price} {active.meta?.fiat} · Limit {active.meta?.min}-
                    {active.meta?.max}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="mb-3 block text-[11px]">
                <span className="mb-1 block font-semibold text-slate-400">
                  Fiat amount ({active.meta?.fiat})
                </span>
                <input
                  type="number"
                  value={fiatAmt}
                  onChange={(e) => setFiatAmt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
                />
              </label>
              <div className="mb-3 text-xs text-slate-400">
                You {active.meta?.side === "sell" ? "receive" : "send"} ≈{" "}
                <span className="font-semibold text-cyan-300">
                  {fmtNum(usdtQty, 4)} USDT
                </span>
              </div>

              {active.meta?.side === "buy" && (
                <div className="mb-3 space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Where should we send fiat after you sell USDT?
                  </p>
                  {[
                    ["userBankName", "Bank / wallet"],
                    ["userAccountName", "Account name"],
                    ["userAccountNumber", "Account / phone"],
                  ].map(([key, label]) => (
                    <input
                      key={key}
                      value={sellBank[key]}
                      onChange={(e) =>
                        setSellBank((s) => ({ ...s, [key]: e.target.value }))
                      }
                      placeholder={label}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  ))}
                </div>
              )}

              {active.meta?.side === "sell" && (
                <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-slate-400">
                  After placing, transfer fiat to the merchant details on the order,
                  then tap <span className="text-emerald-300">I paid</span>.
                </div>
              )}

              <button
                type="button"
                disabled={busy || !fiat}
                onClick={placeOrder}
                className={`${PRIMARY_BTN} w-full`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Place C2C order"
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CarbonEtfPage
// ---------------------------------------------------------------------------
export function CarbonEtfPage({ onToast, onWalletUpdate }) {
  const { items, loading } = useCatalog("carbon_etf");
  const [active, setActive] = useState(null);

  return (
    <div>
      <PageHeader icon={Leaf} title="Carbon Rights ETF" subtitle="Fixed-cycle dividend plans" />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={Leaf} label="No plans available." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it._id}>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">
                  {it.meta?.tier}
                </span>
                <span className="text-[11px] text-slate-500">{it.meta?.hashRate}</span>
              </div>
              <div className="mb-1 font-semibold text-white">{it.title}</div>
              <div className="mb-3 text-[11px] text-slate-500">{it.meta?.cycleDays}-day cycle</div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Daily dividend</div>
                  <div className="text-lg font-bold text-cyan-300">{it.meta?.dailyPct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Price</div>
                  <div className="text-lg font-bold text-white">{fmtUsd(it.price)}</div>
                </div>
              </div>
              <button type="button" onClick={() => setActive(it)} className={`${PRIMARY_BTN} w-full`}>
                Apply
              </button>
            </Card>
          ))}
        </div>
      )}

      <OrderModal
        key={active?._id || "etf-modal"}
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title}
        subtitle={`${active?.meta?.cycleDays}-day cycle · ${active?.meta?.dailyPct}% daily`}
        fixedAmount={active?.price}
        submitLabel="Confirm subscription"
        onSubmit={async () => {
          try {
            const res = await PlatformAPI.order({ kind: "carbon_etf", catalogId: active._id, amount: active.price });
            onToast?.("success", res.message || "Subscribed to plan.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setActive(null);
          } catch (err) {
            onToast?.("error", err?.message || "Subscription failed.");
            throw err;
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. AiComputePage
// ---------------------------------------------------------------------------
export function AiComputePage({ onToast, onWalletUpdate }) {
  const { items } = useCatalog("ai_compute");
  const plan = items[0];
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState("exchange");
  const [joinOpen, setJoinOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);

  const join = async (amount) => {
    if (!amount || amount <= 0) return;
    try {
      const res = await PlatformAPI.order({ kind: "ai_compute", catalogId: plan?._id, amount });
      onToast?.("success", res.message || "Joined WEB3 compute pool.");
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setJoined(true);
      setJoinOpen(false);
    } catch (err) {
      onToast?.("error", err?.message || "Join failed.");
      throw err;
    }
  };

  const convert = async (e) => {
    e.preventDefault();
    const amt = parseFloat(convertAmount);
    if (!amt || amt <= 0 || converting) return;
    setConverting(true);
    try {
      const res = await PlatformAPI.convert({ fromAsset: "ETH", toAsset: "USDT", amount: amt });
      onToast?.("success", res.message || "Converted.");
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setConvertAmount("");
    } catch (err) {
      onToast?.("error", err?.message || "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader icon={Cpu} title="AI Compute" subtitle={plan?.subtitle || "Web3 liquidity compute"} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Total ETH", value: "0.000000" },
          { label: "Today's earnings", value: "0.000000" },
          { label: "Total earnings", value: "0.000000" },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-white">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">
            {joined ? "Compute pool active" : plan?.title || "Join WEB3.0 Compute"}
          </div>
          <div className="text-[11px] text-slate-500">
            Min join {fmtUsd(plan?.meta?.minJoin || 50)} · {plan?.meta?.dailyYieldPct || 1.2}% daily yield
          </div>
        </div>
        <button type="button" onClick={() => setJoinOpen(true)} disabled={joined} className={PRIMARY_BTN}>
          {joined ? "Joined" : "Join WEB3"}
        </button>
      </Card>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.03] p-1">
        {["exchange", "withdraw", "earnings"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg py-2 text-xs font-bold capitalize transition ${
              tab === t ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "exchange" && (
        <Card>
          <form onSubmit={convert} className="space-y-3">
            <div className="text-xs text-slate-500">Convert ETH earnings to USDT</div>
            <input
              type="number"
              step="any"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              placeholder="0.00 ETH"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={converting || !parseFloat(convertAmount)}
              className={`${PRIMARY_BTN} w-full`}
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Exchange to USDT"}
            </button>
          </form>
        </Card>
      )}
      {tab === "withdraw" && (
        <Card>
          <p className="text-sm text-slate-400">
            Withdraw ETH earnings directly from the Assets hub once your compute cycle matures.
          </p>
        </Card>
      )}
      {tab === "earnings" && (
        <Card>
          <EmptyState icon={Cpu} label="No earnings recorded yet." />
        </Card>
      )}

      <OrderModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Join WEB3 Compute"
        subtitle={`Minimum ${fmtUsd(plan?.meta?.minJoin || 50)}`}
        minAmount={plan?.meta?.minJoin}
        submitLabel="Join now"
        onSubmit={join}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. IcoPage
// ---------------------------------------------------------------------------
export function IcoPage({ onToast, onWalletUpdate }) {
  const { items, loading } = useCatalog("ico");
  const [active, setActive] = useState(null);

  return (
    <div>
      <PageHeader icon={Rocket} title="ICO Subscription" subtitle="Token launch rounds" />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={Rocket} label="No active rounds." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const filled = Number(it.meta?.quotaFilled || 0);
            const total = Number(it.meta?.quotaTotal || 1);
            const pct = Math.min(100, (filled / total) * 100);
            return (
              <Card key={it._id}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-white">{it.title}</div>
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                    {it.meta?.statusLabel || "Open"}
                  </span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500">Issue price</div>
                    <div className="font-bold text-white">{fmtUsd(it.meta?.issuePrice || it.price)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Listing price</div>
                    <div className="font-bold text-white">{fmtUsd(it.meta?.listingPrice)}</div>
                  </div>
                </div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Quota filled</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <button type="button" onClick={() => setActive(it)} className={`${PRIMARY_BTN} w-full`}>
                  Subscribe
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <OrderModal
        key={active?._id || "ico-modal"}
        open={!!active}
        onClose={() => setActive(null)}
        title={`Subscribe ${active?.title || ""}`}
        subtitle="Enter USDT amount to subscribe"
        submitLabel="Subscribe"
        onSubmit={async (amt) => {
          if (!amt || amt <= 0) return;
          try {
            const res = await PlatformAPI.order({
              kind: "ico",
              catalogId: active._id,
              amount: amt,
              meta: { tokenAmount: amt / (active.meta?.issuePrice || 1) },
            });
            onToast?.("success", res.message || "Subscription submitted.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setActive(null);
          } catch (err) {
            onToast?.("error", err?.message || "Subscription failed.");
            throw err;
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. CopyTradePage
// ---------------------------------------------------------------------------
export function CopyTradePage({ onToast, onWalletUpdate }) {
  const { items, loading } = useCatalog("copy_trader");
  return (
    <CopyTradeModule
      items={items}
      loading={loading}
      PageHeader={PageHeader}
      Card={Card}
      LoadingBlock={LoadingBlock}
      EmptyState={EmptyState}
      OrderModal={OrderModal}
      PRIMARY_BTN={PRIMARY_BTN}
      onToast={onToast}
      onWalletUpdate={onWalletUpdate}
    />
  );
}

// ---------------------------------------------------------------------------
// 9. LoanPage
// ---------------------------------------------------------------------------
const ID_TYPES = [
  { value: "ID", label: "National ID Card" },
  { value: "Passport", label: "Passport" },
  { value: "DriversLicense", label: "Driver's License" },
];

const DOC_SLOTS = [
  { key: "idFront", label: "ID Front" },
  { key: "idBack", label: "ID Back" },
  { key: "selfie", label: "Selfie with ID" },
  { key: "addressProof", label: "Address Proof" },
  { key: "bankStatement", label: "Bank Statement" },
  { key: "incomeProof", label: "Income Proof" },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DocSlot({ label, value, onChange }) {
  const inputRef = useRef(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-3 text-center transition ${
        value ? "border-cyan-400/30 bg-cyan-500/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const dataUrl = await readFileAsDataUrl(file);
            onChange({ fileName: file.name, dataUrl });
          } catch {
            /* ignore */
          }
        }}
      />
      {value ? <FileCheck className="h-5 w-5 text-cyan-300" /> : <Upload className="h-5 w-5 text-slate-500" />}
      <span className="text-[10px] font-semibold text-slate-300">{label}</span>
      <span className="max-w-full truncate text-[9px] text-slate-600">{value?.fileName || "Tap to upload"}</span>
    </button>
  );
}

export function LoanPage({ onToast, user, onWalletUpdate, onOpenLiveChat }) {
  const { items } = useCatalog("loan_plan");
  const plan = items[0];
  const [status, setStatus] = useState(user?.borrowerKyc?.status || "unverified");
  const [form, setForm] = useState({
    firstName: user?.borrowerKyc?.firstName || "",
    lastName: user?.borrowerKyc?.lastName || "",
    gender: user?.borrowerKyc?.gender || "",
    dateOfBirth: user?.borrowerKyc?.dateOfBirth || "",
    country: user?.borrowerKyc?.country || "",
    phone: user?.borrowerKyc?.phone || "",
    idType: user?.borrowerKyc?.idType || "ID",
    idNumber: user?.borrowerKyc?.idNumber || "",
  });
  const [docs, setDocs] = useState(user?.borrowerKyc?.docs || {});
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(30);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submitKyc = async (e) => {
    e.preventDefault();
    if (submittingKyc) return;
    setSubmittingKyc(true);
    try {
      const res = await PlatformAPI.submitBorrowerKyc({ ...form, docs });
      onToast?.("success", res.message || "Borrower verification submitted.");
      setStatus(res.borrowerKyc?.status || "pending");
    } catch (err) {
      onToast?.("error", err?.message || "Submission failed.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  const dailyPct = Number(plan?.meta?.dailyInterestPct || 0.15);
  const amt = parseFloat(amount) || 0;
  const interest = amt * (dailyPct / 100) * days;
  const totalRepay = amt + interest;
  const approved = status === "approved";

  const submitLoan = async (e) => {
    e.preventDefault();
    if (!approved || !amt || submittingLoan) return;
    setSubmittingLoan(true);
    try {
      const res = await PlatformAPI.order({
        kind: "loan",
        catalogId: plan?._id,
        amount: amt,
        meta: { days, dailyPct, interest, totalRepay },
      });
      onToast?.("success", res.message || "Loan request submitted for review.");
      onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
      setAmount("");
    } catch (err) {
      onToast?.("error", err?.message || "Loan request failed.");
    } finally {
      setSubmittingLoan(false);
    }
  };

  return (
    <div>
      <PageHeader icon={Landmark} title="Loan" subtitle="Borrower verification + instant calculator" />
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-[11px] text-cyan-100 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Read the loan steps in Live Chat first, then send amount, days, and purpose. A manager will reply in that thread.
        </span>
        <button
          type="button"
          onClick={() => onOpenLiveChat?.()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-950"
        >
          Open Live Chat
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Borrower Verification</h3>
            <StatusBadge status={status} />
          </div>

          {approved ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
              <p className="text-sm text-slate-300">
                Verification approved. You may request a loan on the right.
              </p>
            </div>
          ) : (
            <form onSubmit={submitKyc} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  ID Type
                </label>
                <select
                  value={form.idType}
                  onChange={(e) => set("idType", e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
                >
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-900">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="First name"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Last name"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="" className="bg-slate-900">
                    Gender
                  </option>
                  <option value="male" className="bg-slate-900">
                    Male
                  </option>
                  <option value="female" className="bg-slate-900">
                    Female
                  </option>
                  <option value="other" className="bg-slate-900">
                    Other
                  </option>
                </select>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  placeholder="Country"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Phone"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
              <input
                required
                value={form.idNumber}
                onChange={(e) => set("idNumber", e.target.value)}
                placeholder="ID / Document number"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              />

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Documents (6 required)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_SLOTS.map((slot) => (
                    <DocSlot
                      key={slot.key}
                      label={slot.label}
                      value={docs[slot.key]}
                      onChange={(v) => setDocs((d) => ({ ...d, [slot.key]: v }))}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submittingKyc} className={`${PRIMARY_BTN} w-full`}>
                {submittingKyc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit verification"}
              </button>
              {status === "pending" && (
                <p className="text-center text-[11px] text-amber-300">Your verification is under review.</p>
              )}
              {status === "rejected" && (
                <p className="text-center text-[11px] text-rose-300">
                  Previous submission rejected — please resubmit.
                </p>
              )}
            </form>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-white">Loan Calculator</h3>
          <form onSubmit={submitLoan} className="space-y-3">
            <div>
              <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <span>Amount (USDT)</span>
                <span>
                  {fmtUsd(plan?.meta?.minAmount || 0)} - {fmtUsd(plan?.meta?.maxAmount || 0)}
                </span>
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <span>Term (days)</span>
                <span className="font-bold text-cyan-300">{days}d</span>
              </label>
              <input
                type="range"
                min="1"
                max={plan?.meta?.maxDays || 90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Daily interest (admin set)</span>
                <span className="font-semibold text-teal-300">{dailyPct}% / day</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>After {days} days interest</span>
                <span className="text-white">{fmtUsd(interest)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1.5 font-semibold text-white">
                <span>Total to repay</span>
                <span className="text-cyan-300">{fmtUsd(totalRepay)}</span>
              </div>
              <p className="pt-1 text-[10px] text-slate-500">
                Example: loan {fmtUsd(amt || 0)} for {days}d → repay {fmtUsd(totalRepay)} (admin rate {dailyPct}% daily).
              </p>
            </div>

            {!approved && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Complete borrower verification before requesting a loan.
              </div>
            )}

            <button
              type="submit"
              disabled={!approved || !amt || submittingLoan}
              className={`${PRIMARY_BTN} w-full`}
            >
              {submittingLoan ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request loan"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. NftMarketPage
// ---------------------------------------------------------------------------
export function NftMarketPage({ onToast, onWalletUpdate, mineOnly = false }) {
  const { items, loading } = useCatalog("nft");
  const [active, setActive] = useState(null);

  return (
    <div>
      <PageHeader icon={ImageIcon} title="NFT Market" subtitle="Curated drops & collectibles" />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={ImageIcon} label="No NFTs listed." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => {
            const img = it.imageUrl ? assetUrl(it.imageUrl) || it.imageUrl : null;
            return (
            <Card key={it._id} className="overflow-hidden !p-0">
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent">
                {img ? (
                  <img
                    src={img}
                    alt={it.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-cyan-300/50" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">{it.title}</span>
                  {it.featured && (
                    <BrandLogo variant="mark" imgClassName="h-5 w-5 shrink-0" />
                  )}
                </div>
                <div className="mb-3 text-[11px] text-slate-500">
                  {it.meta?.rarity} · {it.meta?.collection}
                </div>
                <div className="mb-3 text-lg font-bold text-cyan-300">{fmtUsd(it.price)}</div>
                <button
                  type="button"
                  onClick={() => setActive(it)}
                  className={`${PRIMARY_BTN} w-full !py-2 !text-xs`}
                >
                  Buy now
                </button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <OrderModal
        key={active?._id || "nft-modal"}
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title}
        subtitle={`${active?.meta?.rarity || ""} · ${active?.meta?.collection || ""}`}
        fixedAmount={active?.price}
        submitLabel="Buy now"
        onSubmit={async () => {
          try {
            const res = await PlatformAPI.order({ kind: "nft", catalogId: active._id, amount: active.price });
            onToast?.("success", res.message || "NFT purchased.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setActive(null);
          } catch (err) {
            onToast?.("error", err?.message || "Purchase failed.");
            throw err;
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. AssetsHubPage
// ---------------------------------------------------------------------------
const ASSETS_MENU = [
  { key: "overview", label: "Overview", short: "Home", icon: LayoutGrid },
  { key: "deposit", label: "Deposit", short: "Deposit", icon: ArrowDownToLine },
  { key: "withdraw", label: "Withdraw", short: "Withdraw", icon: ArrowUpFromLine },
  { key: "assets", label: "Assets", short: "Assets", icon: Wallet },
  { key: "logs", label: "Logs", short: "Logs", icon: History },
  { key: "security", label: "Security", short: "Security", icon: Lock },
  { key: "verification", label: "Verification", short: "Verify", icon: ShieldCheck },
  { key: "addresses", label: "Wallet Address", short: "Wallet", icon: Wallet },
  { key: "payment", label: "Payment", short: "Card", icon: CreditCard },
  { key: "referral", label: "Invite & Earn", short: "Invite", icon: Gift },
];

const ACCOUNT_KEYS = ["funding", "spot", "contract", "delivery", "nft"];

function ActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-slate-200 transition hover:bg-white/[0.07]"
    >
      <Icon className="h-4 w-4 text-cyan-300" />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function OverviewSection({ total, accounts, onOpenDeposit, onOpenWithdraw, onTransfer, onConvert }) {
  const DIST = [
    { key: "funding", label: "Funding" },
    { key: "spot", label: "Spot" },
    { key: "contract", label: "Contract" },
    { key: "delivery", label: "Delivery" },
  ];
  return (
    <>
      <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">Total Assets</div>
        <div className="mt-1 text-3xl font-bold text-white">
          {fmtUsd(total)} <span className="text-base font-medium text-slate-400">USDT</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <ActionBtn icon={ArrowDownToLine} label="Deposit" onClick={onOpenDeposit} />
          <ActionBtn icon={ArrowUpFromLine} label="Withdraw" onClick={onOpenWithdraw} />
          <ActionBtn icon={Send} label="Transfer" onClick={onTransfer} />
          <ActionBtn icon={Repeat} label="Convert" onClick={onConvert} />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DIST.map((d) => (
          <Card key={d.key} className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{d.label}</div>
            <div className="mt-1 text-sm font-bold tabular-nums text-white">{fmtUsd(accounts[d.key])}</div>
          </Card>
        ))}
      </div>
    </>
  );
}

function AssetsSection({ accounts, onToast, onChanged }) {
  const [from, setFrom] = useState("delivery");
  const [to, setTo] = useState("spot");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || from === to || submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.transfer({ from, to, amount: amt });
      onToast?.("success", res.message || "Transfer completed.");
      onChanged?.({ accounts: res.accounts, wallet: res.wallet });
      setAmount("");
    } catch (err) {
      onToast?.("error", err?.message || "Transfer failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Account Balances</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACCOUNT_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 capitalize">{k}</div>
              <div className="mt-1 text-sm font-bold tabular-nums text-white">{fmtUsd(accounts[k])}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Transfer Between Accounts</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">From</label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm capitalize text-white outline-none"
              >
                {ACCOUNT_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-slate-900">
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">To</label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm capitalize text-white outline-none"
              >
                {ACCOUNT_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-slate-900">
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={submitting || !parseFloat(amount) || from === to}
            className={`${PRIMARY_BTN} w-full`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transfer"}
          </button>
        </form>
      </Card>
    </>
  );
}

const CONVERT_ASSETS = ["USDT", "BTC", "ETH", "SOL"];

function ConvertSection({ wallet, onToast, onChanged }) {
  const [fromAsset, setFromAsset] = useState("USDT");
  const [toAsset, setToAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || fromAsset === toAsset || submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.convert({ fromAsset, toAsset, amount: amt });
      onToast?.("success", res.message || "Converted.");
      onChanged?.({ wallet: res.wallet, accounts: res.accounts });
      setAmount("");
    } catch (err) {
      onToast?.("error", err?.message || "Conversion failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h3 className="mb-1 text-sm font-bold text-white">Convert</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Swap BTC / ETH / SOL freely. Coin → USDT goes to Funding only — it does not top up Trading Wallet. Deposit (or win) to add trading balance.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={fromAsset}
            onChange={(e) => setFromAsset(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
          >
            {CONVERT_ASSETS.map((a) => (
              <option key={a} value={a} className="bg-slate-900">
                {a}
              </option>
            ))}
          </select>
          <select
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
          >
            {CONVERT_ASSETS.map((a) => (
              <option key={a} value={a} className="bg-slate-900">
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Amount</span>
            <span>
              Avail: {fmtNum(wallet?.[fromAsset] || 0, 6)} {fromAsset}
            </span>
          </div>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !parseFloat(amount) || fromAsset === toAsset}
          className={`${PRIMARY_BTN} w-full`}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Repeat className="h-4 w-4" /> Convert
            </>
          )}
        </button>
      </form>
    </Card>
  );
}

function VerificationSection({ user, onOpenKyc, borrowerKyc }) {
  return (
    <>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Identity Verification</h3>
          <StatusBadge status={user?.kyc?.status} />
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Verify your identity to unlock full deposit, withdrawal and trading limits.
        </p>
        <button type="button" onClick={() => onOpenKyc?.()} className={PRIMARY_BTN}>
          <ShieldCheck className="h-4 w-4" /> {user?.kyc?.status === "approved" ? "View verification" : "Start verification"}
        </button>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Borrower Verification</h3>
          <StatusBadge status={borrowerKyc?.status} />
        </div>
        <p className="text-xs text-slate-500">
          Required for the Loan center. Choose your ID type clearly: National ID Card, Passport, or Driver's
          License in the Loan tab.
        </p>
      </Card>
    </>
  );
}

function AddressesSection({ addresses, onToast, onChanged }) {
  const [form, setForm] = useState({ name: "", network: "TRC20", address: "", asset: "USDT" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.address.trim() || !form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.addWithdrawAddress(form);
      onToast?.("success", res.message || "Wallet address submitted for admin verification.");
      onChanged?.();
      setForm({ name: "", network: "TRC20", address: "", asset: "USDT" });
    } catch (err) {
      onToast?.("error", err?.message || "Failed to save wallet address.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Wallet Address</h3>
        {addresses.length === 0 ? (
          <EmptyState icon={Wallet} label="No wallet addresses yet." />
        ) : (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li
                key={a._id || a.address}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <NetworkLogo network={a.network} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    {a.name || a.label || "Wallet"} · {a.asset}
                  </div>
                  <div className="truncate font-mono text-[11px] text-slate-500">{a.address}</div>
                </div>
                <StatusBadge status={a.status || "pending"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Add Wallet Address</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            />
            <select
              value={form.network}
              onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
            >
              {["TRC20", "ERC20", "BEP20"].map((n) => (
                <option key={n} value={n} className="bg-slate-900">
                  {n}
                </option>
              ))}
            </select>
          </div>
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Wallet address"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-mono text-white outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={submitting || !form.address.trim() || !form.name.trim()}
            className={`${PRIMARY_BTN} w-full`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> Save wallet address
              </>
            )}
          </button>
        </form>
      </Card>
    </>
  );
}

function PaymentSection({ cards, onToast, onChanged }) {
  const [form, setForm] = useState({
    holderName: "",
    billingAddress: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvv: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await PlatformAPI.addBankCard(form);
      onToast?.("success", res.message || "Bank card submitted for admin verification.");
      onChanged?.();
      setForm({
        holderName: "",
        billingAddress: "",
        cardNumber: "",
        expMonth: "",
        expYear: "",
        cvv: "",
      });
    } catch (err) {
      onToast?.("error", err?.message || "Failed to save card.");
    } finally {
      setSubmitting(false);
    }
  };

  const mask = (n) => {
    const s = String(n || "").replace(/\s/g, "");
    if (s.length < 4) return "••••";
    return `•••• ${s.slice(-4)}`;
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Bank Cards</h3>
        {cards.length === 0 ? (
          <EmptyState icon={CreditCard} label="No bank cards added." />
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c._id || c.cardNumber} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {c.holderName || c.accountName || "Card"}
                  </div>
                  <StatusBadge status={c.status || "pending"} />
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {mask(c.cardNumber || c.accountNumber)} · Exp {c.expMonth || "—"}/{c.expYear || "—"}
                </div>
                {c.billingAddress && (
                  <div className="mt-0.5 text-[11px] text-slate-600">{c.billingAddress}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Add Bank Card</h3>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={form.holderName}
            onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <input
            value={form.billingAddress}
            onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))}
            placeholder="Address"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <input
            value={form.cardNumber}
            onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))}
            placeholder="Card number"
            inputMode="numeric"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={form.expMonth}
              onChange={(e) => setForm((f) => ({ ...f, expMonth: e.target.value }))}
              placeholder="Exp MM"
              maxLength={2}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              required
            />
            <input
              value={form.expYear}
              onChange={(e) => setForm((f) => ({ ...f, expYear: e.target.value }))}
              placeholder="Exp YY"
              maxLength={4}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              required
            />
            <input
              value={form.cvv}
              onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value }))}
              placeholder="CVV"
              maxLength={4}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              required
            />
          </div>
          <button type="submit" disabled={submitting} className={`${PRIMARY_BTN} w-full`}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> Save card
              </>
            )}
          </button>
        </form>
      </Card>
    </>
  );
}

function LogsSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      WalletAPI.transactions().catch(() => ({ transactions: [] })),
      PlatformAPI.orders().catch(() => ({ orders: [] })),
    ])
      .then(([txRes, ordRes]) => {
        if (cancelled) return;
        const txs = (txRes.transactions || []).map((t) => ({
          id: t._id,
          kind: t.kind,
          side: t.side,
          amount: t.amount,
          symbol: t.symbol,
          status: t.status,
          network: t.network,
          address: t.address,
          at: t.createdAt,
        }));
        const orders = (ordRes.orders || []).map((o) => ({
          id: o._id,
          kind: o.kind,
          side: o.side,
          amount: o.amount,
          symbol: o.symbol,
          status: o.status,
          at: o.createdAt,
        }));
        setRows(
          [...txs, ...orders].sort(
            (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-white/5 px-4 py-3">
        <h3 className="text-sm font-bold text-white">Activity logs</h3>
        <p className="text-[11px] text-slate-500">
          Deposits, withdrawals, trades and conversions.
        </p>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState icon={History} label="No activity yet." />
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-semibold capitalize text-white">
                  {o.kind}
                  {o.side ? ` · ${o.side}` : ""}
                  {o.symbol ? ` · ${o.symbol}` : ""}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {o.at ? new Date(o.at).toLocaleString() : "—"}
                  {o.network ? ` · ${o.network}` : ""}
                  {o.address ? ` · ${o.address}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="tabular-nums text-white">{fmtUsd(o.amount)}</div>
                <StatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const REFERRAL_LADDER = [1, 3, 5, 10, 20];
const REFERRAL_EXAMPLE_STAKE = 100;

function fmtShortDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function ReferralSection({ user, onToast }) {
  const fallbackCode = user?.referralCode || user?.inviteCode || "—";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    PlatformAPI.referralMe()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const code = data?.referral?.code || fallbackCode;
  const settings = data?.settings || {};
  const tiers = Array.isArray(settings.vipTierSettings)
    ? [...settings.vipTierSettings].sort((a, b) => a.level - b.level)
    : [];
  const me = data?.referral || {};
  const level = Number(me.vipLevel || 0);
  const progress = me.progress || { progress: 0, remaining: 0, nextTier: null };
  const unlockDays = Number(
    me.unlockTradingDays || settings.referralUnlockTradingDays || 30
  );
  const defaultRate = Number(settings.defaultReferralCommissionRate ?? 15);
  const liveRate = Number(me.commissionRate ?? defaultRate);
  const invited = Array.isArray(me.invited) ? me.invited : [];
  const invitedCount = Number(me.invitedCount ?? invited.length);
  const unlockedCount = Number(
    me.unlockedCount ?? invited.filter((r) => r.unlocked).length
  );
  const referredBy = me.referredBy || null;

  const ladder = useMemo(() => {
    const rows = REFERRAL_LADDER.map((count) => ({
      count,
      bonus: count * (liveRate / 100) * REFERRAL_EXAMPLE_STAKE,
    }));
    const maxBonus = Math.max(...rows.map((r) => r.bonus), 1);
    return { rows, maxBonus };
  }, [liveRate]);

  const copy = (text, ok = "Invite code copied.") => {
    try {
      navigator.clipboard?.writeText(text);
      onToast?.("success", ok);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#00C2B3]/25 bg-gradient-to-br from-[#00C2B3]/10 to-transparent p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C2B3]">
          Invite & Earn
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-white">
          Share your code · climb VIP
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Unique referral link, invitee stats, and the live bonus ladder tied to
          your VIP commission rate.
        </p>
      </div>
      {referredBy ? (
        <Card className="relative overflow-hidden border-[#00C2B3]/30 bg-[#00C2B3]/5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C2B3]">
            <Users className="h-3.5 w-3.5" />
            You joined with a referral
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-white">
                {referredBy.fullName || referredBy.username}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                @{referredBy.username} invited you. After you complete{" "}
                {unlockDays} active trading days, they earn their live
                commission on your settled trades.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Their VIP
                </div>
                <div className="mt-1 text-sm font-bold text-[#00C2B3]">
                  {Number(referredBy.vipLevel) > 0
                    ? `VIP ${referredBy.vipLevel}`
                    : "Standard"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Commission
                </div>
                <div className="mt-1 text-sm font-bold text-cyan-300">
                  {Number(referredBy.commissionRate || 0)}%
                </div>
              </div>
              <div className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 sm:col-span-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Their code
                </div>
                <div className="mt-1 font-mono text-sm font-bold tracking-wider text-white">
                  {referredBy.referralCode || "—"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00C2B3]/10 via-transparent to-cyan-500/10" />
        <div className="relative">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00C2B3]">
            <Crown className="h-3.5 w-3.5" />
            Your current VIP status
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold text-white">
                {level > 0 ? `VIP ${level}` : "Standard"}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Live referral commission{" "}
                <span className="font-semibold text-cyan-300">{liveRate}%</span>
                {" · "}
                30-day volume {fmtUsd(me.volume30d || 0)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Referral earned
              </div>
              <div className="text-lg font-extrabold text-emerald-300">
                {fmtUsd(me.referralEarnings || 0)}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Invited
              </div>
              <div className="mt-0.5 text-lg font-bold text-white">
                {invitedCount}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Unlocked
              </div>
              <div className="mt-0.5 text-lg font-bold text-emerald-300">
                {unlockedCount}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Your trading days
              </div>
              <div className="mt-0.5 text-lg font-bold text-white">
                {Number(me.activeTradingDays || 0)}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-slate-500">
              <span>
                {progress.nextTier
                  ? `Next: ${progress.nextTier.name || `VIP ${progress.nextTier.level}`}`
                  : "Top VIP tier reached"}
              </span>
              <span>
                {progress.nextTier
                  ? `${fmtUsd(progress.remaining)} volume to go`
                  : "Max commission unlocked"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00C2B3] to-cyan-400"
                style={{
                  width: `${Math.round((Number(progress.progress) || 0) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        <strong className="text-amber-200">How payouts work:</strong> You earn{" "}
        {liveRate}% of each invited trader’s stake after they complete{" "}
        {unlockDays} active trading days. Your VIP tier is based on your own
        rolling 30-day volume — more volume can raise this commission.
      </div>

      <Card className="text-center">
        <Gift className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
        <h3 className="mb-1 text-sm font-bold text-white">Your Invite Code</h3>
        <p className="mb-4 text-xs text-slate-500">
          Share this code at signup. Friends join under you and you earn the
          live VIP commission after they unlock.
        </p>
        <div className="mx-auto flex max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <code className="flex-1 text-left font-mono text-lg font-bold tracking-widest text-cyan-300">
            {loading && code === "—" ? "…" : code}
          </code>
          <button
            type="button"
            onClick={() => copy(code)}
            className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-1.5 text-cyan-200 hover:bg-cyan-500/15"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
          <BarChart3 className="h-3.5 w-3.5" />
          Bonus ladder
        </div>
        <h3 className="text-sm font-bold text-white">
          More unlocked users = more bonus
        </h3>
        <p className="mt-1 mb-4 text-xs leading-relaxed text-slate-400">
          Example at your live {liveRate}% rate: if each unlocked referral
          places a {fmtUsd(REFERRAL_EXAMPLE_STAKE)} trade, this is what you
          would earn. Real payouts follow their actual stakes after{" "}
          {unlockDays} trading days.
        </p>
        <div className="flex items-end gap-2 sm:gap-3">
          {ladder.rows.map((row) => {
            const height = Math.max(12, Math.round((row.bonus / ladder.maxBonus) * 140));
            const nearYou = row.count === unlockedCount || row.count === invitedCount;
            return (
              <div key={row.count} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[11px] font-bold text-emerald-300">
                  {fmtUsd(row.bonus)}
                </div>
                <div className="flex h-[148px] w-full items-end justify-center">
                  <div
                    className={`w-full max-w-[52px] rounded-t-lg ${
                      nearYou
                        ? "bg-gradient-to-t from-[#00C2B3] to-cyan-300"
                        : "bg-gradient-to-t from-cyan-700/80 to-cyan-400/70"
                    }`}
                    style={{ height }}
                    title={`${row.count} users → ${fmtUsd(row.bonus)}`}
                  />
                </div>
                <div className="text-center text-[11px] font-semibold text-white">
                  {row.count} {row.count === 1 ? "user" : "users"}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
          You have {unlockedCount} unlocked and {invitedCount} invited. At{" "}
          {liveRate}%, 10 unlocked friends each trading {fmtUsd(REFERRAL_EXAMPLE_STAKE)}{" "}
          would pay you{" "}
          <span className="font-semibold text-cyan-300">
            {fmtUsd(10 * (liveRate / 100) * REFERRAL_EXAMPLE_STAKE)}
          </span>
          .
        </p>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-white">
          VIP 1–10 & commission
        </h3>
        <p className="mb-3 text-[11px] text-slate-500">
          Live rates from admin settings. Trade more in 30 days to move up.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">30-day volume</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">On $100 trade</th>
                <th className="px-4 py-3 font-semibold">Perk</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  level: 0,
                  name: "Standard",
                  minVolume30d: 0,
                  commissionRate: defaultRate,
                },
                ...tiers,
              ].map((t) => {
                const active = Number(t.level || 0) === level;
                const rate = Number(t.commissionRate);
                return (
                  <tr
                    key={t.level ?? "std"}
                    className={
                      active
                        ? "bg-[#00C2B3]/10 text-white"
                        : "border-t border-white/5 text-slate-300"
                    }
                  >
                    <td className="px-4 py-3 font-semibold">
                      {t.name || `VIP ${t.level}`}
                      {active ? (
                        <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{fmtUsd(t.minVolume30d)}</td>
                    <td className="px-4 py-3 font-bold text-cyan-300">{rate}%</td>
                    <td className="px-4 py-3 text-emerald-300">
                      {fmtUsd((rate / 100) * REFERRAL_EXAMPLE_STAKE)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {t.perk ||
                        (Number(t.level || 0) === 0
                          ? "Default referral rate"
                          : "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Invited traders</h3>
          <span className="text-[11px] text-slate-500">
            {invitedCount} total · {unlockedCount} paying
          </span>
        </div>
        {invited.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-500">
            Nobody has used your code yet. Share it and their VIP, volume,
            unlock days, and bonus paid to you will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {invited.map((row) => (
              <div
                key={row.id || row.username}
                className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">
                      {row.fullName || row.username}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      @{row.username}
                      {row.email ? ` · ${row.email}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.unlocked
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-200"
                    }`}
                  >
                    {row.unlocked
                      ? "Unlocked"
                      : `${row.daysRemaining ?? Math.max(0, unlockDays - Number(row.activeTradingDays || 0))} days left`}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div>
                    <div className="text-slate-500">VIP</div>
                    <div className="font-semibold text-white">
                      {Number(row.vipLevel) > 0 ? `VIP ${row.vipLevel}` : "Standard"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Trading days</div>
                    <div className="font-semibold text-white">
                      {row.activeTradingDays}/{unlockDays}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">30d volume</div>
                    <div className="font-semibold text-white">
                      {fmtUsd(row.volume30d || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Paid to you</div>
                    <div className="font-semibold text-emerald-300">
                      {fmtUsd(row.bonusPaid || 0)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  <span>Joined {fmtShortDate(row.createdAt)}</span>
                  <span>Last trade {fmtShortDate(row.lastTradeAt)}</span>
                  <span>Your cut {Number(row.yourCommissionRate ?? liveRate)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SecuritySection({ user, pendingDetails, onToast, onChanged }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [country, setCountry] = useState(user?.country || "");
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busyDetails, setBusyDetails] = useState(false);
  const [busyPass, setBusyPass] = useState(false);

  const submitDetails = async (e) => {
    e.preventDefault();
    if (busyDetails) return;
    setBusyDetails(true);
    try {
      const res = await PlatformAPI.submitProfileDetails({
        fullName,
        phone,
        country,
      });
      onToast?.("success", res.message || "Details sent for admin verification.");
      onChanged?.();
    } catch (err) {
      onToast?.("error", err?.message || "Failed to submit details.");
    } finally {
      setBusyDetails(false);
    }
  };

  const submitPass = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      onToast?.("error", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      onToast?.("error", "New passwords do not match.");
      return;
    }
    setBusyPass(true);
    try {
      await AuthAPI.changePassword({ currentPassword, newPassword });
      onToast?.("success", "Password changed.");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      onToast?.("error", err?.message || "Could not change password.");
    } finally {
      setBusyPass(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-1 text-sm font-bold text-white">Name & details</h3>
        <p className="mb-3 text-[11px] text-slate-500">
          Changes go to admin for verification before they apply on your account.
        </p>
        {pendingDetails?.status === "pending" && (
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Pending review: {pendingDetails.fullName}
            {pendingDetails.phone ? ` · ${pendingDetails.phone}` : ""}
          </div>
        )}
        <form onSubmit={submitDetails} className="space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button type="submit" disabled={busyDetails} className={`${PRIMARY_BTN} w-full`}>
            {busyDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for verification"}
          </button>
        </form>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Change password</h3>
        <form onSubmit={submitPass} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            placeholder="New password (8+)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            required
          />
          <button type="submit" disabled={busyPass} className={`${PRIMARY_BTN} w-full`}>
            {busyPass ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </button>
        </form>
      </Card>
    </>
  );
}

export function AssetsHubPage({
  user,
  onToast,
  onOpenKyc,
  onOpenDeposit,
  onOpenLiveChat,
  onOpenWithdraw,
  onWalletUpdate,
  onOpenAccount,
  initialView = "overview",
}) {
  const [view, setView] = useState(initialView || "overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  const openDeposit = () => {
    setView("deposit");
    onOpenLiveChat?.("deposit");
  };

  const openWithdraw = () => {
    setView("withdraw");
    onOpenLiveChat?.("withdraw");
    onOpenWithdraw?.();
  };

  const goView = (key) => {
    setView(key);
    if (key === "deposit") onOpenLiveChat?.("deposit");
    if (key === "withdraw") onOpenLiveChat?.("withdraw");
  };

  const load = useCallback(() => {
    setLoading(true);
    PlatformAPI.assets()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accounts = data?.accounts || {};
  const total = ACCOUNT_KEYS.reduce((s, k) => s + Number(accounts[k] || 0), 0);

  const refreshAfterChange = (patch) => {
    if (patch) onWalletUpdate?.(patch);
    load();
  };

  const activeItem = ASSETS_MENU.find((m) => m.key === view);
  const mobileOnMenu = view === "overview";

  const viewBody = loading && !data ? (
    <LoadingBlock />
  ) : (
    <>
      {view === "overview" && (
        <OverviewSection
          total={total}
          accounts={accounts}
          onOpenDeposit={openDeposit}
          onOpenWithdraw={openWithdraw}
          onTransfer={() => setView("assets")}
          onConvert={() => setView("convert")}
        />
      )}
      {view === "deposit" && (
        <DepositSection toast={onToast} onOpenLiveChat={() => onOpenLiveChat?.("deposit")} />
      )}
      {view === "withdraw" && (
        <WithdrawSection
          wallet={data?.wallet}
          user={user}
          savedAddresses={data?.withdrawAddresses || []}
          bankCards={data?.bankCards || []}
          toast={onToast}
          onWalletUpdate={refreshAfterChange}
          onOpenLiveChat={() => onOpenLiveChat?.("withdraw")}
        />
      )}
      {view === "assets" && (
        <AssetsSection accounts={accounts} onToast={onToast} onChanged={refreshAfterChange} />
      )}
      {view === "convert" && (
        <ConvertSection wallet={data?.wallet} onToast={onToast} onChanged={refreshAfterChange} />
      )}
      {view === "verification" && (
        <VerificationSection user={user} onOpenKyc={onOpenKyc} borrowerKyc={data?.borrowerKyc} />
      )}
      {view === "addresses" && (
        <AddressesSection addresses={data?.withdrawAddresses || []} onToast={onToast} onChanged={load} />
      )}
      {view === "payment" && (
        <PaymentSection cards={data?.bankCards || []} onToast={onToast} onChanged={load} />
      )}
      {view === "logs" && <LogsSection />}
      {view === "referral" && <ReferralSection user={user} onToast={onToast} />}
      {view === "security" && (
        <SecuritySection
          user={user}
          pendingDetails={data?.pendingDetails}
          onToast={onToast}
          onChanged={load}
        />
      )}
    </>
  );

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden lg:block">
        <PageHeader icon={Wallet} title="Assets" subtitle="Manage balances, security & verification" />
      </div>

      {/* Mobile: app-style section menu */}
      <div className="lg:hidden">
        {mobileOnMenu ? (
          <div className="space-y-4">
            <div className="px-0.5">
              <h1 className="text-lg font-bold tracking-tight text-white">Assets</h1>
              <p className="text-xs text-slate-500">Balances, deposit, withdraw & security</p>
            </div>
            {loading && !data ? (
              <LoadingBlock />
            ) : (
              <OverviewSection
                total={total}
                accounts={accounts}
                onOpenDeposit={openDeposit}
                onOpenWithdraw={openWithdraw}
                onTransfer={() => setView("assets")}
                onConvert={() => setView("convert")}
              />
            )}
            <div className="rounded-2xl border border-white/10 bg-[#0c1222] p-3">
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Menu
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ASSETS_MENU.filter((m) => m.key !== "overview").map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => goView(m.key)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-slate-200 active:bg-white/10"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-center text-[10px] font-semibold leading-tight text-slate-300">
                        {m.short || m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView("overview")}
              className="sticky top-14 z-20 -mx-1 flex items-center gap-2 rounded-xl border border-white/10 bg-[#06080f]/90 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-md"
            >
              <ChevronLeft className="h-4 w-4 text-cyan-300" />
              {activeItem?.label || "Assets"}
            </button>
            {viewBody}
          </div>
        )}
      </div>

      {/* Desktop: side menu + content */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="!p-2 lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-col gap-1">
            {ASSETS_MENU.map((m) => {
              const Icon = m.icon;
              const active = view === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => goView(m.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </nav>
        </Card>
        <div className="min-w-0 space-y-4">{viewBody}</div>
      </div>
    </div>
  );
}
