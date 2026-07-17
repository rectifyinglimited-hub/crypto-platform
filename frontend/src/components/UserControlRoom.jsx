/**
 * Per-user Admin Control Room — live Graph HIGH/LOW + manual wallet top-up.
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Timer,
  Loader2,
  Bell,
  RefreshCw,
  CheckCircle2,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { AdminAPI, assetUrl } from "../lib/api.js";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function LiveTradeCard({ trade, onGraph, busyId }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const rem = Math.max(
    0,
    Math.ceil((new Date(trade.expiresAt).getTime() - now) / 1000)
  );
  const busy = busyId === trade._id;
  const forced = trade.forcedOutcome;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="h-4 w-4 text-amber-300" />
            {trade.asset} · {trade.direction === "long" ? "LONG" : "SHORT"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Stake ${fmt(trade.stake)} · Entry {fmt(trade.entryPrice)}
          </div>
          {forced && (
            <div
              className={`mt-1 text-[11px] font-semibold uppercase ${
                forced === "win" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              Graph {forced === "win" ? "HIGH → WIN" : "LOW → LOSS"} locked
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 font-mono text-xl font-bold text-cyan-300">
            <Timer className="h-4 w-4" />
            {rem}s
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Graph HIGH → candles drift up slowly · WIN at timer 0. Graph LOW →
        candles drift down · LOSS at timer 0. Balance is updated separately
        above — trade never closes early.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "up")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-emerald-950 disabled:opacity-50"
        >
          <TrendingUp className="h-4 w-4" /> Graph HIGH
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "down")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-3 text-xs font-bold text-rose-950 disabled:opacity-50"
        >
          <TrendingDown className="h-4 w-4" /> Graph LOW
        </button>
      </div>
    </div>
  );
}

export default function UserControlRoom({ userId, onBack, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [topUp, setTopUp] = useState("");
  const [topUpBusy, setTopUpBusy] = useState(false);

  const [txBusy, setTxBusy] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        const res = await AdminAPI.userControlRoom(userId);
        setData(res);
      } catch (err) {
        if (!silent) {
          toast?.("error", err?.message || "Failed to load control room.");
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, toast]
  );

  const onVerifyTx = async (tx, action) => {
    setTxBusy(tx._id);
    try {
      await AdminAPI.verifyTransaction(tx._id, { action });
      toast?.(
        "success",
        action === "approve"
          ? `${tx.kind === "deposit" ? "Deposit" : "Withdrawal"} approved.`
          : `${tx.kind === "deposit" ? "Deposit" : "Withdrawal"} declined.`
      );
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Action failed.");
    } finally {
      setTxBusy(null);
    }
  };

  useEffect(() => {
    load({ silent: false });
    const id = setInterval(async () => {
      load({ silent: true });
      try {
        const res = await AdminAPI.activeSecondsTrades();
        const mine = (res.trades || []).filter(
          (t) => String(t.user?.id || t.user?._id || t.user) === String(userId)
        );
        setAlerts(mine);
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(id);
  }, [load, userId]);

  const onGraph = async (tradeId, direction) => {
    setBusyId(tradeId);
    try {
      const res = await AdminAPI.nudgeTradePrice(tradeId, direction);
      toast?.(
        "success",
        res.message ||
          (direction === "up"
            ? "Graph HIGH · candles rising · WIN locked"
            : "Graph LOW · candles falling · LOSS locked")
      );
      await load({ silent: true });
    } catch (err) {
      toast?.("error", err?.message || "Graph control failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading control room…
      </div>
    );
  }

  const u = data?.user;
  const openTrades = data?.openTrades?.length ? data.openTrades : alerts;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to users
        </button>
        <button
          type="button"
          onClick={() => load({ silent: false })}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
          Control Room
        </div>
        <div className="mt-1 text-xl font-bold text-white">
          {u?.fullName || u?.email || "User"}
        </div>
        <div className="text-xs text-slate-400">{u?.email}</div>
        {u?.trc20Address && (
          <div className="mt-2 break-all font-mono text-[10px] text-slate-500">
            User TRC-20 · {u.trc20Address}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">USDT</div>
            <div
              className={`mt-0.5 text-lg font-bold ${
                Number(u?.wallet?.USDT || 0) < 0
                  ? "text-rose-400"
                  : "text-white"
              }`}
            >
              {Number(u?.wallet?.USDT || 0) < 0 ? "-" : ""}$
              {fmt(Math.abs(Number(u?.wallet?.USDT || 0)))}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">
              Trade Control
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-200">
              {u?.tradeControlState === "force_win"
                ? "Force Win"
                : u?.tradeControlState === "force_loss"
                  ? "Force Loss"
                  : "Normal"}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">
              Open Trades
            </div>
            <div className="mt-0.5 text-lg font-bold text-white">
              {openTrades?.length || 0}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">Status</div>
            <div
              className={`mt-0.5 text-sm font-semibold ${
                u?.banned ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {u?.banned ? "Banned" : "Active"}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Add USDT to Trading Wallet
          </label>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Precise decimals supported (e.g. 0.09, 10.55, −175). Graph HIGH/LOW
            only control candles + win/loss — timer always runs to 0.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              step="any"
              value={topUp}
              onChange={(e) => setTopUp(e.target.value)}
              placeholder="e.g. 0.09 or 10.55"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
            />
            <button
              type="button"
              disabled={topUpBusy}
              onClick={async () => {
                const n = Number(topUp);
                if (!Number.isFinite(n) || n === 0) {
                  toast?.("error", "Enter a non-zero amount.");
                  return;
                }
                setTopUpBusy(true);
                try {
                  await AdminAPI.updateBalance(userId, {
                    symbol: "USDT",
                    amount: n,
                    mode: "add",
                  });
                  toast?.(
                    "success",
                    `Wallet adjusted by ${n} USDT (precise)`
                  );
                  setTopUp("");
                  await load();
                } catch (err) {
                  toast?.("error", err?.message || "Balance update failed");
                } finally {
                  setTopUpBusy(false);
                }
              }}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-cyan-950 disabled:opacity-50"
            >
              {topUpBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Wallet"
              )}
            </button>
          </div>
          <button
            type="button"
            disabled={topUpBusy}
            onClick={async () => {
              const ok = window.confirm(
                "Clear this user's Trading Wallet to exactly $0.00 USDT?"
              );
              if (!ok) return;
              setTopUpBusy(true);
              try {
                await AdminAPI.updateBalance(userId, {
                  symbol: "USDT",
                  amount: 0,
                  mode: "set",
                });
                toast?.("success", "Balance cleared to $0.00 USDT");
                await load({ silent: true });
              } catch (err) {
                toast?.("error", err?.message || "Clear balance failed");
              } finally {
                setTopUpBusy(false);
              }
            }}
            className="mt-2 w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-bold text-rose-300 disabled:opacity-50"
          >
            Clear Balance
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
          Live Trade Alerts
        </div>
        {openTrades?.length ? (
          <div className="space-y-3">
            {openTrades.map((t) => (
              <LiveTradeCard
                key={t._id}
                trade={t}
                onGraph={onGraph}
                busyId={busyId}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
            Waiting for this user to open a seconds trade…
          </div>
        )}
      </div>

      {/* Pending deposit / withdraw proofs */}
      {!!(data?.pendingDeposits?.length || data?.pendingWithdrawals?.length) && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pending Transactions
          </div>
          <div className="space-y-2">
            {[
              ...(data?.pendingDeposits || []),
              ...(data?.pendingWithdrawals || []),
            ].map((tx) => (
              <div
                key={tx._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1424] p-3"
              >
                <div className="flex items-center gap-2 text-sm text-white">
                  {tx.kind === "deposit" ? (
                    <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="font-semibold capitalize">{tx.kind}</span>
                  <span className="text-slate-400">
                    ${fmt(tx.usdValue || tx.amount)} {tx.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tx.proofUrl && (
                    <a
                      href={assetUrl(tx.proofUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 underline"
                    >
                      Proof
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={txBusy === tx._id}
                    onClick={() => onVerifyTx(tx, "approve")}
                    className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                  >
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={txBusy === tx._id}
                    onClick={() => onVerifyTx(tx, "reject")}
                    className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-300"
                  >
                    <X className="mr-1 inline h-3 w-3" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent Settled
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {(data?.recentTrades || []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No settled trades yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {(data?.recentTrades || []).map((t) => (
                <li
                  key={t._id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="text-slate-300">
                    <span className="font-semibold text-white">
                      {t.asset} {t.direction}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      · ${fmt(t.stake)}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                      t.status === "won"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {t.status === "won" ? "WON" : "LOST"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
