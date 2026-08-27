/**
 * One live tape for crypto + forex — same Binance spot feed the chart uses.
 * Stocks stay on the API rawPrice (no Binance pair).
 */
import { useEffect, useState } from "react";
import { toBinanceSymbol } from "./binanceMarket.js";

let cache = { at: 0, map: null };
const TTL_MS = 900;

export async function fetchLiveQuoteMap() {
  const now = Date.now();
  if (cache.map && now - cache.at < TTL_MS) return cache.map;
  const res = await fetch("https://api.binance.com/api/v3/ticker/price");
  if (!res.ok) {
    if (cache.map) return cache.map;
    throw new Error(`Quotes ${res.status}`);
  }
  const data = await res.json();
  const map = {};
  for (const row of Array.isArray(data) ? data : []) {
    const sym = String(row.symbol || "");
    const px = Number(row.price);
    if (!sym || !Number.isFinite(px) || px <= 0) continue;
    map[sym] = px;
  }
  cache = { at: now, map };
  return map;
}

export function tapePriceFromMap(map, asset, quote = "USDT", assetType = "crypto") {
  if (!map) return 0;
  if (assetType === "stock") return 0;
  const q = String(quote || "USDT").toUpperCase();
  const a = String(asset || "").toUpperCase();
  const pair = toBinanceSymbol(a, assetType === "forex" ? "USDT" : q);
  if (pair && map[pair] > 0) return map[pair];
  if (q === "USDC") {
    const usdt = toBinanceSymbol(a, "USDT");
    if (usdt && map[usdt] > 0) return map[usdt];
  }
  return 0;
}

/** Prefer live Binance tape, then API rawPrice, then biased price. */
export function resolveMarketPrice(m, map, quote = "USDT") {
  if (!m) return 0;
  const type = m.assetType || "crypto";
  const live = tapePriceFromMap(map, m.asset, quote, type);
  if (live > 0) return live;
  const raw = Number(m.rawPrice);
  if (raw > 0) return raw;
  if (quote === "USDC" && Number(m.quotes?.USDC) > 0) return Number(m.quotes.USDC);
  return Number(m.price) || 0;
}

export function useLiveQuoteMap(pollMs = 1500) {
  const [map, setMap] = useState(cache.map);
  useEffect(() => {
    let on = true;
    const tick = async () => {
      try {
        const next = await fetchLiveQuoteMap();
        if (on) setMap(next);
      } catch {
        /* keep last map */
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return map;
}
