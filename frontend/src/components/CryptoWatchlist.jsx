/**
 * Multi-asset crypto watchlist — 50+ pairs with per-second green/red flash ticks.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Search, TrendingDown, TrendingUp } from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

export const WATCHLIST_CRYPTO = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "DOT",
  "SHIB",
  "LTC",
  "BNB",
  "AVAX",
  "LINK",
  "UNI",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "SUI",
  "TON",
  "TRX",
  "ICP",
  "FIL",
  "AAVE",
  "MKR",
  "CRV",
  "SAND",
  "MANA",
  "AXS",
  "GALA",
  "PEPE",
  "WIF",
  "BONK",
  "FLOKI",
  "INJ",
  "SEI",
  "TIA",
  "RENDER",
  "FET",
  "IMX",
  "STX",
  "ALGO",
  "XLM",
  "VET",
  "HBAR",
  "RUNE",
  "FTM",
  "EGLD",
  "THETA",
  "FLOW",
  "GRT",
  "LDO",
  "ENS",
  "APE",
  "CHZ",
];

const NAMES = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  SHIB: "Shiba Inu",
  LTC: "Litecoin",
  BNB: "BNB",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  NEAR: "NEAR",
  APT: "Aptos",
  ARB: "Arbitrum",
  OP: "Optimism",
  SUI: "Sui",
  TON: "Toncoin",
  TRX: "TRON",
  ICP: "Internet Computer",
  FIL: "Filecoin",
  AAVE: "Aave",
  MKR: "Maker",
  CRV: "Curve",
  SAND: "The Sandbox",
  MANA: "Decentraland",
  AXS: "Axie Infinity",
  GALA: "Gala",
  PEPE: "Pepe",
  WIF: "dogwifhat",
  BONK: "Bonk",
  FLOKI: "FLOKI",
  INJ: "Injective",
  SEI: "Sei",
  TIA: "Celestia",
  RENDER: "Render",
  FET: "Fetch.ai",
  IMX: "Immutable",
  STX: "Stacks",
  ALGO: "Algorand",
  XLM: "Stellar",
  VET: "VeChain",
  HBAR: "Hedera",
  RUNE: "THORChain",
  FTM: "Fantom",
  EGLD: "MultiversX",
  THETA: "Theta",
  FLOW: "Flow",
  GRT: "The Graph",
  LDO: "Lido",
  ENS: "ENS",
  APE: "ApeCoin",
  CHZ: "Chiliz",
};

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
}

function WatchRow({ asset, price, flash, onSelect }) {
  const flashCls =
    flash === "up"
      ? "bg-emerald-500/25 ring-1 ring-emerald-400/40"
      : flash === "down"
        ? "bg-rose-500/25 ring-1 ring-rose-400/40"
        : "bg-transparent ring-1 ring-transparent";

  const priceCls =
    flash === "up"
      ? "text-emerald-300"
      : flash === "down"
        ? "text-rose-300"
        : "text-slate-100";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(asset)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 ${flashCls}`}
    >
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-[10px] font-bold text-cyan-200">
        {asset.slice(0, 3)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-100">{asset}</div>
        <div className="truncate text-[10px] text-slate-500">
          {NAMES[asset] || asset}/USDT
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-mono text-xs font-semibold tabular-nums transition-colors duration-300 ${priceCls}`}
        >
          ${formatPrice(price)}
        </div>
        <div className="mt-0.5 flex justify-end">
          {flash === "up" ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : flash === "down" ? (
            <TrendingDown className="h-3 w-3 text-rose-400" />
          ) : (
            <Activity className="h-3 w-3 text-slate-600" />
          )}
        </div>
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
      // Ensure watchlist order / fill gaps with prior values
      const byAsset = Object.fromEntries(list.map((m) => [m.asset, m.price]));
      const next = WATCHLIST_CRYPTO.map((asset) => ({
        asset,
        price: byAsset[asset] ?? prevPrices.current[asset] ?? 0,
      })).filter((r) => r.price > 0 || byAsset[r.asset] != null);

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
    const id = setInterval(load, 1000);
    return () => {
      clearInterval(id);
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [load]);

  const filtered = query.trim()
    ? rows.filter(
        (r) =>
          r.asset.toLowerCase().includes(query.trim().toLowerCase()) ||
          (NAMES[r.asset] || "")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
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
            {WATCHLIST_CRYPTO.length}+ pairs · live ticks / 1s
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
