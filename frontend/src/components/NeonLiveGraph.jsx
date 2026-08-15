/**
 * Binance-style candles that play like a looping video, then stay live.
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

export default function NeonLiveGraph({
  symbol = "BTC",
  height = 220,
  compact = false,
}) {
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
    let play;

    const pair = toBinanceSymbol(symbol, "USDT");

    const boot = async () => {
      try {
        const candles = await fetchKlines(pair, "1m", 90);
        if (disposed || !candles.length) return;
        const mapped = candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        const last = mapped[mapped.length - 1];
        setPrice(last.close);
        setUp(last.close >= mapped[0].close);

        chart = createChart(el, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: BG },
            textColor: "#848e9c",
            fontSize: compact ? 9 : 10,
            fontFamily:
              "IBM Plex Sans, BinancePlex, -apple-system, sans-serif",
          },
          grid: {
            vertLines: { color: "rgba(255,255,255,0.05)" },
            horzLines: { color: "rgba(255,255,255,0.05)" },
          },
          crosshair: { mode: CrosshairMode.Magnet },
          rightPriceScale: {
            borderColor: "rgba(255,255,255,0.08)",
            scaleMargins: { top: 0.08, bottom: 0.1 },
          },
          timeScale: {
            borderColor: "rgba(255,255,255,0.08)",
            timeVisible: !compact,
            secondsVisible: false,
            rightOffset: 3,
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
        series = chart.addSeries(CandlestickSeries, {
          upColor: UP,
          downColor: DOWN,
          borderUpColor: UP,
          borderDownColor: DOWN,
          wickUpColor: UP,
          wickDownColor: DOWN,
        });

        const startCount = Math.min(18, mapped.length);
        let idx = startCount;
        series.setData(mapped.slice(0, startCount));
        chart.timeScale().fitContent();

        const tick = () => {
          if (disposed || !series) return;
          if (idx >= mapped.length) {
            idx = startCount;
            series.setData(mapped.slice(0, startCount));
          } else {
            series.update(mapped[idx]);
            idx += 1;
          }
          try {
            chart.timeScale().scrollToRealTime();
          } catch {
            /* ignore */
          }
        };
        play = setInterval(tick, 220);

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
              if (!Number.isFinite(close)) return;
              setPrice(close);
              const open = Number(d?.o);
              setUp(Number.isFinite(open) ? close >= open : true);
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
        /* empty */
      }
    };

    boot();
    return () => {
      disposed = true;
      clearInterval(play);
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
  }, [symbol, compact]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e11] p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-bold tracking-wide text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0ecb81]" />
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
