import { useEffect, useMemo, useState } from "react";
import { SecondsTradeAPI } from "../lib/api.js";

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

export default function NeonLiveGraph({ symbol = "BTC", height = 160 }) {
  const [price, setPrice] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const ingest = (p) => {
      if (!Number.isFinite(p) || p <= 0) return;
      setPrice(p);
      setSeries((prev) => {
        const next = [...prev, p];
        return next.slice(-48);
      });
    };

    SecondsTradeAPI.publicMarkets()
      .then((res) => {
        if (cancelled) return;
        const m = (res.markets || []).find((x) => x.asset === symbol);
        if (m) ingest(Number(m.price));
      })
      .catch(() => {});

    const stream = `${symbol.toLowerCase()}usdt@ticker`;
    let ws;
    let retry;
    const connect = () => {
      try {
        ws = new WebSocket(
          `wss://stream.binance.com:9443/ws/${stream}`
        );
      } catch {
        retry = setTimeout(connect, 2500);
        return;
      }
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          ingest(Number(d?.c ?? d?.p));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        if (!cancelled) retry = setTimeout(connect, 2500);
      };
    };
    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [symbol]);

  const path = useMemo(() => {
    const data =
      series.length >= 2
        ? series
        : Array.from({ length: 24 }, (_, i) => 100 + Math.sin(i / 2) * 4 + i * 0.2);
    const W = 560;
    const H = height;
    const pad = 8;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((v, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
        const y = pad + ((max - v) / range) * (H - pad * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [series, height]);

  const up =
    series.length >= 2 ? series[series.length - 1] >= series[0] : true;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#ffc107]/25 bg-black/50 p-3 shadow-[0_0_28px_rgba(255,193,7,0.12)]">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold tracking-wide text-white">
          {symbol}/USDT
        </span>
        <span
          className={`tabular-nums font-semibold ${
            up ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {price ? formatPrice(price) : "Live…"}
        </span>
      </div>
      <svg viewBox={`0 0 560 ${height}`} className="h-36 w-full sm:h-40">
        <defs>
          <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe14d" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke="url(#neonStroke)"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(255,193,7,0.7))" }}
        />
      </svg>
    </div>
  );
}
