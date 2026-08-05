/**
 * CXM-style platform pages — Market, Spot/Perpetual trade, C2C, Carbon ETF,
 * AI Compute, ICO, Copy Trade, Loan, NFT Market and the Assets hub.
 * Rendered by Dashboard.jsx inside <PlatformShell>.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  Sparkles,
  LayoutGrid,
  History,
  Lock,
  MapPin,
  CreditCard,
  Gift,
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  Plus,
} from "lucide-react";
import { PlatformAPI } from "../lib/api.js";
import DepositSection from "./DepositSection.jsx";

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
// 4. C2CPage
// ---------------------------------------------------------------------------
export function C2CPage({ onToast, onWalletUpdate }) {
  const { items, loading } = useCatalog("c2c_ad");
  const [active, setActive] = useState(null);

  return (
    <div>
      <PageHeader icon={Users} title="C2C" subtitle="Peer-to-peer merchant desk" />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} label="No merchant ads available." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((ad) => {
            const userSide = ad.meta?.side === "sell" ? "Buy" : "Sell";
            return (
              <Card key={ad._id}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-white">{ad.title}</div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                    {ad.meta?.payment}
                  </span>
                </div>
                <div className="mb-3 text-2xl font-bold tabular-nums text-cyan-300">
                  {fmtNum(ad.price, 2)} <span className="text-xs text-slate-500">{ad.meta?.fiat}</span>
                </div>
                <div className="mb-3 text-[11px] text-slate-500">
                  Limit {ad.meta?.min} - {ad.meta?.max} {ad.meta?.fiat}
                </div>
                <button
                  type="button"
                  onClick={() => setActive(ad)}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                    userSide === "Buy"
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                      : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/20"
                  }`}
                >
                  {userSide} {ad.meta?.asset}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <OrderModal
        key={active?._id || "c2c-modal"}
        open={!!active}
        onClose={() => setActive(null)}
        title={`${active?.meta?.side === "sell" ? "Buy" : "Sell"} ${active?.meta?.asset || ""}`}
        subtitle={`Rate ${active?.price} ${active?.meta?.fiat} · Limit ${active?.meta?.min}-${active?.meta?.max} ${active?.meta?.fiat}`}
        minAmount={active?.meta?.min}
        maxAmount={active?.meta?.max}
        submitLabel="Place order"
        onSubmit={async (amt) => {
          if (!amt || amt <= 0) return;
          try {
            const userSide = active.meta?.side === "sell" ? "buy" : "sell";
            const res = await PlatformAPI.order({
              kind: "c2c",
              catalogId: active._id,
              amount: amt,
              side: userSide,
              meta: { asset: active.meta?.asset, fiat: active.meta?.fiat, price: active.price },
            });
            onToast?.("success", res.message || "C2C order placed — pending merchant confirmation.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setActive(null);
          } catch (err) {
            onToast?.("error", err?.message || "Order failed.");
            throw err;
          }
        }}
      />
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
  const [active, setActive] = useState(null);

  return (
    <div>
      <PageHeader icon={Copy} title="Copy Trade" subtitle="Follow top-performing desks" />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={Copy} label="No traders available." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it._id}>
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/20 font-bold text-cyan-200">
                  {it.title?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-white">{it.title}</div>
                  <div className="text-[11px] text-slate-500">{it.meta?.followers} followers</div>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Win rate</div>
                  <div className="font-bold text-emerald-400">{it.meta?.winRate}%</div>
                </div>
                <div>
                  <div className="text-slate-500">Profit share</div>
                  <div className="font-bold text-white">{it.meta?.profitSharePct}%</div>
                </div>
              </div>
              <button type="button" onClick={() => setActive(it)} className={`${PRIMARY_BTN} w-full`}>
                Follow
              </button>
            </Card>
          ))}
        </div>
      )}

      <OrderModal
        key={active?._id || "copy-modal"}
        open={!!active}
        onClose={() => setActive(null)}
        title={`Follow ${active?.title || ""}`}
        subtitle={`Minimum copy amount ${fmtUsd(active?.meta?.minCopy || 0)}`}
        minAmount={active?.meta?.minCopy}
        submitLabel="Follow trader"
        onSubmit={async (amt) => {
          if (!amt || amt <= 0) return;
          try {
            const res = await PlatformAPI.order({ kind: "copy_trade", catalogId: active._id, amount: amt });
            onToast?.("success", res.message || "Now following trader.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setActive(null);
          } catch (err) {
            onToast?.("error", err?.message || "Follow failed.");
            throw err;
          }
        }}
      />
    </div>
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

export function LoanPage({ onToast, user, onWalletUpdate }) {
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
                <span>Daily interest</span>
                <span className="text-white">{dailyPct}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Interest total</span>
                <span className="text-white">{fmtUsd(interest)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1.5 font-semibold text-white">
                <span>Total repayment</span>
                <span className="text-cyan-300">{fmtUsd(totalRepay)}</span>
              </div>
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
          {items.map((it) => (
            <Card key={it._id} className="overflow-hidden !p-0">
              <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent">
                <ImageIcon className="h-10 w-10 text-cyan-300/50" />
              </div>
              <div className="p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">{it.title}</span>
                  {it.featured && <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
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
          ))}
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
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { key: "assets", label: "Assets", icon: Wallet },
  { key: "logs", label: "Logs", icon: History },
  { key: "security", label: "Security", icon: Lock },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "referral", label: "Referral", icon: Gift },
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
    { key: "nft", label: "NFT" },
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
      <h3 className="mb-3 text-sm font-bold text-white">Convert</h3>
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
  const [form, setForm] = useState({ label: "", network: "TRC20", address: "", asset: "USDT" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.address.trim() || submitting) return;
    setSubmitting(true);
    try {
      await PlatformAPI.addWithdrawAddress(form);
      onToast?.("success", "Address saved.");
      onChanged?.();
      setForm({ label: "", network: "TRC20", address: "", asset: "USDT" });
    } catch (err) {
      onToast?.("error", err?.message || "Failed to save address.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Withdraw Addresses</h3>
        {addresses.length === 0 ? (
          <EmptyState icon={MapPin} label="No saved addresses yet." />
        ) : (
          <ul className="space-y-2">
            {addresses.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {a.label} · {a.asset}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">{a.address}</div>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                  {a.network}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Add Address</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Label"
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
            disabled={submitting || !form.address.trim()}
            className={`${PRIMARY_BTN} w-full`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> Save address
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
    bankName: "",
    accountName: "",
    accountNumber: "",
    iban: "",
    currency: "USD",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bankName.trim() || !form.accountNumber.trim() || submitting) return;
    setSubmitting(true);
    try {
      await PlatformAPI.addBankCard(form);
      onToast?.("success", "Bank card saved.");
      onChanged?.();
      setForm({ bankName: "", accountName: "", accountNumber: "", iban: "", currency: "USD" });
    } catch (err) {
      onToast?.("error", err?.message || "Failed to save card.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Bank Cards</h3>
        {cards.length === 0 ? (
          <EmptyState icon={CreditCard} label="No bank cards added." />
        ) : (
          <ul className="space-y-2">
            {cards.map((c, i) => (
              <li key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-sm font-semibold text-white">{c.bankName}</div>
                <div className="text-[11px] text-slate-500">
                  {c.accountName} · {c.accountNumber} · {c.currency}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-bold text-white">Add Bank Card</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
              placeholder="Bank name"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            />
            <input
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="Account name"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>
          <input
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            placeholder="Account number / IBAN"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={submitting || !form.bankName.trim() || !form.accountNumber.trim()}
            className={`${PRIMARY_BTN} w-full`}
          >
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PlatformAPI.orders()
      .then((r) => setOrders(r.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-white/5 px-4 py-3">
        <h3 className="text-sm font-bold text-white">Order Logs</h3>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : orders.length === 0 ? (
        <EmptyState icon={History} label="No orders yet." />
      ) : (
        <ul className="divide-y divide-white/5">
          {orders.map((o) => (
            <li key={o._id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-semibold capitalize text-white">
                  {o.kind}
                  {o.side ? ` · ${o.side}` : ""}
                </div>
                <div className="text-[11px] text-slate-500">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
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

function ReferralSection({ user, onToast }) {
  const code = user?.inviteCode || "—";
  const copy = () => {
    try {
      navigator.clipboard?.writeText(code);
      onToast?.("success", "Invite code copied.");
    } catch {
      /* ignore */
    }
  };
  return (
    <Card className="text-center">
      <Gift className="mx-auto mb-3 h-8 w-8 text-cyan-300" />
      <h3 className="mb-1 text-sm font-bold text-white">Your Invite Code</h3>
      <p className="mb-4 text-xs text-slate-500">Share your code and earn rewards when friends join.</p>
      <div className="mx-auto flex max-w-xs items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <code className="flex-1 text-left font-mono text-lg font-bold tracking-widest text-cyan-300">{code}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-1.5 text-cyan-200 hover:bg-cyan-500/15"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

function SecuritySection({ onOpenAccount }) {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-bold text-white">Security</h3>
      <p className="mb-4 text-xs text-slate-500">
        Manage your password and login security from your account settings.
      </p>
      <button type="button" onClick={() => onOpenAccount?.()} className={PRIMARY_BTN}>
        <Lock className="h-4 w-4" /> Manage security
      </button>
    </Card>
  );
}

export function AssetsHubPage({
  user,
  onToast,
  onOpenKyc,
  onOpenDeposit,
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
    onOpenDeposit?.();
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

  return (
    <div>
      <PageHeader icon={Wallet} title="Assets" subtitle="Manage balances, security & verification" />
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="!p-2 lg:sticky lg:top-20 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {ASSETS_MENU.map((m) => {
              const Icon = m.icon;
              const active = view === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setView(m.key)}
                  className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
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

        <div className="min-w-0 space-y-4">
          {loading && !data ? (
            <LoadingBlock />
          ) : (
            <>
              {view === "overview" && (
                <OverviewSection
                  total={total}
                  accounts={accounts}
                  onOpenDeposit={openDeposit}
                  onOpenWithdraw={onOpenWithdraw}
                  onTransfer={() => setView("assets")}
                  onConvert={() => setView("convert")}
                />
              )}
              {view === "deposit" && <DepositSection toast={onToast} />}
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
              {view === "security" && <SecuritySection onOpenAccount={onOpenAccount} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
