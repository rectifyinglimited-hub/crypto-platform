/**
 * Compact live candlestick for Spot Copy signal cards (background layer).
 */
import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
} from "lightweight-charts";
import {
  fetchKlines,
  subscribeBinanceMarket,
  synthCandleFromPrice,
} from "../lib/binanceMarket.js";

function seedWalk(base, count = 72) {
  const now = Math.floor(Date.now() / 1000);
  let price = base;
  const out = [];
  for (let i = count; i >= 0; i -= 1) {
    const drift = (Math.random() - 0.48) * base * 0.004;
    const open = price;
    price = Math.max(base * 0.92, price + drift);
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);
    out.push({
      time: now - i * 60,
      open,
      high,
      low,
      close,
    });
  }
  return out;
}

export default function SpotCopyChart({
  symbol = null,
  seedPrice = 100,
  className = "",
}) {
  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.01)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false, borderVisible: false },
      leftPriceScale: { visible: false, borderVisible: false },
      timeScale: {
        visible: false,
        borderVisible: false,
        rightOffset: 2,
        barSpacing: 6,
        minBarSpacing: 4,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScroll: false,
      handleScale: false,
      width: el.clientWidth || 320,
      height: el.clientHeight || 220,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#4ade80",
      wickDownColor: "#f87171",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!hostRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
      });
    });
    ro.observe(el);

    let unsub = () => {};
    let tickTimer = null;

    const applyBars = (bars) => {
      if (!seriesRef.current || !bars?.length) return;
      seriesRef.current.setData(bars);
      lastRef.current = bars[bars.length - 1];
      chart.timeScale().fitContent();
    };

    const boot = async () => {
      if (symbol) {
        try {
          const bars = await fetchKlines(symbol, "1m", 80);
          applyBars(bars);
          unsub = subscribeBinanceMarket({
            symbol,
            interval: "1m",
            onKline: (bar) => {
              if (!seriesRef.current || !bar?.time) return;
              seriesRef.current.update(bar);
              lastRef.current = bar;
            },
          });
          return;
        } catch {
          /* fall through to synthetic */
        }
      }

      const synth = seedWalk(seedPrice);
      applyBars(synth);
      tickTimer = setInterval(() => {
        const prev = lastRef.current;
        if (!prev || !seriesRef.current) return;
        const now = Math.floor(Date.now() / 1000);
        const nextPrice =
          prev.close * (1 + (Math.random() - 0.48) * 0.0024);
        const bar = synthCandleFromPrice(prev, nextPrice, 60, now);
        seriesRef.current.update(bar);
        lastRef.current = bar;
      }, 900);
    };

    boot();

    return () => {
      unsub?.();
      if (tickTimer) clearInterval(tickTimer);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, seedPrice]);

  return (
    <div
      ref={hostRef}
      className={`pointer-events-none absolute inset-0 opacity-80 ${className}`}
    />
  );
}
