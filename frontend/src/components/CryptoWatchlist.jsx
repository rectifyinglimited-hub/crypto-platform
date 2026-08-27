/**
 * Market watchlist — live Binance tape (same feed as the trade chart).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";
import { resolveMarketPrice, useLiveQuoteMap } from "../lib/liveQuotes.js";

/** Fallback if markets API is empty — kept for SecondsTrading import compat */
export const WATCHLIST_CRYPTO = [
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "SHIB", "LTC", "BNB",
  "AVAX", "LINK", "UNI", "ATOM", "NEAR", "APT", "ARB", "OP", "SUI", "TON",
  "TRX", "ICP", "FIL", "AAVE", "MKR", "CRV", "SAND", "MANA", "AXS", "GALA",
  "PEPE", "WIF", "BONK", "FLOKI", "INJ", "SEI", "TIA", "RENDER", "FET", "IMX",
];

function formatPx(price) {
  if (!(price > 0)) return "—";
  if (price >= 1000)
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return price.toPrecision(4);
}

function WatchRow({ asset, quote = "USDT", price, flash, onSelect, assetType }) {
  const up = flash === "up";
  const down = flash === "down";
  const pair =
    assetType === "forex" && String(asset).length >= 6
      ? `${String(asset).slice(0, 3)}/${String(asset).slice(3)}`
      : assetType === "stock"
        ? `${asset}/USD`
        : `${asset}/${quote}`;
  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.(asset);
        window.dispatchEvent(
          new CustomEvent("nexus:select-asset", {
            detail: { asset, assetType: assetType || "crypto", quote },
          })
        );
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.04] ${
        up ? "bg-emerald-500/10" : down ? "bg-rose-500/10" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white">{pair}</div>
        <div className="text-[10px] text-slate-500">{quote}</div>
      </div>
      <div
        className={`font-mono text-xs tabular-nums ${
          up ? "text-emerald-300" : down ? "text-rose-300" : "text-cyan-200"
        }`}
      >
        {formatPx(price)}
      </div>
    </button>
  );
}

export default function CryptoWatchlist({ onSelectAsset }) {
  const [markets, setMarkets] = useState([]);
  const [quote, setQuote] = useState("USDT");
  const [query, setQuery] = useState("");
  const [flashes, setFlashes] = useState({});
  const prevPrices = useRef({});
  const flashTimers = useRef({});
  const quoteMap = useLiveQuoteMap(1500);

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
      const list = res.markets || [];
      setQuote(res.chartQuote === "USDC" ? "USDC" : "USDT");
      setMarkets(list);
    } catch {
      /* ignore transient */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => {
      clearInterval(id);
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [load]);

  const rows = useMemo(() => {
    const seen = new Set();
    const next = [];
    for (const m of markets) {
      const key = `${m.assetType}-${m.asset}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const q = m.assetType === "crypto" ? quote : "USD";
      next.push({
        asset: m.asset,
        quote: q,
        assetType: m.assetType || "crypto",
        price: resolveMarketPrice(m, quoteMap, q),
      });
    }
    return next;
  }, [markets, quoteMap, quote]);

  useEffect(() => {
    for (const row of rows) {
      const key = `${row.assetType}-${row.asset}`;
      const prev = prevPrices.current[key];
      if (prev != null && row.price !== prev && row.price > 0) {
        tickFlash(key, row.price > prev ? "up" : "down");
      }
      prevPrices.current[key] = row.price;
    }
  }, [rows, tickFlash]);

  const filtered = query.trim()
    ? rows.filter(
        (r) =>
          r.asset.toLowerCase().includes(query.trim().toLowerCase()) ||
          String(r.quote).toLowerCase().includes(query.trim().toLowerCase())
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
              key={`${r.assetType}-${r.asset}-${r.quote}`}
              asset={r.asset}
              quote={r.quote}
              assetType={r.assetType}
              price={r.price}
              flash={flashes[`${r.assetType}-${r.asset}`]}
              onSelect={onSelectAsset}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
