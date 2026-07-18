/**
 * Seconds Trading — mobile-first fixed-time trade panel.
 * Live markets from backend (Binance + admin bias), countdown, Long/Short.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Timer,
  Loader2,
  Sparkles,
  Ban,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";
import { onSocketEvent } from "../lib/socket.js";
import { WATCHLIST_CRYPTO } from "./CryptoWatchlist.jsx";
import FuturesChart from "./FuturesChart.jsx";

const TOASTED_KEY = "nexus_toasted_trades";
const TRADING_SOON_MSG = "Trading will start soon";

/** Normalize settlement status — never treat WIN/WON as a loss toast. */
function normalizeTradeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

/**
 * WIN detection must match Market Activity "WIN" flag.
 * Checks status / outcome first; never classify a win document as a loss.
 */
function isTradeWon(trade) {
  if (!trade) return false;
  const s = normalizeTradeStatus(trade.status);
  const outcome = normalizeTradeStatus(
    trade.outcome ?? trade.result ?? trade.settleResult
  );
  if (
    s === "won" ||
    s === "win" ||
    s === "winnings" ||
    outcome === "won" ||
    outcome === "win" ||
    outcome === "winnings"
  ) {
    return true;
  }
  // Defensive: payout credit on a settled trade with non-loss status
  if (
    s !== "lost" &&
    s !== "loss" &&
    s !== "lose" &&
    s !== "cancelled" &&
    s !== "open" &&
    s !== "settling" &&
    Number(trade.payout || 0) > Number(trade.stake || 0)
  ) {
    return true;
  }
  return false;
}

function isTradeLost(trade) {
  // CRITICAL: wins always win — never fall through to a red Lost toast
  if (!trade || isTradeWon(trade)) return false;
  const s = normalizeTradeStatus(trade.status);
  const outcome = normalizeTradeStatus(
    trade.outcome ?? trade.result ?? trade.settleResult
  );
  if (
    outcome === "won" ||
    outcome === "win" ||
    outcome === "winnings"
  ) {
    return false;
  }
  return (
    s === "lost" ||
    s === "loss" ||
    s === "lose" ||
    outcome === "lost" ||
    outcome === "loss" ||
    outcome === "lose"
  );
}

function winProfit(trade) {
  const stake = Number(trade?.stake || 0);
  const payout = Number(trade?.payout || 0);
  return Math.max(0, payout - stake);
}

function loadToastedSet() {
  try {
    const raw = sessionStorage.getItem(TOASTED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistToasted(set) {
  try {
    sessionStorage.setItem(TOASTED_KEY, JSON.stringify([...set].slice(-80)));
  } catch {
    /* ignore */
  }
}

const DURATIONS = [60, 90, 120];
const CRYPTO = WATCHLIST_CRYPTO;
const STOCKS = ["AAPL", "TSLA", "AMZN", "NVDA", "GOOGL"];

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function formatUsd(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `-${abs}` : abs;
}

/** Exact stakeable balance — never round UP past wallet */
function stakeableUsdt(walletUsdt) {
  const n = Number(walletUsdt);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Number(n.toFixed(8));
}

export default function SecondsTrading({
  walletUsdt = 0,
  onWalletUpdate,
  onToast,
  tradingSuspended = false,
}) {
  const [assetType, setAssetType] = useState("crypto");
  const [asset, setAsset] = useState("BTC");
  const [markets, setMarkets] = useState([]);
  const [series, setSeries] = useState([]);
  const [duration, setDuration] = useState(60);
  const [customDur, setCustomDur] = useState("");
  const [stake, setStake] = useState("50");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [priceFlash, setPriceFlash] = useState(null); // "up" | "down" | null
  const [liveEarnings, setLiveEarnings] = useState(0);
  const settling = useRef(new Set());
  const toasted = useRef(loadToastedSet());
  const displayPrice = useRef(null);
  const targetPrice = useRef(null);
  const lastTickPrice = useRef(null);
  const flashTimer = useRef(null);

  const assets = assetType === "crypto" ? CRYPTO : STOCKS;

  const market = useMemo(
    () => markets.find((m) => m.asset === asset),
    [markets, asset]
  );
  const rawPrice = market?.price || 0;
  // Chart header uses smoothed series so Graph UP/DOWN never looks like a jump
  const price = series.length ? series[series.length - 1] : rawPrice;
  const activeForAsset = active.find((t) => t.asset === asset);
  const prev = series.length > 1 ? series[series.length - 2] : price;
  // While a trade is open, color chart vs entry so Graph HIGH looks UP / LOW looks DOWN
  const up = activeForAsset
    ? price >= Number(activeForAsset.entryPrice || price)
    : price >= prev;

  const loadMarkets = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.markets();
      const list = res.markets || [];
      setMarkets(list);
      const m = list.find((x) => x.asset === asset);
      if (m?.price) {
        targetPrice.current = m.price;
        if (displayPrice.current == null) displayPrice.current = m.price;
      }
    } catch {
      /* ignore transient */
    }
  }, [asset]);

  // Smooth candle drift toward live (biased) price — Graph UP/DOWN never spikes
  useEffect(() => {
    const id = setInterval(() => {
      if (targetPrice.current == null) return;
      if (displayPrice.current == null) {
        displayPrice.current = targetPrice.current;
      } else {
        const cur = displayPrice.current;
        const tgt = targetPrice.current;
        const gap = tgt - cur;
        const absGap = Math.abs(gap);
        if (absGap < Math.abs(tgt) * 1e-8 || absGap < 1e-10) {
          // Gentle micro-fluctuation around target (natural candles)
          const noise = tgt * (Math.random() - 0.5) * 0.0001;
          displayPrice.current = tgt + noise;
        } else {
          // Cap step so admin bias ramps look gradual (~0.025–0.04% of price / tick)
          const ease = 0.04 + Math.random() * 0.03;
          const maxStep = Math.max(
            Math.abs(tgt) * 0.00028,
            absGap * 0.015
          );
          const step = Math.sign(gap) * Math.min(absGap * ease, maxStep);
          displayPrice.current = cur + step;
        }
      }
      const p = displayPrice.current;
      setSeries((s) => {
        const next = [...s, p];
        return next.slice(-64);
      });
    }, 200);
    return () => clearInterval(id);
  }, [asset]);

  const loadActive = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.active();
      setActive(res.trades || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadLiveEarnings = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.history();
      const trades = res.trades || [];
      let total = 0;
      for (const t of trades) {
        if (isTradeWon(t)) total += winProfit(t);
      }
      // Prefer server totals when present (wins-only profit sum)
      if (typeof res.totals?.profit === "number") {
        setLiveEarnings(res.totals.profit);
      } else {
        setLiveEarnings(total);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    loadActive();
    loadLiveEarnings();
    const mId = setInterval(loadMarkets, 1000);
    const aId = setInterval(loadActive, 1500);
    const eId = setInterval(loadLiveEarnings, 4000);
    const tId = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(mId);
      clearInterval(aId);
      clearInterval(eId);
      clearInterval(tId);
    };
  }, [loadMarkets, loadActive, loadLiveEarnings]);

  // Post-trade resync — snap chart/ticker back to live public feed at settle
  useEffect(() => {
    const off = onSocketEvent("chart:resync", (payload) => {
      const assetKey = String(payload?.asset || "").toUpperCase();
      if (assetKey && assetKey !== String(asset).toUpperCase()) return;
      const exit = Number(payload?.exitPrice);
      displayPrice.current = null;
      targetPrice.current = Number.isFinite(exit) && exit > 0 ? exit : null;
      loadMarkets();
      loadActive();
      loadLiveEarnings();
    });
    return off;
  }, [asset, loadMarkets, loadActive, loadLiveEarnings]);

  useEffect(() => {
    setSeries([]);
    displayPrice.current = null;
    targetPrice.current = null;
    lastTickPrice.current = null;
    setPriceFlash(null);
  }, [asset]);

  // Flash green/red on every second tick when the selected pair moves
  useEffect(() => {
    if (!rawPrice) return;
    const prev = lastTickPrice.current;
    if (prev != null && rawPrice !== prev) {
      const dir = rawPrice > prev ? "up" : "down";
      setPriceFlash(dir);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setPriceFlash(null), 650);
    }
    lastTickPrice.current = rawPrice;
  }, [rawPrice]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  // Watchlist / external asset pick
  useEffect(() => {
    const onSelect = (e) => {
      const next = e?.detail?.asset;
      const type = e?.detail?.assetType || "crypto";
      if (!next) return;
      setAssetType(type);
      setAsset(String(next).toUpperCase());
    };
    window.addEventListener("nexus:select-asset", onSelect);
    return () => window.removeEventListener("nexus:select-asset", onSelect);
  }, []);

  // Auto-settle only when timer has fully elapsed (never early)
  useEffect(() => {
    active.forEach(async (t) => {
      const expiresAt = new Date(t.expiresAt).getTime();
      if (Date.now() < expiresAt || settling.current.has(t._id)) return;
      settling.current.add(t._id);
      try {
        let res = await SecondsTradeAPI.settle(t._id, { exitPrice: price });
        let trade = res?.trade;
        // If concurrent settler left status mid-flight, re-fetch until terminal
        for (let attempt = 0; attempt < 3; attempt++) {
          const st = normalizeTradeStatus(trade?.status);
          if (trade && st !== "settling" && st !== "open") break;
          await new Promise((r) => setTimeout(r, 400));
          res = await SecondsTradeAPI.settle(t._id, { exitPrice: price });
          trade = res?.trade;
        }
        if (res?.user?.wallet && onWalletUpdate) {
          onWalletUpdate(res.user);
        }
        if (trade && !toasted.current.has(t._id)) {
          // CRITICAL: WIN/WON → green success only. Never red Lost on wins.
          if (isTradeWon(trade)) {
            toasted.current.add(t._id);
            persistToasted(toasted.current);
            const profit = winProfit(trade);
            const amount = formatUsd(profit > 0 ? profit : Number(trade.payout || 0));
            onToast?.(
              "success",
              profit > 0 ? `Won $${amount}!` : `Profit: $${amount}`
            );
          } else if (isTradeLost(trade)) {
            toasted.current.add(t._id);
            persistToasted(toasted.current);
            onToast?.(
              "error",
              `Lost $${formatUsd(trade.lossAmount ?? trade.stake)}`
            );
          }
          // Non-terminal statuses: no toast (avoids false "Lost" on WIN)
        }
        await loadActive();
        await loadLiveEarnings();
      } catch {
        /* settler on server will catch */
      } finally {
        settling.current.delete(t._id);
      }
    });
  }, [active, now, price, onWalletUpdate, onToast, loadActive, loadLiveEarnings]);

  const effectiveDuration = useMemo(() => {
    const c = Number(customDur);
    if (Number.isFinite(c) && c >= 10) return Math.min(3600, Math.floor(c));
    return duration;
  }, [customDur, duration]);

  const place = async (direction) => {
    if (tradingSuspended) {
      window.alert(TRADING_SOON_MSG);
      onToast?.("error", TRADING_SOON_MSG);
      return;
    }
    const available = stakeableUsdt(walletUsdt);
    let amount = Number(stake);
    if (!Number.isFinite(amount) || amount <= 0) {
      onToast?.("error", "Enter a valid stake.");
      return;
    }
    amount = Number(amount.toFixed(8));
    // Full balance: clamp near-max / rounded UI values to exact wallet
    if (amount >= available - 0.02 || amount > available) {
      if (amount <= available + 0.05) amount = available;
    }
    if (amount > available + 1e-8) {
      onToast?.("error", "Insufficient Trading Wallet balance.");
      return;
    }
    if (amount <= 0) {
      onToast?.("error", "Insufficient Trading Wallet balance.");
      return;
    }
    setBusy(true);
    try {
      const res = await SecondsTradeAPI.open({
        asset,
        direction,
        stake: amount,
        durationSec: effectiveDuration,
        entryPrice: price,
      });
      if (res?.user && onWalletUpdate) onWalletUpdate(res.user);
      onToast?.(
        "success",
        `${direction === "long" ? "Buy Long" : "Sell Short"} · ${asset} · ${effectiveDuration}s`
      );
      await loadActive();
    } catch (err) {
      onToast?.("error", err?.message || "Trade failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Trading wallet + Live Earnings */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
            Trading Wallet
          </div>
          <div className="mt-1 flex items-end justify-between gap-1">
            <div
              className={`text-xl font-bold tracking-tight tabular-nums ${
                Number(walletUsdt) < 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {Number(walletUsdt) < 0 ? "-" : ""}$
              {formatUsd(Math.abs(Number(walletUsdt) || 0))}
            </div>
            <Sparkles className="mb-1 h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">USDT</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/90">
            Live Earnings
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight tabular-nums text-emerald-300">
            ${formatUsd(liveEarnings)}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            Settled WIN profits
          </div>
        </div>
      </div>

      {tradingSuspended && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <div className="text-sm font-semibold text-amber-100">
              {TRADING_SOON_MSG}
            </div>
            <p className="mt-0.5 text-[11px] text-amber-200/70">
              Buy Long and Sell Short are temporarily unavailable.
            </p>
          </div>
        </div>
      )}

      {/* Asset type */}
      <div className="flex gap-2 rounded-xl bg-white/5 p-1">
        {["crypto", "stock"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setAssetType(t);
              setAsset(t === "crypto" ? "BTC" : "AAPL");
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wide ${
              assetType === t
                ? "bg-white/10 text-white"
                : "text-slate-400"
            }`}
          >
            {t === "crypto" ? "Crypto" : "Stocks"}
          </button>
        ))}
      </div>

      {/* Asset chips — scrollable 50+ crypto pairs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {assets.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAsset(a)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              asset === a
                ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                : "bg-white/5 text-slate-400"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Binance Futures–style TradingView chart */}
      <FuturesChart
        asset={asset}
        assetType={assetType}
        overridePrice={price || rawPrice || null}
      />

      {/* Duration */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Duration
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDuration(d);
                setCustomDur("");
              }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                !customDur && duration === d
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              {d}s
            </button>
          ))}
          <input
            type="number"
            min={10}
            max={3600}
            placeholder="Custom s"
            value={customDur}
            onChange={(e) => setCustomDur(e.target.value)}
            className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/40"
          />
        </div>
      </div>

      {/* Stake */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Stake (USDT)
        </div>
        <input
          type="number"
          min={0}
          step="any"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/40"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {[25, 50, 100, 250].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setStake(String(q))}
              className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-slate-400"
            >
              ${q}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const max = stakeableUsdt(walletUsdt);
              setStake(max > 0 ? String(max) : "0");
            }}
            className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300"
          >
            Max
          </button>
        </div>
      </div>

      {/* Long / Short */}
      {tradingSuspended ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {["Buy Long", "Sell Short"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                window.alert(TRADING_SOON_MSG);
                onToast?.("error", TRADING_SOON_MSG);
              }}
              className="flex cursor-not-allowed flex-col items-center justify-center gap-1 rounded-2xl bg-slate-700/80 px-3 py-3.5 text-center text-xs font-bold text-slate-400 ring-1 ring-white/10 opacity-80 sm:text-sm"
              aria-label={`${label} disabled — ${TRADING_SOON_MSG}`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 line-through">
                {label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5 shrink-0" />
                {TRADING_SOON_MSG}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => place("long")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-emerald-950 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            Buy Long
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => place("short")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-sm font-bold text-rose-950 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            Sell Short
          </button>
        </div>
      )}

      {/* Dynamic close-soon banner */}
      <AnimatePresence>
        {active.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
          >
            {active.map((t) => {
              const rem = Math.max(
                0,
                Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000)
              );
              return (
                <div
                  key={`banner-${t._id}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-amber-100">
                    Trade will close in{" "}
                    <span className="font-mono font-bold text-amber-300">
                      {rem} seconds
                    </span>
                  </span>
                  <span className="text-xs text-amber-200/70">
                    {t.asset} {t.direction === "long" ? "LONG" : "SHORT"}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active countdowns */}
      <AnimatePresence>
        {active.map((t) => {
          const rem = Math.max(
            0,
            Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000)
          );
          const pct = Math.min(
            100,
            ((t.durationSec - rem) / t.durationSec) * 100
          );
          return (
            <motion.div
              key={t._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold">
                    {t.asset} · {t.direction === "long" ? "LONG" : "SHORT"}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-cyan-300">
                  {rem}s
                </div>
              </div>
              <div className="mt-1 text-[11px] font-medium text-amber-300/90">
                Trade will close in {rem} seconds
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Stake ${formatUsd(t.stake)} · Entry {formatPrice(t.entryPrice)}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
