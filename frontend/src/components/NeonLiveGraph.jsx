/**
 * Compact Binance-style candlestick preview (same colors as the trade desk).
 */
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { fetchKlines, toBinanceSymbol } from "../lib/binanceMarket.js";

const UP = "#0ecb81";
const DOWN = "#f6465d";
const BG = "#0b0e11";

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

export default function NeonLiveGraph({ symbol = "BTC", height = 220 }) {
  const wrapRef = useRef(null);
  const [price, setPrice] = useState(null);
  const [up, setUp] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let disposed = false;
    let chart;
    let series;
    let ws;
    let retry;

    const pair = toBinanceSymbol(symbol, "USDT");

    const boot = async () => {
      try {
        const candles = await fetchKlines(pair, "15m", 80);
        if (disposed || !candles.length) return;
        const last = candles[candles.length - 1];
        const first = candles[0];
        setPrice(last.close);
        setUp(last.close >= first.close);

        chart = createChart(el, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: BG },
            textColor: "#848e9c",
            fontSize: 10,
            fontFamily:
              "IBM Plex Sans, BinancePlex, -apple-system, sans-serif",
          },
          grid: {
            vertLines: { color: "rgba(255,255,255,0.05)" },
            horzLines: { color: "rgba(255,255,255,0.05)" },
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: {
            borderColor: "rgba(255,255,255,0.08)",
            scaleMargins: { top: 0.08, bottom: 0.12 },
          },
          timeScale: {
            borderColor: "rgba(255,255,255,0.08)",
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 2,
            barSpacing: 8,
          },
          handleScroll: false,
          handleScale: false,
        });
        try {
          chart.applyOptions({ layout: { attributionLogo: false } });
        } catch {
          /* ignore */
        }
        series = chart.addSeries(CandlestickSeries, {
          upColor: UP,
          downColor: DOWN,
          borderUpColor: UP,
          borderDownColor: DOWN,
          wickUpColor: UP,
          wickDownColor: DOWN,
        });
        series.setData(
          candles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        chart.timeScale().fitContent();

        const connect = () => {
          try {
            ws = new WebSocket(
              `wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@ticker`
            );
          } catch {
            retry = setTimeout(connect, 2500);
            return;
          }
          ws.onmessage = (ev) => {
            try {
              const d = JSON.parse(ev.data);
              const close = Number(d?.c ?? d?.p);
              if (!Number.isFinite(close) || !series) return;
              setPrice(close);
              const bar = candles[candles.length - 1];
              if (!bar) return;
              series.update({
                time: bar.time,
                open: bar.open,
                high: Math.max(bar.high, close),
                low: Math.min(bar.low, close),
                close,
              });
              setUp(close >= bar.open);
            } catch {
              /* ignore */
            }
          };
          ws.onclose = () => {
            if (!disposed) retry = setTimeout(connect, 2500);
          };
        };
        connect();
      } catch {
        /* keep empty panel */
      }
    };

    boot();
    return () => {
      disposed = true;
      clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      try {
        chart?.remove();
      } catch {
        /* ignore */
      }
    };
  }, [symbol]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e11] p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold tracking-wide text-white">
          {symbol}/USDT
        </span>
        <span
          className={`tabular-nums font-semibold ${
            up ? "text-[#0ecb81]" : "text-[#f6465d]"
          }`}
        >
          {price ? formatPrice(price) : "Live…"}
        </span>
      </div>
      <div ref={wrapRef} style={{ height }} className="w-full" />
    </div>
  );
}
