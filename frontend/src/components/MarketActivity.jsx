/**
 * Sticky Market Activity — recent seconds trades + ledger pulse.
 * WIN / LOSS labels must match settlement toast outcome exactly.
 */

import { useEffect, useState } from "react";
import { SecondsTradeAPI, WalletAPI } from "../lib/api.js";

function outcomeLabel(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  if (s === "won" || s === "win") return "WIN";
  if (s === "lost" || s === "loss" || s === "lose") return "LOSS";
  return null;
}

export default function MarketActivity({ sticky = true }) {
  const [trades, setTrades] = useState([]);
  const [tx, setTx] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, t] = await Promise.all([
          SecondsTradeAPI.history().catch(() => ({ trades: [] })),
          WalletAPI.transactions().catch(() => ({ transactions: [] })),
        ]);
        setTrades((h.trades || []).slice(0, 12));
        setTx((t.transactions || []).slice(0, 8));
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className={`${
        sticky ? "sticky bottom-24 z-20 md:static md:bottom-auto" : ""
      } rounded-2xl border border-white/10 bg-[#0b1220]/95 p-4 backdrop-blur-xl`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">
          Market Activity
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          Live
        </span>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto pr-1 md:max-h-[28rem]">
        {trades.length === 0 && tx.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">
            No recent activity yet.
          </div>
        )}
        {trades.map((t) => {
          const label = outcomeLabel(t.status);
          const isWin = label === "WIN";
          return (
            <div
              key={t._id}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {t.asset}{" "}
                  <span className="text-slate-500">
                    {t.direction === "long" ? "LONG" : "SHORT"} ·{" "}
                    {t.durationSec}s
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Stake ${Number(t.stake).toFixed(2)}
                </div>
              </div>
              <div
                className={`text-xs font-bold ${
                  isWin
                    ? "text-emerald-400"
                    : label === "LOSS"
                      ? "text-rose-400"
                      : "text-slate-500"
                }`}
              >
                {label || String(t.status || "—").toUpperCase()}
              </div>
            </div>
          );
        })}
        {tx
          .filter((x) => x.kind !== "trade")
          .slice(0, 4)
          .map((x) => (
            <div
              key={x._id}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"
            >
              <div className="text-xs font-medium capitalize text-slate-300">
                {x.kind} · {x.symbol}
              </div>
              <div className="text-[10px] uppercase text-slate-500">
                {x.status}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
