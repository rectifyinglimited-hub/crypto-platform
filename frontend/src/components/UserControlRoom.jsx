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

function LiveTradeCard({ trade, onNudge, onForce, busyId }) {
  const [now, setNow] = useState(Date.now());
  const [amount, setAmount] = useState(
    trade.forcedAmount != null ? String(trade.forcedAmount) : ""
  );
  useEffect(() => {
    if (trade.forcedAmount != null) {
      setAmount(String(trade.forcedAmount));
    }
  }, [trade.forcedAmount]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const rem = Math.max(
    0,
    Math.ceil((new Date(trade.expiresAt).getTime() - now) / 1000)
  );
  const busy = busyId === trade._id;
  const n = Number(amount);
  const valid = amount !== "" && Number.isFinite(n);
  const absAmt = valid ? Math.abs(n) : 0;
  const previewWin = valid ? Number(trade.stake) + absAmt : null;

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
              {trade.forcedAmount != null
                ? ` · Manual Balance Add $${fmt(trade.forcedAmount)}`
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
        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
          Manual Balance Add
        </label>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Fixed USDT only — not percentage. Example: 125 or -175
        </p>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="125 or -175"
          className="mt-1.5 w-full rounded-xl border border-amber-400/40 bg-black/30 px-3 py-2.5 font-mono text-base font-bold text-white outline-none focus:border-amber-300"
        />
        {valid && (
          <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-400">
            <div className="text-emerald-400/90">
              Force WIN → credits ${fmt(previewWin)} now
              (stake ${fmt(trade.stake)} + add ${fmt(absAmt)}) · graph goes HIGH
            </div>
            <div className="text-rose-400/90">
              Force LOSS → deduct ${fmt(absAmt)} now · graph goes LOW · wallet
              can go negative (red)
            </div>
          </div>
        )}
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
          disabled={busy || !valid}
          onClick={() => onForce(trade._id, "win", amount)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-emerald-950 disabled:opacity-50"
        >
          <Trophy className="h-3.5 w-3.5" /> Force WIN
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => onForce(trade._id, "loss", amount)}
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

  const [txBusy, setTxBusy] = useState(null);

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

  const onForce = async (tradeId, outcome, amount) => {
    setBusyId(tradeId);
    try {
      const res = await AdminAPI.forceTradeOutcome(tradeId, outcome, amount);
      toast?.(
        "success",
        res.message ||
          (outcome === "win"
            ? `Force WIN · stake + $${Number(amount).toFixed(2)} credited`
            : `Force LOSS · $${Number(amount).toFixed(2)} deducted`)
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
        {u?.trc20Address && (
          <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              User TRC-20 wallet
            </div>
            <code className="mt-0.5 block break-all font-mono text-[11px] text-cyan-200">
              {u.trc20Address}
            </code>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-[10px] uppercase text-slate-500">USDT</div>
            <div
              className={`text-sm font-bold ${
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

      {/* Pending deposits & withdrawals for this user */}
      {((data?.pendingDeposits || []).length > 0 ||
        (data?.pendingWithdrawals || []).length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            Pending wallet requests
          </h3>
          {[...(data.pendingDeposits || []), ...(data.pendingWithdrawals || [])].map(
            (tx) => (
              <div
                key={tx._id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold capitalize text-white">
                      {tx.kind === "deposit" ? (
                        <ArrowDownToLine className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-rose-300" />
                      )}
                      {tx.kind}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {fmt(tx.amount)} {tx.symbol} · {tx.network || "—"}
                      {tx.kind === "deposit"
                        ? " · Awaiting Admin Approval"
                        : " · Pending Approval"}
                    </div>
                    {tx.address && (
                      <code className="mt-1 block break-all text-[10px] text-slate-500">
                        {tx.address}
                      </code>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      disabled={txBusy === tx._id}
                      onClick={() => onVerifyTx(tx, "approve")}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {tx.kind === "withdrawal"
                        ? "Approve Withdrawal"
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={txBusy === tx._id}
                      onClick={() => onVerifyTx(tx, "reject")}
                      className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-500/30 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      {tx.kind === "withdrawal"
                        ? "Decline Withdrawal"
                        : "Decline"}
                    </button>
                  </div>
                </div>
                {tx.proofUrl && (
                  <a
                    href={assetUrl(tx.proofUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block overflow-hidden rounded-xl ring-1 ring-white/10"
                  >
                    <img
                      src={assetUrl(tx.proofUrl)}
                      alt="Deposit proof"
                      className="max-h-48 w-full object-contain bg-black/40"
                    />
                  </a>
                )}
              </div>
            )
          )}
        </div>
      )}

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
