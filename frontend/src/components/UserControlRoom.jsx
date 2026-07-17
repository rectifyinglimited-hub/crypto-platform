/**
 * Per-user Admin Control Room — live trades, graph UP/DOWN, Win/Loss.
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trophy,
  Skull,
  Timer,
  Loader2,
  Bell,
  RefreshCw,
} from "lucide-react";
import { AdminAPI } from "../lib/api.js";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function LiveTradeCard({ trade, onNudge, onForce, busyId }) {
  const [now, setNow] = useState(Date.now());
  const [pct, setPct] = useState(
    String(trade.payoutPercent || trade.user?.tradeControlPercentage || 10)
  );
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const rem = Math.max(
    0,
    Math.ceil((new Date(trade.expiresAt).getTime() - now) / 1000)
  );
  const busy = busyId === trade._id;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="h-4 w-4 text-amber-300" />
            {trade.asset} · {trade.direction === "long" ? "LONG" : "SHORT"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Stake ${fmt(trade.stake)} · Entry {fmt(trade.entryPrice)} · Bias{" "}
            {Number(trade.priceBiasPercent || 0).toFixed(2)}%
          </div>
          {trade.forcedOutcome && (
            <div className="mt-1 text-[11px] font-semibold uppercase text-amber-300">
              Forced: {trade.forcedOutcome}
              {trade.payoutPercent != null
                ? ` @ ${trade.payoutPercent}%`
                : ""}
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

      <div className="mt-3">
        <label className="text-[10px] uppercase tracking-wider text-slate-500">
          Profit % (for Force WIN)
        </label>
        <input
          type="number"
          min={0}
          max={200}
          step="1"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onNudge(trade._id, "up")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 py-2.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 disabled:opacity-50"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Graph UP
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onNudge(trade._id, "down")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 py-2.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 disabled:opacity-50"
        >
          <TrendingDown className="h-3.5 w-3.5" /> Graph DOWN
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onForce(trade._id, "win", pct)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-emerald-950 disabled:opacity-50"
        >
          <Trophy className="h-3.5 w-3.5" /> Force WIN
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onForce(trade._id, "loss")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-rose-950 disabled:opacity-50"
        >
          <Skull className="h-3.5 w-3.5" /> Force LOSS
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

  const load = useCallback(async () => {
    try {
      const res = await AdminAPI.userControlRoom(userId);
      setData(res);
    } catch (err) {
      toast?.("error", err?.message || "Failed to load control room.");
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Poll this user + global active trades for alerts
  useEffect(() => {
    load();
    const id = setInterval(async () => {
      load();
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

  const onNudge = async (tradeId, direction) => {
    setBusyId(tradeId);
    try {
      await AdminAPI.nudgeTradePrice(tradeId, direction);
      toast?.(
        "success",
        direction === "up" ? "Graph nudged UP" : "Graph nudged DOWN"
      );
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Nudge failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onForce = async (tradeId, outcome, percentage) => {
    setBusyId(tradeId);
    try {
      await AdminAPI.forceTradeOutcome(tradeId, outcome, percentage);
      toast?.(
        "success",
        outcome === "win"
          ? `Forced WIN @ ${percentage || "default"}%`
          : "Forced LOSS locked in"
      );
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Force failed.");
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
  const openTrades = data?.openTrades?.length
    ? data.openTrades
    : alerts;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to users
        </button>
        <button
          type="button"
          onClick={load}
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
          {u?.fullName}
        </div>
        <div className="text-xs text-slate-400">
          @{u?.username} · {u?.email}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">USDT</div>
            <div className="text-sm font-bold">
              ${fmt(u?.wallet?.USDT)}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">
              Trade Control
            </div>
            <div className="text-sm font-bold capitalize">
              {(u?.tradeControlState || "normal").replace("_", " ")}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">Open</div>
            <div className="text-sm font-bold">{openTrades.length}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">Status</div>
            <div className="text-sm font-bold">
              {u?.banned ? "Banned" : "Active"}
            </div>
          </div>
        </div>

        {/* Quick Trading Wallet top-up */}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] flex-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-500">
              Add USDT to Trading Wallet
            </label>
            <input
              type="number"
              step="any"
              value={topUp}
              onChange={(e) => setTopUp(e.target.value)}
              placeholder="e.g. 500"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
            />
          </div>
          <button
            type="button"
            disabled={topUpBusy || !topUp}
            onClick={async () => {
              const n = Number(topUp);
              if (!Number.isFinite(n) || n === 0) return;
              setTopUpBusy(true);
              try {
                await AdminAPI.updateBalance(userId, {
                  symbol: "USDT",
                  amount: n,
                  mode: "add",
                });
                toast?.("success", `Added ${n} USDT to Trading Wallet`);
                setTopUp("");
                await load();
              } catch (err) {
                toast?.("error", err?.message || "Balance update failed");
              } finally {
                setTopUpBusy(false);
              }
            }}
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50"
          >
            {topUpBusy ? "Saving…" : "Update Wallet"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-amber-300" />
          Live trade alerts
          {openTrades.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
              {openTrades.length}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          <AnimatePresence>
            {openTrades.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-xs text-slate-500">
                Waiting for this user to open a seconds trade…
              </div>
            )}
            {openTrades.map((t) => (
              <motion.div
                key={t._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <LiveTradeCard
                  trade={t}
                  onNudge={onNudge}
                  onForce={onForce}
                  busyId={busyId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {!!data?.recentTrades?.length && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Recent settled</h3>
          <div className="space-y-2">
            {data.recentTrades.slice(0, 8).map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs"
              >
                <span>
                  {t.asset} {t.direction} · ${fmt(t.stake)}
                </span>
                <span
                  className={
                    t.status === "won" ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {t.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact floating alert strip for admin overview */
export function ActiveTradesAlertBar({ onOpenUser }) {
  const [trades, setTrades] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await AdminAPI.activeSecondsTrades();
        setTrades(res.trades || []);
      } catch {
        /* ignore */
      }
    };
    load();
    const a = setInterval(load, 2000);
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(a);
      clearInterval(t);
    };
  }, []);

  if (!trades.length) return null;

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-200">
        Live seconds trades · {trades.length}
      </div>
      {trades.slice(0, 5).map((t) => {
        const rem = Math.max(
          0,
          Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000)
        );
        const uid = t.user?.id || t.user?._id || t.user;
        return (
          <button
            key={t._id}
            type="button"
            onClick={() => uid && onOpenUser?.(String(uid))}
            className="flex w-full items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-left text-xs hover:bg-black/30"
          >
            <span className="font-medium text-white">
              {t.user?.fullName || t.user?.username || "User"} · {t.asset}{" "}
              {t.direction} ${fmt(t.stake)}
            </span>
            <span className="font-mono font-bold text-cyan-300">{rem}s</span>
          </button>
        );
      })}
    </div>
  );
}
