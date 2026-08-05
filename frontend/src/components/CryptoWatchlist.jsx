/**
 * Multi-asset crypto watchlist — loads live markets from API (400+ pairs).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

/** Fallback if markets API is empty — kept for SecondsTrading import compat */
export const WATCHLIST_CRYPTO = [
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "SHIB", "LTC", "BNB",
  "AVAX", "LINK", "UNI", "ATOM", "NEAR", "APT", "ARB", "OP", "SUI", "TON",
  "TRX", "ICP", "FIL", "AAVE", "MKR", "CRV", "SAND", "MANA", "AXS", "GALA",
  "PEPE", "WIF", "BONK", "FLOKI", "INJ", "SEI", "TIA", "RENDER", "FET", "IMX",
];

function WatchRow({ asset, price, flash, onSelect }) {
  const up = flash === "up";
  const down = flash === "down";
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.(asset);
        window.dispatchEvent(
          new CustomEvent("nexus:select-asset", {
            detail: { asset, assetType: "crypto" },
          })
        );
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.04] ${
        up ? "bg-emerald-500/10" : down ? "bg-rose-500/10" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white">{asset}</div>
        <div className="text-[10px] text-slate-500">USDT</div>
      </div>
      <div
        className={`font-mono text-xs tabular-nums ${
          up ? "text-emerald-300" : down ? "text-rose-300" : "text-slate-200"
        }`}
      >
        {price > 0
          ? price >= 1
            ? price.toLocaleString(undefined, { maximumFractionDigits: 4 })
            : price.toPrecision(4)
          : "—"}
      </div>
    </button>
  );
}

export default function CryptoWatchlist({ onSelectAsset }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [flashes, setFlashes] = useState({});
  const prevPrices = useRef({});
  const flashTimers = useRef({});

  const tickFlash = useCallback((asset, dir) => {
    setFlashes((f) => ({ ...f, [asset]: dir }));
    if (flashTimers.current[asset]) clearTimeout(flashTimers.current[asset]);
    flashTimers.current[asset] = setTimeout(() => {
      setFlashes((f) => {
        if (f[asset] !== dir) return f;
        const next = { ...f };
        delete next[asset];
        return next;
      });
    }, 650);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.markets();
      const list = (res.markets || []).filter((m) => m.assetType === "crypto");
      const next = list.map((m) => ({
        asset: m.asset,
        price: Number(m.price) || 0,
      }));

      for (const row of next) {
        const prev = prevPrices.current[row.asset];
        if (prev != null && row.price !== prev) {
          tickFlash(row.asset, row.price > prev ? "up" : "down");
        }
        prevPrices.current[row.asset] = row.price;
      }
      setRows(next);
    } catch {
      /* ignore transient */
    }
  }, [tickFlash]);

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => {
      clearInterval(id);
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [load]);

  const filtered = query.trim()
    ? rows.filter((r) =>
        r.asset.toLowerCase().includes(query.trim().toLowerCase())
      )
    : rows;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
            Market Watchlist
          </div>
          <div className="text-xs text-slate-500">
            {rows.length || "…"} pairs · live ticks
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="w-28 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-7 pr-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/40"
          />
        </div>
      </div>

      <div className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto px-1 py-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            Loading markets…
          </div>
        ) : (
          filtered.map((r) => (
            <WatchRow
              key={r.asset}
              asset={r.asset}
              price={r.price}
              flash={flashes[r.asset]}
              onSelect={onSelectAsset}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
