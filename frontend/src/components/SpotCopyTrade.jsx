/**
 * Smart Copy Trade — 4 glass signal cards, market coin pickers, admin-gated copy.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  History,
  Loader2,
  Search,
} from "lucide-react";
import { CopyBotAPI, SecondsTradeAPI, WalletAPI } from "../lib/api.js";
import SpotCopyChart from "./SpotCopyChart.jsx";
import {
  FOREX_ASSETS,
  STOCK_ASSETS,
  chartSymbol,
  displayName,
  pairLabel,
  seedPrice,
  sourceLabel,
} from "../lib/marketAssets.js";
import { WATCHLIST_CRYPTO } from "./CryptoWatchlist.jsx";

const PICKS_KEY = "smart_copy_picks";
const MARKET_TABS = [
  { id: "crypto", label: "Crypto" },
  { id: "forex", label: "Forex" },
  { id: "stock", label: "Stocks" },
];

const SLOT_FALLBACK = [
  { slot: 0, defaultAsset: "BTC", defaultType: "crypto", accuracy: 94, prediction: "Bullish Breakout", followers: 12450, bar: "green" },
  { slot: 1, defaultAsset: "XAUUSD", defaultType: "forex", accuracy: 88, prediction: "Support Retest", followers: 9120, bar: "cyan" },
  { slot: 2, defaultAsset: "EURUSD", defaultType: "forex", accuracy: 70, prediction: "Ranging Market", followers: 3500, bar: "orange" },
  { slot: 3, defaultAsset: "AAPL", defaultType: "stock", accuracy: 62, prediction: "Volatile Dip", followers: 1800, bar: "red" },
];

function loadPicks() {
  try {
    const raw = JSON.parse(localStorage.getItem(PICKS_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function savePicks(picks) {
  try {
    localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
  } catch {
    /* ignore */
  }
}

function barColor(kind) {
  if (kind === "green") return "from-emerald-400 to-lime-300";
  if (kind === "cyan") return "from-cyan-400 to-teal-300";
  if (kind === "orange") return "from-orange-400 to-amber-300";
  return "from-rose-500 to-orange-500";
}

function barTrack(kind) {
  if (kind === "green") return "bg-emerald-500/20";
  if (kind === "cyan") return "bg-cyan-500/20";
  if (kind === "orange") return "bg-orange-500/20";
  return "bg-rose-500/20";
}

function fmtDelta(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (v > 0) return `+$${abs}`;
  if (v < 0) return `−$${abs}`;
  return `$${abs}`;
}

function CoinPicker({ asset, assetType, lists, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(assetType || "crypto");
  const [q, setQ] = useState("");
  const options =
    tab === "forex"
      ? lists.forex
      : tab === "stock"
        ? lists.stock
        : lists.crypto;
  const filtered = q.trim()
    ? options.filter((a) =>
        `${a} ${displayName(a, tab)}`.toLowerCase().includes(q.trim().toLowerCase())
      )
    : options;

  return (
    <div className={`relative ${open ? "z-40" : "z-20"}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
      >
        <span className="truncate">
          {displayName(asset, assetType)} · {pairLabel(asset, assetType)}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[min(18rem,78vw)] overflow-hidden rounded-xl border border-white/15 bg-[#0b1018]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex gap-1 border-b border-white/10 p-1.5">
            {MARKET_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setQ("");
                }}
                className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                  tab === t.id
                    ? "bg-white/15 text-white"
                    : "text-white/45 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search coin…"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.slice(0, 120).map((a) => (
              <button
                key={`${tab}-${a}`}
                type="button"
                onClick={() => {
                  onChange(a, tab);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                  a === asset && tab === assetType
                    ? "bg-cyan-500/20 text-cyan-100"
                    : "text-white/80 hover:bg-white/5"
                }`}
              >
                <span className="font-semibold">{displayName(a, tab)}</span>
                <span className="text-[10px] text-white/40">
                  {pairLabel(a, tab)}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="px-3 py-4 text-center text-[11px] text-white/40">
                No match
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CopySyncOverlay({ asset, assetType, secondsLeft }) {
  const pct = Math.max(0, Math.min(100, ((10 - secondsLeft) / 10) * 100));
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="relative grid h-40 w-40 place-items-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="url(#scRing)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            animate={{
              strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100),
            }}
            transition={{ duration: 0.35 }}
          />
          <defs>
            <linearGradient id="scRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <motion.span
          className="absolute inset-3 rounded-full border border-cyan-300/25"
          animate={{ rotate: 360, scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className="absolute inset-6 rounded-full bg-cyan-400/10"
          animate={{ opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <div className="relative text-center">
          <div className="font-display text-3xl font-bold tabular-nums text-white">
            {secondsLeft}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
            Syncing copy
          </div>
          <div className="mt-0.5 max-w-[7.5rem] truncate text-[10px] text-white/70">
            {displayName(asset, assetType)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  slot,
  pick,
  lists,
  copied,
  canCopy,
  closedReason,
  animating,
  secondsLeft,
  onPick,
  onCopy,
}) {
  const name = displayName(pick.asset, pick.assetType);
  const pair = pairLabel(pick.asset, pick.assetType);
  const symbol = chartSymbol(pick.asset, pick.assetType);
  let actionLabel = "Ready to Copy";
  let tone = "ready";
  if (copied) {
    actionLabel = "Auto-Copying";
    tone = "live";
  } else if (animating) {
    actionLabel = "Syncing…";
    tone = "pending";
  } else if (closedReason) {
    actionLabel = closedReason;
    tone = "review";
  }

  return (
    <div
      className={`relative min-h-[250px] rounded-2xl border text-left shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:min-h-[290px] ${
        copied
          ? "border-emerald-300/40"
          : "border-white/15"
      }`}
      style={{
        background:
          "linear-gradient(180deg, rgba(18,24,36,0.55) 0%, rgba(8,10,16,0.72) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-black/25" />
        <SpotCopyChart
          key={`${slot}-${pick.asset}-${pick.assetType}`}
          symbol={symbol}
          seedPrice={seedPrice(pick.asset)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
      </div>

      {animating && (
        <CopySyncOverlay
          asset={pick.asset}
          assetType={pick.assetType}
          secondsLeft={secondsLeft}
        />
      )}

      <div className="relative z-10 flex h-full min-h-[250px] flex-col p-4 sm:min-h-[290px] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-wide text-white sm:text-lg">
              AI Prediction: {name}
            </div>
            <div className="mt-2">
              <CoinPicker
                asset={pick.asset}
                assetType={pick.assetType}
                lists={lists}
                onChange={onPick}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-white/80">
              AI Prediction Accuracy: {slot.accuracy}%
            </div>
            <div
              className={`mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full ${barTrack(slot.bar)}`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, slot.accuracy)}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${barColor(slot.bar)}`}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-14">
          <div className="space-y-0.5 text-[11px] leading-relaxed text-white/85 sm:text-xs">
            <div>
              <span className="text-white/50">Prediction:</span> {slot.prediction}
            </div>
            <div>
              <span className="text-white/50">Pair:</span> {pair}
            </div>
            <div>
              <span className="text-white/50">Followers:</span>{" "}
              {Number(slot.followers || 0).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-white/40" />
            <button
              type="button"
              disabled={!canCopy || animating}
              onClick={onCopy}
              className={`rounded-lg border px-2.5 py-1.5 text-center text-[10px] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-50 sm:text-[11px] ${
                tone === "live"
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                  : tone === "ready"
                    ? "border-white/20 bg-white/10 text-white"
                    : tone === "pending"
                      ? "border-orange-400/30 bg-orange-500/15 text-orange-100"
                      : "border-white/10 bg-black/40 text-white/55"
              }`}
            >
              <span className="block text-[9px] uppercase tracking-wider text-white/45">
                Action
              </span>
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SpotCopyTrade() {
  const [desk, setDesk] = useState(null);
  const [copies, setCopies] = useState([]);
  const [picks, setPicks] = useState(loadPicks);
  const [lists, setLists] = useState({
    crypto: WATCHLIST_CRYPTO,
    forex: FOREX_ASSETS,
    stock: STOCK_ASSETS,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [deskRes, txRes, mktRes] = await Promise.all([
        CopyBotAPI.desk(),
        WalletAPI.transactions().catch(() => ({ transactions: [] })),
        SecondsTradeAPI.markets().catch(() => ({ markets: [] })),
      ]);
      setDesk(deskRes.desk || null);
      setCopies(deskRes.copies || []);
      setHistory(txRes.transactions || []);
      const mk = mktRes.markets || [];
      const crypto = [
        ...new Set(
          mk.filter((x) => x.assetType === "crypto").map((x) => x.asset)
        ),
      ];
      const forex = [
        ...new Set(
          mk.filter((x) => x.assetType === "forex").map((x) => x.asset)
        ),
      ];
      const stock = [
        ...new Set(
          mk.filter((x) => x.assetType === "stock").map((x) => x.asset)
        ),
      ];
      setLists({
        crypto: crypto.length
          ? [...new Set([...crypto, ...WATCHLIST_CRYPTO])]
          : WATCHLIST_CRYPTO,
        forex: forex.length
          ? [...new Set([...forex, ...FOREX_ASSETS])]
          : FOREX_ASSETS,
        stock: stock.length
          ? [...new Set([...stock, ...STOCK_ASSETS])]
          : STOCK_ASSETS,
      });
    } catch (err) {
      setError(err?.message || "Failed to load Smart Copy Trade.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const slots = desk?.slots?.length ? desk.slots : SLOT_FALLBACK;
  const copiedSet = useMemo(
    () => new Set(copies.map((c) => Number(c.slot))),
    [copies]
  );
  const copiedCount = copiedSet.size;
  const maxSlots = Number(desk?.maxSlots || 1);
  const atLimit = copiedCount >= maxSlots;

  const pickFor = (slotMeta) => {
    const saved = picks[String(slotMeta.slot)];
    if (saved?.asset) return saved;
    const copy = copies.find((c) => Number(c.slot) === slotMeta.slot);
    if (copy?.selectedAsset) {
      return {
        asset: copy.selectedAsset,
        assetType: copy.selectedAssetType || "crypto",
      };
    }
    return {
      asset: slotMeta.defaultAsset || "BTC",
      assetType: slotMeta.defaultType || "crypto",
    };
  };

  const setPick = (slot, asset, assetType) => {
    setPicks((prev) => {
      const next = { ...prev, [String(slot)]: { asset, assetType } };
      savePicks(next);
      return next;
    });
  };

  const startCopy = async (slotMeta) => {
    if (syncing != null) return;
    const pick = pickFor(slotMeta);
    setSyncing(slotMeta.slot);
    setSecondsLeft(10);
    let left = 10;
    const tick = setInterval(() => {
      left -= 1;
      setSecondsLeft(Math.max(0, left));
    }, 1000);
    await new Promise((r) => setTimeout(r, 10000));
    clearInterval(tick);
    try {
      const res = await CopyBotAPI.copySlot({
        slot: slotMeta.slot,
        asset: pick.asset,
        assetType: pick.assetType,
        pair: pairLabel(pick.asset, pick.assetType),
      });
      setDesk(res.desk || desk);
      if (res.desk) {
        /* copies refreshed below */
      }
      await load();
    } catch (err) {
      setError(err?.message || "Copy failed.");
    } finally {
      setSyncing(null);
      setSecondsLeft(10);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Smart Copy Trade…
      </div>
    );
  }

  return (
    <div className="relative -mx-3 min-h-[calc(100vh-8rem)] overflow-hidden px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#07080d]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 42px",
          }}
        />
        <div className="absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl pb-10 pt-2">
        <h1 className="text-xl font-semibold tracking-[0.04em] text-white sm:text-2xl">
          SMART COPY TRADE
        </h1>
        <p className="mt-1 text-xs text-white/45">
          Pick any crypto, forex or stock on a block · Ready to Copy is admin-gated
          · you can activate {maxSlots} block{maxSlots > 1 ? "s" : ""}.
        </p>
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {slots.map((slotMeta) => {
            const pick = pickFor(slotMeta);
            const copied = copiedSet.has(slotMeta.slot);
            const animating = syncing === slotMeta.slot;
            const otherSync = syncing != null && syncing !== slotMeta.slot;
            let closedReason = "";
            if (copied) closedReason = "";
            else if (!slotMeta.isOpen) {
              closedReason = slotMeta.readyAt
                ? `Opens ${new Date(slotMeta.readyAt).toLocaleString()}`
                : "Closed";
            } else if (atLimit || otherSync) {
              closedReason = "Locked";
            }
            const canCopy =
              !copied &&
              slotMeta.isOpen &&
              !atLimit &&
              syncing == null;
            return (
              <SignalCard
                key={slotMeta.slot}
                slot={slotMeta}
                pick={pick}
                lists={lists}
                copied={copied}
                canCopy={canCopy}
                closedReason={closedReason}
                animating={animating}
                secondsLeft={secondsLeft}
                onPick={(asset, type) =>
                  setPick(slotMeta.slot, asset, type)
                }
                onCopy={() => startCopy(slotMeta)}
              />
            );
          })}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <History className="h-4 w-4 text-cyan-300" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Balance history
              </h2>
              <p className="text-[11px] text-white/40">
                One Trading Wallet · deposit, trade profit/loss, Smart Copy, AI
                Future Strategy — date & time.
              </p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/40">
              No history yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {history.slice(0, 40).map((tx) => {
                const delta =
                  typeof tx.ledgerDelta === "number"
                    ? Number(tx.ledgerDelta)
                    : tx.kind === "deposit"
                      ? Number(tx.amount)
                      : tx.kind === "withdrawal"
                        ? -Number(tx.amount)
                        : Number(tx.usdValue || tx.amount) *
                          (tx.side === "sell" ? -1 : 1);
                return (
                  <li
                    key={tx._id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white">
                        {sourceLabel(tx.source, tx.kind, tx.reviewerNote)}
                        {tx.symbol ? ` · ${tx.symbol}` : ""}
                      </div>
                      <div className="text-[11px] text-white/40">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString()
                          : "—"}
                        {tx.reviewerNote ? ` · ${tx.reviewerNote}` : ""}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-sm font-bold ${
                        delta > 0
                          ? "text-emerald-300"
                          : delta < 0
                            ? "text-rose-300"
                            : "text-white/60"
                      }`}
                    >
                      {fmtDelta(delta)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
