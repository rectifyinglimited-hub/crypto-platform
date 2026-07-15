/**
 * Dedicated Trade History — won/lost seconds trades with profit/loss details.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trophy, Skull, History } from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SecondsTradeAPI.history();
      setTrades(res.trades || []);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const wins = trades.filter((t) => t.status === "won").length;
  const losses = trades.filter((t) => t.status === "lost").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <History className="h-5 w-5 text-cyan-400" />
            Trade History
          </h2>
          <p className="text-xs text-slate-500">
            All settled seconds trades · WON / LOST
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
          <div className="text-[10px] uppercase text-emerald-400/80">Won</div>
          <div className="text-xl font-bold text-emerald-300">{wins}</div>
        </div>
        <div className="rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-500/20">
          <div className="text-[10px] uppercase text-rose-400/80">Lost</div>
          <div className="text-xl font-bold text-rose-300">{losses}</div>
        </div>
      </div>

      <div className="space-y-2">
        {loading && trades.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && trades.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-xs text-slate-500">
            No settled trades yet. Place a seconds trade to see history here.
          </div>
        )}
        {trades.map((t) => {
          const won = t.status === "won";
          const profit = won
            ? Number(t.payout || 0) - Number(t.stake || 0)
            : 0;
          return (
            <div
              key={t._id}
              className={`rounded-2xl border p-4 ${
                won
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-rose-500/20 bg-rose-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    {won ? (
                      <Trophy className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Skull className="h-4 w-4 text-rose-400" />
                    )}
                    {t.asset} ·{" "}
                    {t.direction === "long" ? "LONG" : "SHORT"} ·{" "}
                    {t.durationSec}s
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Entry {fmt(t.entryPrice)}
                    {t.exitPrice != null ? ` → Exit ${fmt(t.exitPrice)}` : ""}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {fmtTime(t.settledAt || t.createdAt)}
                    {t.settleReason ? ` · ${t.settleReason}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xs font-bold uppercase ${
                      won ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {won ? "WON" : "LOST"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-200">
                    Stake ${fmt(t.stake)}
                  </div>
                  {won ? (
                    <div className="text-xs font-bold text-emerald-300">
                      +${fmt(profit)} profit
                      <span className="ml-1 text-slate-500">
                        ({t.payoutPercent || 85}%)
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-rose-300">
                      −${fmt(t.stake)} lost
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
