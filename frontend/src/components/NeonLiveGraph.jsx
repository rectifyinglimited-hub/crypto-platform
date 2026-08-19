/**
 * equiti-style live desk: candles + MA5/10/30/60 + volume, real Binance feed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
} from "lightweight-charts";
import {
  fetchKlines,
  fetchTicker24h,
  smaSeries,
  subscribeBinanceMarket,
  toBinanceSymbol,
  toUnixSeconds,
  toVolumeBars,
} from "../lib/binanceMarket.js";

const UP = "#0ecb81";
const DOWN = "#f6465d";
const BG = "#0b0e11";
const GRID = "rgba(255,255,255,0.07)";
const TEXT = "#848e9c";

const MA = {
  5: "#f0b90b",
  10: "#c77dff",
  30: "#5dade2",
  60: "#e84393",
};

const VOL_MA = {
  5: "#f0b90b",
  10: "#c77dff",
  20: "#5dade2",
};

const TIMEFRAMES = [
  { key: "Time", label: "Time", interval: "1m", limit: 400 },
  { key: "1m", label: "1m", interval: "1m", limit: 400 },
  { key: "5m", label: "5m", interval: "5m", limit: 400 },
  { key: "15m", label: "15m", interval: "15m", limit: 400 },
  { key: "30m", label: "30m", interval: "30m", limit: 400 },
  { key: "1h", label: "1h", interval: "1h", limit: 400 },
  { key: "4h", label: "4h", interval: "4h", limit: 300 },
  { key: "1D", label: "1D", interval: "1d", limit: 240 },
];

function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
}

function formatCompact(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(3)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(3)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(3)}K`;
  return v.toFixed(3);
}

function volumeColor(c) {
  return c.close >= c.open
    ? "rgba(14, 203, 129, 0.72)"
    : "rgba(246, 70, 93, 0.72)";
}

function lastSma(candles, period, valueOf) {
  const pts = smaSeries(candles, period, valueOf);
  return pts[pts.length - 1] || null;
}

function paintAll(series, candles) {
  if (!series?.candle || !candles.length) return;
  series.candle.setData(
    candles.map(({ time, open, high, low, close }) => ({
      time,
      open,
      high,
      low,
      close,
    }))
  );
  series.volume?.setData(toVolumeBars(candles));
  series.ma5?.setData(smaSeries(candles, 5));
  series.ma10?.setData(smaSeries(candles, 10));
  series.ma30?.setData(smaSeries(candles, 30));
  series.ma60?.setData(smaSeries(candles, 60));
  series.volMa5?.setData(smaSeries(candles, 5, (c) => c.volume));
  series.volMa10?.setData(smaSeries(candles, 10, (c) => c.volume));
  series.volMa20?.setData(smaSeries(candles, 20, (c) => c.volume));
}

function paintLive(series, candles) {
  if (!series?.candle || !candles.length) return;
  const next = candles[candles.length - 1];
  series.candle.update({
    time: next.time,
    open: next.open,
    high: next.high,
    low: next.low,
    close: next.close,
  });
  series.volume?.update({
    time: next.time,
    value: next.volume,
    color: volumeColor(next),
  });
  const ma5 = lastSma(candles, 5);
  const ma10 = lastSma(candles, 10);
  const ma30 = lastSma(candles, 30);
  const ma60 = lastSma(candles, 60);
  const v5 = lastSma(candles, 5, (c) => c.volume);
  const v10 = lastSma(candles, 10, (c) => c.volume);
  const v20 = lastSma(candles, 20, (c) => c.volume);
  if (ma5) series.ma5?.update(ma5);
  if (ma10) series.ma10?.update(ma10);
  if (ma30) series.ma30?.update(ma30);
  if (ma60) series.ma60?.update(ma60);
  if (v5) series.volMa5?.update(v5);
  if (v10) series.volMa10?.update(v10);
  if (v20) series.volMa20?.update(v20);
}

function legendFrom(candles) {
  if (!candles.length) return null;
  const last = candles[candles.length - 1];
  return {
    o: last.open,
    h: last.high,
    l: last.low,
    c: last.close,
    ma5: lastSma(candles, 5)?.value,
    ma10: lastSma(candles, 10)?.value,
    ma30: lastSma(candles, 30)?.value,
    ma60: lastSma(candles, 60)?.value,
    vol: last.volume,
    vol5: lastSma(candles, 5, (c) => c.volume)?.value,
    vol10: lastSma(candles, 10, (c) => c.volume)?.value,
    vol20: lastSma(candles, 20, (c) => c.volume)?.value,
  };
}

export default function NeonLiveGraph({
  symbol = "BTC",
  height = 280,
  compact = false,
  transparent = false,
}) {
  const wrapRef = useRef(null);
  const seriesRef = useRef({});
  const candlesRef = useRef([]);
  const [tf, setTf] = useState("1m");
  const [stats, setStats] = useState(null);
  const [legend, setLegend] = useState(null);
  const [connected, setConnected] = useState(false);

  const tfMeta = useMemo(
    () => TIMEFRAMES.find((t) => t.key === tf) || TIMEFRAMES[1],
    [tf]
  );

  const last = stats?.lastPrice ?? legend?.c;
  const chg = Number(stats?.priceChangePercent || 0);
  const up = chg >= 0;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: {
          type: ColorType.Solid,
          color: transparent ? "rgba(8, 16, 28, 0.18)" : BG,
        },
        textColor: TEXT,
        fontSize: compact ? 9 : 11,
        fontFamily: "IBM Plex Sans, BinancePlex, -apple-system, sans-serif",
      },
      grid: {
        vertLines: {
          color: transparent ? "rgba(255,255,255,0.05)" : GRID,
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: transparent ? "rgba(255,255,255,0.05)" : GRID,
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.18)", style: LineStyle.Dashed },
        horzLine: { color: "rgba(255,255,255,0.18)", style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.06, bottom: 0.04 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: compact ? 6 : 8,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });
    try {
      chart.applyOptions({ layout: { attributionLogo: false } });
    } catch {
      /* ignore */
    }

    const candle = chart.addSeries(
      CandlestickSeries,
      {
        upColor: UP,
        downColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
        priceLineVisible: true,
        priceLineColor: UP,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
      },
      0
    );
    candle.priceScale().applyOptions({
      autoScale: true,
      mode: PriceScaleMode.Normal,
      borderVisible: true,
      scaleMargins: { top: 0.08, bottom: 0.06 },
    });

    const lineOpts = (color) => ({
      color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const ma5 = chart.addSeries(LineSeries, lineOpts(MA[5]), 0);
    const ma10 = chart.addSeries(LineSeries, lineOpts(MA[10]), 0);
    const ma30 = chart.addSeries(LineSeries, lineOpts(MA[30]), 0);
    const ma60 = chart.addSeries(LineSeries, lineOpts(MA[60]), 0);

    const volume = chart.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1
    );
    volume.priceScale().applyOptions({
      autoScale: true,
      scaleMargins: { top: 0.18, bottom: 0 },
    });
    const volMa5 = chart.addSeries(LineSeries, lineOpts(VOL_MA[5]), 1);
    const volMa10 = chart.addSeries(LineSeries, lineOpts(VOL_MA[10]), 1);
    const volMa20 = chart.addSeries(LineSeries, lineOpts(VOL_MA[20]), 1);

    try {
      const panes = chart.panes();
      if (panes?.[1]) panes[1].setHeight(compact ? 52 : 78);
    } catch {
      /* optional */
    }

    seriesRef.current = {
      candle,
      ma5,
      ma10,
      ma30,
      ma60,
      volume,
      volMa5,
      volMa10,
      volMa20,
    };
    if (candlesRef.current.length) {
      paintAll(seriesRef.current, candlesRef.current);
    }

    chart.subscribeCrosshairMove((param) => {
      const list = candlesRef.current;
      if (!param?.time || !param.seriesData) {
        setLegend(legendFrom(list));
        return;
      }
      const bar = param.seriesData.get(candle);
      if (!bar) {
        setLegend(legendFrom(list));
        return;
      }
      const hit = list.find((c) => c.time === param.time) || list[list.length - 1];
      const slice = list.filter((c) => c.time <= param.time);
      setLegend({
        o: bar.open,
        h: bar.high,
        l: bar.low,
        c: bar.close,
        ma5: lastSma(slice, 5)?.value,
        ma10: lastSma(slice, 10)?.value,
        ma30: lastSma(slice, 30)?.value,
        ma60: lastSma(slice, 60)?.value,
        vol: hit?.volume,
        vol5: lastSma(slice, 5, (c) => c.volume)?.value,
        vol10: lastSma(slice, 10, (c) => c.volume)?.value,
        vol20: lastSma(slice, 20, (c) => c.volume)?.value,
      });
    });

    return () => {
      seriesRef.current = {};
      try {
        chart.remove();
      } catch {
        /* ignore */
      }
    };
  }, [compact, transparent]);

  useEffect(() => {
    const pair = toBinanceSymbol(symbol, "USDT");
    if (!pair) return undefined;
    let alive = true;
    let unsub;

    const upsert = (next) => {
      if (!alive) return;
      const list = candlesRef.current.slice();
      const lastBar = list[list.length - 1];
      if (lastBar && lastBar.time === next.time) {
        list[list.length - 1] = next;
      } else if (!lastBar || next.time > lastBar.time) {
        list.push(next);
        if (list.length > 900) list.splice(0, list.length - 900);
      } else {
        return;
      }
      candlesRef.current = list;
      paintLive(seriesRef.current, list);
      setLegend(legendFrom(list));
    };

    (async () => {
      try {
        const [klines, ticker] = await Promise.all([
          fetchKlines(pair, tfMeta.interval, tfMeta.limit),
          fetchTicker24h(pair).catch(() => null),
        ]);
        if (!alive || !klines.length) return;
        candlesRef.current = klines;
        paintAll(seriesRef.current, klines);
        setLegend(legendFrom(klines));
        if (ticker) setStats(ticker);
        else {
          const first = klines[0];
          const close = klines[klines.length - 1].close;
          setStats({
            lastPrice: close,
            priceChangePercent: ((close - first.open) / first.open) * 100,
            highPrice: Math.max(...klines.map((c) => c.high)),
            lowPrice: Math.min(...klines.map((c) => c.low)),
            volume: klines.reduce((a, c) => a + c.volume, 0),
          });
        }
        try {
          seriesRef.current.candle?.priceScale();
        } catch {
          /* ignore */
        }
        unsub = subscribeBinanceMarket({
          symbol: pair,
          interval: tfMeta.interval,
          onStatus: (ok) => alive && setConnected(ok),
          onTicker: (t) => {
            if (!alive) return;
            setStats((prev) => ({ ...(prev || {}), ...t }));
          },
          onKline: (k) => {
            const t = toUnixSeconds(k.time);
            if (!t) return;
            upsert({
              time: t,
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
              volume: k.volume,
            });
          },
        });
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
      unsub?.();
    };
  }, [symbol, tfMeta.interval, tfMeta.limit]);

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        transparent
          ? "border-white/15 bg-black/20 backdrop-blur-[2px]"
          : "border-white/10 bg-[#0b0e11]"
      }`}
    >
      <div className={`border-b border-white/5 ${compact ? "px-2.5 py-2" : "px-3 py-3 sm:px-4"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`font-bold tabular-nums leading-none ${
                compact ? "text-lg" : "text-2xl sm:text-3xl"
              } ${up ? "text-[#0ecb81]" : "text-[#f6465d]"}`}
            >
              {last != null ? formatPrice(last) : "—"}
            </div>
            <div
              className={`mt-1 text-xs font-semibold tabular-nums ${
                up ? "text-[#0ecb81]" : "text-[#f6465d]"
              }`}
            >
              {up ? "+" : ""}
              {chg.toFixed(2)}%
            </div>
          </div>
          {!compact && (
            <div className="hidden pt-1 text-center sm:block">
              <div className="text-sm font-semibold tracking-tight text-white">
                {symbol}/USDT{" "}
                <span className="font-normal text-white/55">Quick contract</span>
              </div>
              <div className="mt-1 text-[10px] text-[#0ecb81]">
                {connected ? "● Live" : "○ Connecting"}
              </div>
            </div>
          )}
          <div
            className={`shrink-0 text-right tabular-nums ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            <Row label="Minimum" value={formatPrice(stats?.lowPrice)} />
            <Row label="Maximum" value={formatPrice(stats?.highPrice)} />
            <Row label="24h quantity" value={formatCompact(stats?.volume)} />
          </div>
        </div>
        {compact && (
          <div className="mt-1 text-[11px] font-semibold text-white/80">
            {symbol}/USDT Quick contract
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-white/5 px-2 py-1">
        {TIMEFRAMES.map((t) => {
          const active = tf === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTf(t.key)}
              className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${
                active
                  ? "bg-[#f0b90b]/18 text-[#f0b90b]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {legend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1 text-[10px] tabular-nums text-slate-400">
          <span>
            MA5:{" "}
            <span style={{ color: MA[5] }}>{formatPrice(legend.ma5)}</span>
          </span>
          <span>
            MA10:{" "}
            <span style={{ color: MA[10] }}>{formatPrice(legend.ma10)}</span>
          </span>
          <span>
            MA30:{" "}
            <span style={{ color: MA[30] }}>{formatPrice(legend.ma30)}</span>
          </span>
          <span>
            MA60:{" "}
            <span style={{ color: MA[60] }}>{formatPrice(legend.ma60)}</span>
          </span>
          <span className="text-slate-500">
            O {formatPrice(legend.o)} H {formatPrice(legend.h)} L{" "}
            {formatPrice(legend.l)} C {formatPrice(legend.c)}
          </span>
        </div>
      )}

      <div ref={wrapRef} style={{ height }} className="w-full" />

      {legend && (
        <div className="flex flex-wrap items-center gap-x-3 px-3 py-1 text-[10px] tabular-nums text-slate-400">
          <span>VOL(5, 10, 20)</span>
          <span style={{ color: VOL_MA[5] }}>{formatCompact(legend.vol5)}</span>
          <span style={{ color: VOL_MA[10] }}>
            {formatCompact(legend.vol10)}
          </span>
          <span style={{ color: VOL_MA[20] }}>
            {formatCompact(legend.vol20)}
          </span>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-end gap-3 leading-5">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-[4.5rem] font-semibold text-white/90">{value}</span>
    </div>
  );
}
