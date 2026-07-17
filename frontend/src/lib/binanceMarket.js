/**
 * Binance public market helpers — klines, 24h ticker, realtime streams.
 */

const REST = "https://api.binance.com";
const WS = "wss://stream.binance.com:9443";

export const CHART_TIMEFRAMES = [
  { key: "1s", label: "1s", interval: "1s", limit: 300 },
  { key: "1m", label: "1m", interval: "1m", limit: 500 },
  { key: "5m", label: "5m", interval: "5m", limit: 500 },
  { key: "15m", label: "15m", interval: "15m", limit: 500 },
  { key: "1h", label: "1h", interval: "1h", limit: 500 },
  { key: "4h", label: "4h", interval: "4h", limit: 500 },
  { key: "1d", label: "1d", interval: "1d", limit: 365 },
];

export function toBinanceSymbol(asset) {
  const a = String(asset || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!a) return null;
  if (a.endsWith("USDT")) return a;
  return `${a}USDT`;
}

export function intervalMs(interval) {
  const map = {
    "1s": 1000,
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
  };
  return map[interval] || 60_000;
}

/** Binance kline row → candle + volume */
export function parseKlineRow(row) {
  const openTime = Number(row[0]);
  const open = Number(row[1]);
  const high = Number(row[2]);
  const low = Number(row[3]);
  const close = Number(row[4]);
  const volume = Number(row[5]);
  const time = Math.floor(openTime / 1000);
  return {
    time,
    open,
    high,
    low,
    close,
    volume,
  };
}

export async function fetchKlines(symbol, interval, limit = 500) {
  const url = `${REST}/api/v3/klines?symbol=${encodeURIComponent(
    symbol
  )}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Klines ${res.status}`);
  const rows = await res.json();
  return (Array.isArray(rows) ? rows : []).map(parseKlineRow);
}

export async function fetchTicker24h(symbol) {
  const url = `${REST}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticker ${res.status}`);
  const t = await res.json();
  return {
    symbol: t.symbol,
    lastPrice: Number(t.lastPrice),
    priceChange: Number(t.priceChange),
    priceChangePercent: Number(t.priceChangePercent),
    highPrice: Number(t.highPrice),
    lowPrice: Number(t.lowPrice),
    volume: Number(t.volume),
    quoteVolume: Number(t.quoteVolume),
  };
}

export function smaSeries(candles, period, valueOf = (c) => c.close) {
  const out = [];
  if (!candles?.length || period < 1) return out;
  let sum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    sum += valueOf(candles[i]);
    if (i >= period) sum -= valueOf(candles[i - period]);
    if (i >= period - 1) {
      out.push({ time: candles[i].time, value: sum / period });
    }
  }
  return out;
}

export function toVolumeBars(candles) {
  return candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color:
      c.close >= c.open
        ? "rgba(14, 203, 129, 0.72)"
        : "rgba(246, 70, 93, 0.72)",
  }));
}

/**
 * Apply a live trade/ticker price onto the active (last) candle OHLC + volume bump.
 */
export function applyTickToCandle(candle, price, volumeDelta = 0) {
  if (!candle || !Number.isFinite(price)) return candle;
  const open = candle.open;
  const high = Math.max(candle.high, price);
  const low = Math.min(candle.low, price);
  return {
    ...candle,
    high,
    low,
    close: price,
    volume: Math.max(0, Number(candle.volume || 0) + volumeDelta),
    open,
  };
}

/**
 * Open a combined Binance stream for kline + 24h ticker.
 * Returns a cleanup function.
 */
export function subscribeBinanceMarket({
  symbol,
  interval,
  onKline,
  onTicker,
  onStatus,
}) {
  const sym = String(symbol).toLowerCase();
  const streams = [`${sym}@kline_${interval}`, `${sym}@ticker`];
  const url = `${WS}/stream?streams=${streams.join("/")}`;
  let ws = null;
  let closed = false;
  let retryTimer = null;
  let retryMs = 1000;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(url);
    } catch {
      onStatus?.(false);
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      retryMs = 1000;
      onStatus?.(true);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const payload = msg?.data || msg;
        const stream = String(msg?.stream || "");
        if (stream.includes("@kline_") || payload?.e === "kline") {
          const k = payload.k;
          if (!k) return;
          onKline?.({
            time: Math.floor(Number(k.t) / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
            closed: Boolean(k.x),
          });
        } else if (stream.includes("@ticker") || payload?.e === "24hrTicker") {
          onTicker?.({
            lastPrice: Number(payload.c),
            priceChange: Number(payload.p),
            priceChangePercent: Number(payload.P),
            highPrice: Number(payload.h),
            lowPrice: Number(payload.l),
            volume: Number(payload.v),
            quoteVolume: Number(payload.q),
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      onStatus?.(false);
    };

    ws.onclose = () => {
      onStatus?.(false);
      if (!closed) scheduleRetry();
    };
  };

  const scheduleRetry = () => {
    if (closed || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      retryMs = Math.min(retryMs * 1.6, 12_000);
      connect();
    }, retryMs);
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    try {
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    } catch {
      /* ignore */
    }
    ws = null;
  };
}

/** Build synthetic candles from a live price poll (stocks / fallback). */
export function synthCandleFromPrice(prev, price, bucketSec, nowSec) {
  const bucket = Math.floor(nowSec / bucketSec) * bucketSec;
  if (!prev || prev.time !== bucket) {
    const open = Number.isFinite(prev?.close) ? prev.close : price;
    return {
      time: bucket,
      open,
      high: Math.max(open, price),
      low: Math.min(open, price),
      close: price,
      volume: Math.abs(price - open) * 12 + Math.random() * 8,
    };
  }
  return applyTickToCandle(
    prev,
    price,
    Math.abs(price - prev.close) * 4 + Math.random() * 2
  );
}
