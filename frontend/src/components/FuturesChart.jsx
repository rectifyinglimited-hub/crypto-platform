/**
 * Binance Futures–style TradingView Lightweight Charts terminal.
 *
 * Hard rules that stop canvas compression:
 * 1. History seeded once via setData(); live path uses update() only.
 * 2. Exchange OHLC lives in marketCandlesRef — never mutated by admin bias.
 * 3. Bias only nudges the *display* last bar close (clamped); high/low never
 *    stick at a fake peak after bias resets (that was the 68k spike bug).
 * 4. Visible time window is set once after seed — never fitContent / never
 *    reset on pan, zoom, tick, or resize.
 */

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
} from "lightweight-charts";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import {
  CHART_TIMEFRAMES,
  fetchKlines,
  fetchTicker24h,
  intervalMs,
  smaSeries,
  subscribeBinanceMarket,
  synthCandleFromPrice,
  toBinanceSymbol,
  toUnixSeconds,
  toVolumeBars,
} from "../lib/binanceMarket.js";

const UP = "#0ecb81";
const DOWN = "#f6465d";
const BG = "#0b0e11";
const GRID = "rgba(255, 255, 255, 0.06)";
const TEXT = "#848e9c";

const BAR_SPACING = 8;
const RIGHT_OFFSET = 12;
/** Idle nudge cap — Force Win/Lose peak on server is ~1.6% */
const MAX_BIAS_PCT = 0.025;
/** Open-trade cap — enough for user to see win/loss vs entry without 68k spikes */
const MAX_BIAS_PCT_TRADE = 0.045;

function visibleBarsForTf(tfKey) {
  // 15d / 1d daily candles — show a clean ~15 trading-day window by default
  if (tfKey === "15d" || tfKey === "1d") return 15;
  if (tfKey === "4h") return 48;
  if (tfKey === "1h") return 56;
  return 64;
}

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000)
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatCompact(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

function volumeColor(candle) {
  return candle.close >= candle.open
    ? "rgba(14, 203, 129, 0.72)"
    : "rgba(246, 70, 93, 0.72)";
}

/**
 * Build display OHLC from pure market candle + biased close (Force Win/Lose).
 * Never accumulates sticky highs — bias reset instantly restores market wicks.
 */
function paintLastWithBias(marketCandle, biasedPrice, maxPct = MAX_BIAS_PCT) {
  if (!marketCandle) return marketCandle;
  const bias = Number(biasedPrice);
  if (!Number.isFinite(bias) || bias <= 0) return { ...marketCandle };

  const base = Number(marketCandle.close) || Number(marketCandle.open);
  if (!Number.isFinite(base) || base <= 0) return { ...marketCandle };

  const lo = base * (1 - maxPct);
  const hi = base * (1 + maxPct);
  const close = Math.min(hi, Math.max(lo, bias));

  return {
    ...marketCandle,
    close,
    // Wick follows market + this tick's close only (no sticky peak)
    high: Math.max(Number(marketCandle.high), close),
    low: Math.min(Number(marketCandle.low), close),
  };
}

function toDisplayCandles(marketList, biasedPrice, maxPct = MAX_BIAS_PCT) {
  if (!marketList.length) return marketList;
  const out = marketList.slice();
  out[out.length - 1] = paintLastWithBias(
    out[out.length - 1],
    biasedPrice,
    maxPct
  );
  return out;
}

function seedSeriesData(series, candles) {
  const {
    candle: candleApi,
    volume: volApi,
    ma5: ma5Api,
    ma10: ma10Api,
    volMa5: volMa5Api,
    volMa10: volMa10Api,
  } = series;
  if (!candleApi) return;
  candleApi.setData(
    candles.map(({ time, open, high, low, close }) => ({
      time,
      open,
      high,
      low,
      close,
    }))
  );
  volApi?.setData(toVolumeBars(candles));
  ma5Api?.setData(smaSeries(candles, 5));
  ma10Api?.setData(smaSeries(candles, 10));
  volMa5Api?.setData(smaSeries(candles, 5, (c) => c.volume));
  volMa10Api?.setData(smaSeries(candles, 10, (c) => c.volume));
}

function patchLiveBar(series, candles) {
  const {
    candle: candleApi,
    volume: volApi,
    ma5: ma5Api,
    ma10: ma10Api,
    volMa5: volMa5Api,
    volMa10: volMa10Api,
  } = series;
  if (!candleApi || !candles.length) return;

  const next = candles[candles.length - 1];
  candleApi.update({
    time: next.time,
    open: next.open,
    high: next.high,
    low: next.low,
    close: next.close,
  });
  volApi?.update({
    time: next.time,
    value: next.volume,
    color: volumeColor(next),
  });

  const ma5Pts = smaSeries(candles, 5);
  const ma10Pts = smaSeries(candles, 10);
  const volMa5Pts = smaSeries(candles, 5, (c) => c.volume);
  const volMa10Pts = smaSeries(candles, 10, (c) => c.volume);
  const lastMa5 = ma5Pts[ma5Pts.length - 1];
  const lastMa10 = ma10Pts[ma10Pts.length - 1];
  const lastVolMa5 = volMa5Pts[volMa5Pts.length - 1];
  const lastVolMa10 = volMa10Pts[volMa10Pts.length - 1];
  if (lastMa5) ma5Api?.update(lastMa5);
  if (lastMa10) ma10Api?.update(lastMa10);
  if (lastVolMa5) volMa5Api?.update(lastVolMa5);
  if (lastVolMa10) volMa10Api?.update(lastVolMa10);
}

/** One-time viewport after history load — never again on pan/tick */
function applyFixedVisibleWindow(chart, barCount, tfKey = "1m") {
  if (!chart || barCount <= 0) return;
  try {
    const spacing =
      tfKey === "15d" || tfKey === "1d" || tfKey === "4h" ? 12 : BAR_SPACING;
    chart.timeScale().applyOptions({
      barSpacing: spacing,
      rightOffset: RIGHT_OFFSET,
      minBarSpacing: 3,
    });
    const visible = Math.min(visibleBarsForTf(tfKey), barCount);
    const to = barCount - 1 + RIGHT_OFFSET / spacing;
    const from = Math.max(-RIGHT_OFFSET / spacing, to - visible);
    chart.timeScale().setVisibleLogicalRange({ from, to });
  } catch {
    try {
      chart.timeScale().scrollToRealTime();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Y range from visible bars. Always includes the live last bar + entry so
 * Force Win/Lose drift stays visible; still fences ancient outliers.
 */
function visiblePriceRange(candles, chart, entryPrice) {
  if (!candles?.length || !chart) return null;
  let from = 0;
  let to = candles.length - 1;
  try {
    const vr = chart.timeScale().getVisibleLogicalRange();
    if (vr) {
      from = Math.max(0, Math.floor(vr.from));
      to = Math.min(candles.length - 1, Math.ceil(vr.to));
    }
  } catch {
    /* full series */
  }
  if (from > to) return null;

  const highs = [];
  const lows = [];
  for (let i = from; i <= to; i += 1) {
    const c = candles[i];
    if (!c) continue;
    // Skip last bar for percentile fence — added explicitly below
    if (i === candles.length - 1) continue;
    if (Number.isFinite(c.high)) highs.push(c.high);
    if (Number.isFinite(c.low)) lows.push(c.low);
  }

  let min;
  let max;
  if (highs.length && lows.length) {
    highs.sort((a, b) => a - b);
    lows.sort((a, b) => a - b);
    const pick = (arr, p) =>
      arr[
        Math.min(
          arr.length - 1,
          Math.max(0, Math.round(p * (arr.length - 1)))
        )
      ];
    min = pick(lows, 0.05);
    max = pick(highs, 0.95);
  }

  const last = candles[candles.length - 1];
  if (last) {
    min = min == null ? last.low : Math.min(min, last.low);
    max = max == null ? last.high : Math.max(max, last.high);
  }
  const entry = Number(entryPrice);
  if (Number.isFinite(entry) && entry > 0) {
    min = min == null ? entry : Math.min(min, entry);
    max = max == null ? entry : Math.max(max, entry);
  }
  if (min == null || max == null || !(max > min)) return null;

  const mid = (min + max) / 2;
  const pad = Math.max((max - min) * 0.12, mid * 0.0005);
  return { minValue: min - pad, maxValue: max + pad };
}

export default function FuturesChart({
  asset = "BTC",
  assetType = "crypto",
  /** Biased live price from seconds-trade (Force Win/Lose / Graph UP-DOWN) */
  overridePrice = null,
  /** Active trade entry — drawn as a line so user sees win/loss vs entry */
  entryPrice = null,
  tradeSide = null,
  onLivePrice,
  className = "",
}) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  /** Pure exchange / synthetic market OHLC — never poisoned by bias */
  const marketCandlesRef = useRef([]);
  /** What the series currently shows (market + clamped bias on last bar) */
  const candlesRef = useRef([]);
  const disposedRef = useRef(false);
  const loadGen = useRef(0);
  const historySeededRef = useRef(false);
  const overrideRef = useRef(overridePrice);
  overrideRef.current = overridePrice;
  const entryRef = useRef(entryPrice);
  entryRef.current = entryPrice;
  const entryLineRef = useRef(null);
  const [displayPrice, setDisplayPrice] = useState(null);

  /** First paint: 15 daily Binance candles */
  const [tf, setTf] = useState("15d");
  const [stats, setStats] = useState(null);
  const [flash, setFlash] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastPriceRef = useRef(null);
  const flashTimer = useRef(null);

  const pairLabel = `${String(asset).toUpperCase()}/USDT`;
  const tfMeta =
    CHART_TIMEFRAMES.find((t) => t.key === tf) || CHART_TIMEFRAMES[1];

  const syncEntryLine = (price) => {
    const candle = seriesRef.current.candle;
    if (!candle) return;
    const p = Number(price);
    try {
      if (entryLineRef.current) {
        candle.removePriceLine(entryLineRef.current);
        entryLineRef.current = null;
      }
    } catch {
      entryLineRef.current = null;
    }
    if (!Number.isFinite(p) || p <= 0) return;
    try {
      entryLineRef.current = candle.createPriceLine({
        price: p,
        color: "rgba(240, 185, 11, 0.9)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: tradeSide === "short" ? "Entry SHORT" : "Entry LONG",
      });
    } catch {
      /* ignore */
    }
  };

  const publishDisplay = (marketList, mode = "update") => {
    const series = seriesRef.current;
    if (!series.candle) return;
    const hasEntry =
      Number.isFinite(Number(entryRef.current)) && Number(entryRef.current) > 0;
    const maxPct = hasEntry ? MAX_BIAS_PCT_TRADE : MAX_BIAS_PCT;
    const display = toDisplayCandles(
      marketList,
      overrideRef.current,
      maxPct
    );
    candlesRef.current = display;
    const liveClose = display[display.length - 1]?.close;
    if (Number.isFinite(liveClose)) {
      setDisplayPrice(liveClose);
      const prev = lastPriceRef.current;
      if (prev != null && liveClose !== prev) {
        setFlash(liveClose > prev ? "up" : "down");
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 700);
      }
      lastPriceRef.current = liveClose;
    }
    if (mode === "seed") {
      seedSeriesData(series, display);
    } else {
      try {
        patchLiveBar(series, display);
      } catch {
        seedSeriesData(series, display);
      }
    }
  };

  // Create / destroy chart shell once per mount
  useEffect(() => {
    disposedRef.current = false;
    const el = wrapRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: TEXT,
        fontSize: 11,
        fontFamily:
          "IBM Plex Sans, BinancePlex, -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { color: GRID, style: 0 },
        horzLines: { color: GRID, style: 0 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(183, 189, 198, 0.35)",
          labelBackgroundColor: "#2b3139",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: "rgba(183, 189, 198, 0.35)",
          labelBackgroundColor: "#2b3139",
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        autoScale: true,
        mode: PriceScaleMode.Normal,
        alignLabels: true,
        borderVisible: true,
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.08, bottom: 0.1 },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        borderVisible: true,
        timeVisible: true,
        secondsVisible: true,
        rightOffset: RIGHT_OFFSET,
        barSpacing: BAR_SPACING,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: { time: true, price: true },
      },
      localization: { locale: "en-US" },
    });

    try {
      chart.applyOptions({ layout: { attributionLogo: false } });
    } catch {
      /* older builds */
    }

    const candleSeries = chart.addSeries(
      CandlestickSeries,
      {
        upColor: UP,
        downColor: DOWN,
        borderVisible: false,
        wickUpColor: UP,
        wickDownColor: DOWN,
        priceScaleId: "right",
        priceLineVisible: true,
        lastValueVisible: true,
        autoscaleInfoProvider: () => {
          const range = visiblePriceRange(
            candlesRef.current,
            chart,
            entryRef.current
          );
          if (!range) return null;
          return { priceRange: range };
        },
      },
      0
    );

    candleSeries.priceScale().applyOptions({
      autoScale: true,
      mode: PriceScaleMode.Normal,
      alignLabels: true,
      borderVisible: true,
      scaleMargins: { top: 0.08, bottom: 0.1 },
    });

    const ma5 = chart.addSeries(
      LineSeries,
      {
        color: "#f0b90b",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      0
    );
    const ma10 = chart.addSeries(
      LineSeries,
      {
        color: "#c994e5",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      0
    );

    const volumeSeries = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1
    );

    volumeSeries.priceScale().applyOptions({
      autoScale: true,
      mode: PriceScaleMode.Normal,
      scaleMargins: { top: 0.15, bottom: 0 },
    });

    const volMa5 = chart.addSeries(
      LineSeries,
      {
        color: "rgba(240, 185, 11, 0.85)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      1
    );
    const volMa10 = chart.addSeries(
      LineSeries,
      {
        color: "rgba(201, 148, 229, 0.85)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      },
      1
    );

    try {
      const panes = chart.panes();
      if (panes?.[1]) panes[1].setHeight(108);
    } catch {
      /* optional */
    }

    chartRef.current = chart;
    seriesRef.current = {
      candle: candleSeries,
      ma5,
      ma10,
      volume: volumeSeries,
      volMa5,
      volMa10,
    };

    // Do NOT touch barSpacing / visible range on resize — that fights user zoom
    return () => {
      disposedRef.current = true;
      try {
        chart.remove();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
      seriesRef.current = {};
      marketCandlesRef.current = [];
      candlesRef.current = [];
      historySeededRef.current = false;
    };
  }, []);

  // Load history + streams
  useEffect(() => {
    const gen = ++loadGen.current;
    if (!seriesRef.current.candle) return undefined;

    let unsub = null;
    let pollId = null;
    let alive = true;
    historySeededRef.current = false;
    setLoading(true);
    setError(null);
    setConnected(false);
    marketCandlesRef.current = [];
    candlesRef.current = [];

    const pushFlash = (price) => {
      const prev = lastPriceRef.current;
      if (prev != null && price !== prev) {
        setFlash(price > prev ? "up" : "down");
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 700);
      }
      lastPriceRef.current = price;
      onLivePrice?.(price);
    };

    const seedHistory = (list) => {
      if (!alive || disposedRef.current || gen !== loadGen.current) return;
      marketCandlesRef.current = list;
      publishDisplay(list, "seed");
      historySeededRef.current = true;
      applyFixedVisibleWindow(chartRef.current, list.length, tfMeta.key);
      syncEntryLine(entryRef.current);
    };

    /** Market tick — merge into market buffer, then paint display via update() */
    const upsertMarket = (nextCandle) => {
      if (!alive || disposedRef.current || gen !== loadGen.current) return;
      if (!historySeededRef.current) return;

      const list = marketCandlesRef.current.slice();
      const last = list[list.length - 1];
      if (last && last.time === nextCandle.time) {
        // Exchange is source of truth for this bucket — replace, don't max() bias highs
        list[list.length - 1] = {
          time: nextCandle.time,
          open: nextCandle.open,
          high: nextCandle.high,
          low: nextCandle.low,
          close: nextCandle.close,
          volume: nextCandle.volume,
        };
      } else if (!last || nextCandle.time > last.time) {
        list.push(nextCandle);
        if (list.length > 1200) list.splice(0, list.length - 1200);
      } else {
        return;
      }

      marketCandlesRef.current = list;
      publishDisplay(list, "update");
    };

    const bootCrypto = async () => {
      const symbol = toBinanceSymbol(asset);
      if (!symbol) throw new Error("Invalid symbol");

      let interval = tfMeta.interval;
      let limit = tfMeta.limit;
      let klines;
      try {
        klines = await fetchKlines(symbol, interval, limit);
      } catch (err) {
        if (interval === "1s") {
          interval = "1m";
          limit = 500;
          klines = await fetchKlines(symbol, interval, limit);
        } else {
          throw err;
        }
      }
      const ticker = await fetchTicker24h(symbol).catch(() => null);
      if (!alive || gen !== loadGen.current) return;

      seedHistory(klines);

      if (ticker) {
        setStats(ticker);
        pushFlash(ticker.lastPrice);
      } else if (klines.length) {
        pushFlash(klines[klines.length - 1].close);
      }

      const streamInterval = tfMeta.interval === "1s" ? "1s" : interval;

      unsub = subscribeBinanceMarket({
        symbol,
        interval: streamInterval,
        onStatus: (ok) => {
          if (alive && gen === loadGen.current) setConnected(ok);
        },
        onTicker: (t) => {
          if (!alive || gen !== loadGen.current) return;
          setStats((prev) => ({ ...(prev || {}), ...t }));
          if (Number.isFinite(t.lastPrice)) {
            pushFlash(t.lastPrice);
            if (tfMeta.interval === "1s") {
              const last = marketCandlesRef.current[marketCandlesRef.current.length - 1];
              const next = synthCandleFromPrice(
                last,
                t.lastPrice,
                1,
                Math.floor(Date.now() / 1000)
              );
              upsertMarket(next);
            }
          }
        },
        onKline: (k) => {
          if (!alive || gen !== loadGen.current) return;
          if (tfMeta.interval === "1s" && streamInterval !== "1s") return;
          const t = toUnixSeconds(k.time);
          if (!t) return;
          upsertMarket({
            time: t,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
          });
          pushFlash(k.close);
        },
      });
    };

    const bootSynthetic = async () => {
      const seed = Number(overrideRef.current);
      if (!Number.isFinite(seed) || seed <= 0) {
        setError("Waiting for live price…");
        return;
      }
      const bucket = intervalMs(tfMeta.interval) / 1000;
      const now = Math.floor(Date.now() / 1000);
      const seedBars = [];
      let px = seed;
      for (let i = 120; i >= 0; i -= 1) {
        const t = Math.floor((now - i * bucket) / bucket) * bucket;
        const drift = px * (Math.random() - 0.5) * 0.002;
        const open = px;
        const close = px + drift;
        const high = Math.max(open, close) * (1 + Math.random() * 0.0008);
        const low = Math.min(open, close) * (1 - Math.random() * 0.0008);
        seedBars.push({
          time: t,
          open,
          high,
          low,
          close,
          volume: Math.abs(drift) * 40 + Math.random() * 20,
        });
        px = close;
      }
      const dedup = [];
      for (const c of seedBars) {
        const last = dedup[dedup.length - 1];
        if (last && last.time === c.time) dedup[dedup.length - 1] = c;
        else dedup.push(c);
      }
      seedHistory(dedup);
      setStats({
        lastPrice: seed,
        highPrice: Math.max(...dedup.map((d) => d.high)),
        lowPrice: Math.min(...dedup.map((d) => d.low)),
        volume: dedup.reduce((a, b) => a + b.volume, 0),
        quoteVolume: dedup.reduce((a, b) => a + b.volume * b.close, 0),
        priceChangePercent: 0,
      });
      pushFlash(seed);
      setConnected(true);

      pollId = setInterval(() => {
        const live = Number(overrideRef.current);
        if (!Number.isFinite(live) || live <= 0) return;
        const last = marketCandlesRef.current[marketCandlesRef.current.length - 1];
        // Synthetic market uses live price as market itself
        const next = synthCandleFromPrice(
          last,
          live,
          bucket,
          Math.floor(Date.now() / 1000)
        );
        upsertMarket(next);
        pushFlash(live);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                lastPrice: live,
                highPrice: Math.max(prev.highPrice || live, live),
                lowPrice: Math.min(prev.lowPrice || live, live),
              }
            : prev
        );
      }, 1000);
    };

    (async () => {
      try {
        if (assetType === "crypto") await bootCrypto();
        else await bootSynthetic();
      } catch (err) {
        if (alive && gen === loadGen.current) {
          setError(err?.message || "Chart feed unavailable");
          try {
            await bootSynthetic();
            setError(null);
          } catch {
            /* keep error */
          }
        }
      } finally {
        if (alive && gen === loadGen.current) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (unsub) unsub();
      if (pollId) clearInterval(pollId);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    asset,
    assetType,
    tf,
    tfMeta.interval,
    tfMeta.limit,
    assetType === "crypto" ? 1 : Number(overridePrice) > 0 ? 1 : 0,
  ]);

  // Bias nudge — Force Win/Lose drifts last candle; chart keeps ticking via update()
  useEffect(() => {
    if (!historySeededRef.current) return;
    if (!marketCandlesRef.current.length) return;
    if (!seriesRef.current.candle) return;
    publishDisplay(marketCandlesRef.current, "update");
  }, [overridePrice]);

  // Entry line — user sees where they stand vs Force Win/Lose drift
  useEffect(() => {
    if (!historySeededRef.current) return;
    syncEntryLine(entryPrice);
  }, [entryPrice, tradeSide, asset, tf]);

  const entry = Number(entryPrice);
  const hasOpenTrade = Number.isFinite(entry) && entry > 0 && tradeSide;
  // Live Binance ticker when idle; biased display only while a trade is open
  const last = hasOpenTrade
    ? Number.isFinite(Number(displayPrice)) && Number(displayPrice) > 0
      ? Number(displayPrice)
      : Number.isFinite(Number(overridePrice)) && Number(overridePrice) > 0
        ? Number(overridePrice)
        : stats?.lastPrice
    : stats?.lastPrice ??
      (Number.isFinite(Number(displayPrice)) ? Number(displayPrice) : null);
  const chg = Number(stats?.priceChangePercent || 0);
  const vsEntry =
    hasOpenTrade &&
    Number.isFinite(Number(last)) &&
    Number(last) > 0
      ? Number(last) - entry
      : null;
  const chgUp =
    vsEntry != null
      ? tradeSide === "short"
        ? vsEntry <= 0
        : vsEntry >= 0
      : chg >= 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e11] ${className}`}
    >
      <div className="border-b border-white/5 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold tracking-tight text-white">
                {pairLabel}
              </div>
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Perpetual
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] ${
                  connected ? "text-emerald-400" : "text-slate-500"
                }`}
                title={connected ? "Live stream" : "Reconnecting"}
              >
                {connected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {connected ? "Live" : "Idle"}
              </span>
            </div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums transition-colors duration-200 ${
                flash === "up"
                  ? "text-[#0ecb81]"
                  : flash === "down"
                    ? "text-[#f6465d]"
                    : chgUp
                      ? "text-[#0ecb81]"
                      : "text-[#f6465d]"
              }`}
            >
              {last != null ? formatPrice(last) : "—"}
              <span
                className={`ml-2 text-sm font-semibold ${
                  chgUp ? "text-[#0ecb81]" : "text-[#f6465d]"
                }`}
              >
                {vsEntry != null && entry > 0
                  ? `${chgUp ? "▲" : "▼"} ${(((Number(last) - entry) / entry) * 100).toFixed(2)}% vs entry`
                  : `${chgUp ? "+" : ""}${chg.toFixed(2)}%`}
              </span>
            </div>
            {vsEntry != null && (
              <div
                className={`mt-0.5 text-[11px] font-semibold ${
                  chgUp ? "text-[#0ecb81]" : "text-[#f6465d]"
                }`}
              >
                {chgUp ? "Winning vs entry" : "Losing vs entry"}
                {tradeSide ? ` · ${String(tradeSide).toUpperCase()}` : ""}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11px] sm:grid-cols-4">
            <Metric label="24h High" value={formatPrice(stats?.highPrice)} tone="up" />
            <Metric label="24h Low" value={formatPrice(stats?.lowPrice)} tone="down" />
            <Metric label="24h Vol (Asset)" value={formatCompact(stats?.volume)} />
            <Metric
              label="24h Vol (USDT)"
              value={formatCompact(stats?.quoteVolume)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-1.5">
        {CHART_TIMEFRAMES.map((t) => {
          const active = tf === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTf(t.key)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? "bg-[#f0b90b]/15 text-[#f0b90b]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto hidden items-center gap-3 pr-2 text-[10px] text-slate-500 sm:flex">
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 rounded bg-[#f0b90b]" /> MA(5)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 rounded bg-[#c994e5]" /> MA(10)
          </span>
        </div>
      </div>

      <div className="relative h-[360px] w-full sm:h-[420px]">
        <div ref={wrapRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0e11]/70 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading {pairLabel} · {tfMeta.label}
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-x-0 bottom-2 z-10 px-3 text-center text-[11px] text-amber-300/90">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 font-semibold tabular-nums ${
          tone === "up"
            ? "text-[#0ecb81]"
            : tone === "down"
              ? "text-[#f6465d]"
              : "text-slate-200"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}
