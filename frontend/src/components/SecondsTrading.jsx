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
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

const DURATIONS = [60, 90, 120];
const CRYPTO = ["BTC", "ETH", "SOL", "BNB", "XRP"];
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

function LiveChart({ series, up }) {
  const w = 320;
  const h = 140;
  if (!series?.length) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-slate-500">
        Loading market…
      </div>
    );
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series
    .map((y, i) => {
      const x = (i / (series.length - 1 || 1)) * w;
      const py = h - ((y - min) / span) * (h - 16) - 8;
      return `${x},${py}`;
    })
    .join(" ");
  const stroke = up ? "#34d399" : "#fb7185";
  const fill = up ? "url(#upGrad)" : "url(#dnGrad)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[140px] w-full">
      <defs>
        <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={fill}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SecondsTrading({
  walletUsdt = 0,
  onWalletUpdate,
  onToast,
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
  const settling = useRef(new Set());

  const assets = assetType === "crypto" ? CRYPTO : STOCKS;

  const market = useMemo(
    () => markets.find((m) => m.asset === asset),
    [markets, asset]
  );
  const price = market?.price || 0;
  const activeForAsset = active.find((t) => t.asset === asset);
  const prev = series.length > 1 ? series[series.length - 2] : price;
  // While a trade is open, color chart vs entry so Graph UP/Force WIN looks HIGH
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
        setSeries((s) => {
          const next = [...s, m.price];
          return next.slice(-48);
        });
      }
    } catch {
      /* ignore transient */
    }
  }, [asset]);

  const loadActive = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.active();
      setActive(res.trades || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    loadActive();
    const mId = setInterval(loadMarkets, 2000);
    const aId = setInterval(loadActive, 1500);
    const tId = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(mId);
      clearInterval(aId);
      clearInterval(tId);
    };
  }, [loadMarkets, loadActive]);

  useEffect(() => {
    setSeries([]);
  }, [asset]);

  // Auto-settle when countdown hits 0
  useEffect(() => {
    active.forEach(async (t) => {
      const rem = Math.max(
        0,
        Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000)
      );
      if (rem > 0 || settling.current.has(t._id)) return;
      settling.current.add(t._id);
      try {
        const res = await SecondsTradeAPI.settle(t._id, { exitPrice: price });
        if (res?.user?.wallet && onWalletUpdate) {
          onWalletUpdate(res.user);
        }
        onToast?.(
          res.trade?.status === "won" ? "success" : "error",
          res.trade?.status === "won"
            ? `Won +$${formatUsd(res.trade.payout - res.trade.stake)}`
            : `Lost $${formatUsd(res.trade.stake)}`
        );
        await loadActive();
      } catch {
        /* settler on server will catch */
      } finally {
        settling.current.delete(t._id);
      }
    });
  }, [active, now, price, onWalletUpdate, onToast, loadActive]);

  const effectiveDuration = useMemo(() => {
    const c = Number(customDur);
    if (Number.isFinite(c) && c >= 10) return Math.min(3600, Math.floor(c));
    return duration;
  }, [customDur, duration]);

  const place = async (direction) => {
    const amount = Number(Number(stake).toFixed(8));
    const available = Number(Number(walletUsdt).toFixed(8));
    if (!Number.isFinite(amount) || amount <= 0) {
      onToast?.("error", "Enter a valid stake.");
      return;
    }
    // Allow full wallet amount (float-safe)
    if (amount > available + 1e-8) {
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
      {/* Trading wallet strip */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
          Trading Wallet
        </div>
        <div className="mt-1 flex items-end justify-between">
          <div
            className={`text-2xl font-bold tracking-tight ${
              Number(walletUsdt) < 0 ? "text-rose-400" : "text-white"
            }`}
          >
            {Number(walletUsdt) < 0 ? "-" : ""}$
            {formatUsd(Math.abs(Number(walletUsdt) || 0))}
            <span className="ml-1 text-sm font-medium text-slate-400">
              USDT
            </span>
          </div>
          <Sparkles className="h-4 w-4 text-cyan-400/70" />
        </div>
      </div>

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

      {/* Asset chips */}
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

      {/* Chart + price */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424]">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <div className="text-xs text-slate-400">{asset}/USDT</div>
            <div
              className={`text-xl font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}
            >
              {formatPrice(price)}
            </div>
          </div>
        </div>
        <LiveChart series={series.length ? series : [price, price]} up={up} />
      </div>

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
          min={1}
          step="1"
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
            onClick={() =>
              setStake(
                String(
                  Math.max(0, Number(Number(walletUsdt).toFixed(2)))
                )
              )
            }
            className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300"
          >
            Max
          </button>
        </div>
      </div>

      {/* Long / Short */}
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
