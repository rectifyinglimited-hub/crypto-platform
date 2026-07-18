/**
 * Binance Futures–style TradingView Lightweight Charts terminal.
 * Candles + volume pane + MA overlays + 24h metrics + realtime streams.
 *
 * Scaling contract:
 * - History is seeded once via setData(); live ticks use update() only.
 * - Fixed barSpacing locks candle column width (no fitContent / density squeeze).
 * - rightPriceScale.autoScale stays on for normal Y behavior without view resets.
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
  applyTickToCandle,
  fetchKlines,
  fetchTicker24h,
  intervalMs,
  smaSeries,
  subscribeBinanceMarket,
  synthCandleFromPrice,
  toBinanceSymbol,
  toVolumeBars,
} from "../lib/binanceMarket.js";

const UP = "#0ecb81";
const DOWN = "#f6465d";
const BG = "#0b0e11";
const GRID = "rgba(255, 255, 255, 0.06)";
const TEXT = "#848e9c";

/** Locked candle column width — prevents history from compressing into hairlines */
const BAR_SPACING = 8;
/** Visible bars after history seed (keeps a healthy zoom, not fit-all) */
const INITIAL_VISIBLE_BARS = 72;
const RIGHT_OFFSET = 12;

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

/** Full series replace — history boot / asset-TF change only */
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

/** Incremental tick — never calls setData / fitContent */
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

/** Lock a fixed logical window — never fitContent the full history */
function applyFixedVisibleWindow(chart, barCount) {
  if (!chart || barCount <= 0) return;
  try {
    chart.timeScale().applyOptions({
      barSpacing: BAR_SPACING,
      rightOffset: RIGHT_OFFSET,
      minBarSpacing: 4,
    });
    const visible = Math.min(INITIAL_VISIBLE_BARS, barCount);
    const to = barCount - 1 + RIGHT_OFFSET / BAR_SPACING;
    const from = Math.max(-RIGHT_OFFSET / BAR_SPACING, to - visible);
    chart.timeScale().setVisibleLogicalRange({ from, to });
  } catch {
    try {
      chart.timeScale().scrollToRealTime();
    } catch {
      /* ignore */
    }
  }
}

export default function FuturesChart({
  asset = "BTC",
  assetType = "crypto",
  /** Optional biased live price from seconds-trade backend */
  overridePrice = null,
  onLivePrice,
  className = "",
}) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const candlesRef = useRef([]);
  const disposedRef = useRef(false);
  const loadGen = useRef(0);
  /** After first seed for a load generation, streaming must not setData */
  const historySeededRef = useRef(false);

  const [tf, setTf] = useState("1m");
  const [stats, setStats] = useState(null);
  const [flash, setFlash] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastPriceRef = useRef(null);
  const flashTimer = useRef(null);
  const overrideRef = useRef(overridePrice);
  overrideRef.current = overridePrice;

  const pairLabel = `${String(asset).toUpperCase()}/USDT`;
  const tfMeta =
    CHART_TIMEFRAMES.find((t) => t.key === tf) || CHART_TIMEFRAMES[1];

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
        mode: PriceScaleMode.Normal, // 0 — Normal
        alignLabels: true,
        borderVisible: true,
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.12 },
      },
      leftPriceScale: {
        visible: false,
        autoScale: true,
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        borderVisible: true,
        timeVisible: true,
        secondsVisible: true,
        rightOffset: RIGHT_OFFSET,
        barSpacing: BAR_SPACING,
        minBarSpacing: 4,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        // Append new bars without collapsing the visible window over all history
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
        // Price-axis drag would turn off autoScale — keep time zoom only
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: { time: true, price: true },
      },
      localization: { locale: "en-US" },
    });

    try {
      chart.applyOptions({
        layout: {
          attributionLogo: false,
        },
      });
    } catch {
      /* older lightweight-charts builds */
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
      },
      0
    );

    candleSeries.priceScale().applyOptions({
      autoScale: true,
      mode: PriceScaleMode.Normal,
      alignLabels: true,
      borderVisible: true,
      scaleMargins: { top: 0.1, bottom: 0.12 },
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
      /* panes optional on older builds */
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

    // Size only — do NOT reset time/price scales on resize (that caused compression)
    const ro = new ResizeObserver(() => {
      if (!chartRef.current || !el) return;
      // autoSize already handles layout; reaffirm locked bar spacing only
      try {
        chart.timeScale().applyOptions({
          barSpacing: BAR_SPACING,
          rightOffset: RIGHT_OFFSET,
          minBarSpacing: 4,
          lockVisibleTimeRangeOnResize: true,
        });
      } catch {
        /* ignore */
      }
    });
    ro.observe(el);

    return () => {
      disposedRef.current = true;
      ro.disconnect();
      try {
        chart.remove();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
      seriesRef.current = {};
      candlesRef.current = [];
      historySeededRef.current = false;
    };
  }, []);

  // Load history + subscribe streams whenever asset / timeframe / type changes
  useEffect(() => {
    const gen = ++loadGen.current;
    const series = seriesRef.current;
    if (!series.candle) return undefined;

    let unsub = null;
    let pollId = null;
    let alive = true;
    historySeededRef.current = false;
    setLoading(true);
    setError(null);
    setConnected(false);
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

    /** One-time history paint + fixed logical window */
    const seedHistory = (list) => {
      if (!alive || disposedRef.current || gen !== loadGen.current) return;
      candlesRef.current = list;
      seedSeriesData(series, list);
      historySeededRef.current = true;
      applyFixedVisibleWindow(chartRef.current, list.length);
    };

    /**
     * Real-time path: mutate buffer + series.update() only.
     * Never setData / fitContent / reset visible range on ticks.
     */
    const upsertLast = (nextCandle) => {
      if (!alive || disposedRef.current || gen !== loadGen.current) return;
      if (!historySeededRef.current) return;

      const list = candlesRef.current.slice();
      const last = list[list.length - 1];
      if (last && last.time === nextCandle.time) {
        list[list.length - 1] = nextCandle;
      } else if (!last || nextCandle.time > last.time) {
        list.push(nextCandle);
        if (list.length > 1200) list.splice(0, list.length - 1200);
      } else {
        return;
      }

      candlesRef.current = list;
      try {
        patchLiveBar(series, list);
      } catch {
        // Rare API mismatch — re-seed once without touching visible range
        seedSeriesData(series, list);
      }
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
              const last = candlesRef.current[candlesRef.current.length - 1];
              const next = synthCandleFromPrice(
                last,
                t.lastPrice,
                1,
                Math.floor(Date.now() / 1000)
              );
              upsertLast(next);
            }
          }
        },
        onKline: (k) => {
          if (!alive || gen !== loadGen.current) return;
          if (tfMeta.interval === "1s" && streamInterval !== "1s") {
            return;
          }
          upsertLast({
            time: k.time,
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
        const last = candlesRef.current[candlesRef.current.length - 1];
        const next = synthCandleFromPrice(
          last,
          live,
          bucket,
          Math.floor(Date.now() / 1000)
        );
        upsertLast(next);
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

  // Nudge active candle with backend-biased override — update() only
  useEffect(() => {
    if (assetType !== "crypto") return;
    if (!historySeededRef.current) return;
    const price = Number(overridePrice);
    if (!Number.isFinite(price) || price <= 0) return;
    const list = candlesRef.current;
    if (!list.length) return;
    const last = list[list.length - 1];
    const next = applyTickToCandle(last, price, 0);
    const series = seriesRef.current;
    if (!series.candle) return;
    const updated = list.slice(0, -1).concat(next);
    candlesRef.current = updated;
    try {
      patchLiveBar(series, updated);
    } catch {
      seedSeriesData(series, updated);
    }
  }, [overridePrice, assetType]);

  const last = stats?.lastPrice;
  const chg = Number(stats?.priceChangePercent || 0);
  const chgUp = chg >= 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e11] ${className}`}
    >
      {/* 24h metrics header */}
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
                {chgUp ? "+" : ""}
                {chg.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11px] sm:grid-cols-4">
            <Metric label="24h High" value={formatPrice(stats?.highPrice)} tone="up" />
            <Metric label="24h Low" value={formatPrice(stats?.lowPrice)} tone="down" />
            <Metric
              label="24h Vol (Asset)"
              value={formatCompact(stats?.volume)}
            />
            <Metric
              label="24h Vol (USDT)"
              value={formatCompact(stats?.quoteVolume)}
            />
          </div>
        </div>
      </div>

      {/* Timeframe sub-deck */}
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
