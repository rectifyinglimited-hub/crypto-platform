/**
 * Dedicated Trade History — won/lost seconds trades + daily P/L summaries.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trophy, Skull, History, Calendar } from "lucide-react";
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
  const [daily, setDaily] = useState([]);
  const [totals, setTotals] = useState({ wins: 0, losses: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SecondsTradeAPI.history();
      setTrades(res.trades || []);
      setDaily(res.daily || []);
      setTotals(res.totals || { wins: 0, losses: 0, net: 0 });
    } catch {
      setTrades([]);
      setDaily([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = daily.find((d) => d.date === todayKey);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <History className="h-5 w-5 text-cyan-400" />
            Trade History
          </h2>
          <p className="text-xs text-slate-500">
            Daily profit / loss · WON & LOST details
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

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
          <div className="text-[10px] uppercase text-emerald-400/80">Won</div>
          <div className="text-xl font-bold text-emerald-300">
            {totals.wins || 0}
          </div>
        </div>
        <div className="rounded-xl bg-rose-500/10 p-3 ring-1 ring-rose-500/20">
          <div className="text-[10px] uppercase text-rose-400/80">Lost</div>
          <div className="text-xl font-bold text-rose-300">
            {totals.losses || 0}
          </div>
        </div>
        <div className="rounded-xl bg-cyan-500/10 p-3 ring-1 ring-cyan-500/20">
          <div className="text-[10px] uppercase text-cyan-400/80">Net</div>
          <div
            className={`text-xl font-bold ${
              (totals.net || 0) >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {(totals.net || 0) >= 0 ? "+" : ""}
            ${fmt(totals.net)}
          </div>
        </div>
      </div>

      {/* Today + recent daily summaries */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Calendar className="h-4 w-4 text-cyan-400" />
          Daily summary
        </div>
        {today && (
          <div className="mb-2 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs ring-1 ring-cyan-500/20">
            <span className="font-semibold text-cyan-200">Today</span>
            <span className="ml-2 text-slate-400">
              {today.wins}W / {today.losses}L · Profit ${fmt(today.profit)} ·
              Lost ${fmt(today.lossAmount)} · Net{" "}
              <span
                className={
                  today.net >= 0 ? "text-emerald-300" : "text-rose-300"
                }
              >
                ${fmt(today.net)}
              </span>
            </span>
          </div>
        )}
        <div className="max-h-36 space-y-1.5 overflow-y-auto">
          {daily.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-500">
              No daily totals yet.
            </div>
          )}
          {daily.slice(0, 14).map((d) => (
            <div
              key={d.date}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-[11px]"
            >
              <span className="font-medium text-slate-300">{d.date}</span>
              <span className="text-slate-500">
                {d.wins}W/{d.losses}L
              </span>
              <span
                className={`font-bold ${
                  d.net >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {d.net >= 0 ? "+" : ""}
                ${fmt(d.net)}
              </span>
            </div>
          ))}
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
                      −${fmt(t.lossAmount || t.stake)} lost
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
