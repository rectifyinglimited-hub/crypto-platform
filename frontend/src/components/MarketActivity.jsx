/**
 * Sticky Market Activity — recent seconds trades + ledger pulse.
 */

import { useEffect, useState } from "react";
import { SecondsTradeAPI, WalletAPI } from "../lib/api.js";

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
        sticky ? "sticky bottom-24 z-20" : ""
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

      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {trades.length === 0 && tx.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">
            No recent activity yet.
          </div>
        )}
        {trades.map((t) => (
          <div
            key={t._id}
            className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2"
          >
            <div>
              <div className="text-xs font-semibold text-slate-200">
                {t.asset}{" "}
                <span className="text-slate-500">
                  {t.direction === "long" ? "LONG" : "SHORT"} · {t.durationSec}s
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Stake ${Number(t.stake).toFixed(2)}
              </div>
            </div>
            <div
              className={`text-xs font-bold ${
                t.status === "won" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {t.status === "won" ? "WIN" : "LOSS"}
            </div>
          </div>
        ))}
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
