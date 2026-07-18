/**
 * Per-user Admin Control Room — live Graph / Force controls + wallet top-up.
 * Live trade cards: Manual Balance Add + Force WIN/LOSS settle math at timer 0.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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
import { onSocketEvent } from "../lib/socket.js";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function biasLabel(trade) {
  // Direction-aware: LONG win↑/loss↓ · SHORT win↓/loss↑
  const dir = String(trade.direction || "").toLowerCase();
  const forced = trade.forcedOutcome;
  if (forced === "win" || forced === "loss") {
    const goUp =
      (forced === "win" && dir === "long") ||
      (forced === "loss" && dir === "short");
    return goUp ? "Graph UP" : "Graph DOWN";
  }
  const b = Number(trade.priceBiasPercent || 0);
  if (b > 0.01) return `UP ${b.toFixed(2)}%`;
  if (b < -0.01) return `DOWN ${Math.abs(b).toFixed(2)}%`;
  return "Neutral";
}

function LiveTradeCard({ trade, onGraph, onForce, busyId }) {
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
  const forced = trade.forcedOutcome;
  const bias = biasLabel(trade);
  const n = parseFloat(amount);
  const valid = amount !== "" && Number.isFinite(n);
  const absAmt = valid ? Math.abs(n) : 0;
  const stake = parseFloat(trade.stake) || 0;
  const previewWin = valid ? stake + absAmt : null;
  const previewLossReturn = valid ? stake - absAmt : null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="h-4 w-4 text-amber-300" />
            {trade.asset}/USDT ·{" "}
            {trade.direction === "long" ? "LONG" : "SHORT"}
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-slate-400">
            <div>Stake ${fmt(trade.stake)}</div>
            <div>Entry {fmt(trade.entryPrice)}</div>
            <div>
              Bias{" "}
              <span
                className={
                  forced === "win" || bias.startsWith("UP") || bias === "Graph UP"
                    ? "text-emerald-300"
                    : forced === "loss" ||
                        bias.startsWith("DOWN") ||
                        bias === "Graph DOWN"
                      ? "text-rose-300"
                      : "text-slate-300"
                }
              >
                {bias}
              </span>
            </div>
          </div>
          {forced && (
            <div
              className={`mt-1 text-[11px] font-semibold uppercase ${
                forced === "win" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {forced === "win" ? "WIN locked" : "LOSS locked"} · settles at 0s
              {trade.forcedAmount != null &&
                ` · $${fmt(Math.abs(Number(trade.forcedAmount)))}`}
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
        <label className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
          Manual Balance Add
        </label>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 25 or 0.09"
          className="mt-1 w-full rounded-xl border border-amber-400/30 bg-white/5 px-3 py-2.5 font-mono text-sm font-semibold text-white outline-none focus:border-amber-400/60"
        />
        {valid && (
          <div className="mt-1.5 space-y-0.5 text-[10px]">
            <div className="text-emerald-400/90">
              Force WIN / Graph UP — credits ${fmt(previewWin)} (stake +{" "}
              {fmt(absAmt)})
            </div>
            <div className="text-rose-400/90">
              Force LOSS / Graph DOWN — returns ${fmt(previewLossReturn)} (stake
              − {fmt(absAmt)})
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "up", valid ? amount : undefined)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 py-2.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 disabled:opacity-50"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Graph UP
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "down", valid ? amount : undefined)}
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

/** Overview sticky bar — open seconds trades across all users */
export function ActiveTradesAlertBar({ onOpenUser }) {
  const [trades, setTrades] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await AdminAPI.activeSecondsTrades();
        if (alive) setTrades(res.trades || []);
      } catch {
        /* ignore */
      }
    };
    pull();
    const poll = setInterval(pull, 1500);
    const tick = setInterval(() => setNow(Date.now()), 250);
    const offOpen = onSocketEvent("trade:opened", () => {
      pull();
    });
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
      offOpen();
    };
  }, []);

  if (!trades.length) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
        Live Trade Alerts
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {trades.map((t) => {
          const rem = Math.max(
            0,
            Math.ceil((new Date(t.expiresAt).getTime() - now) / 1000)
          );
          const uid = t.user?.id || t.user?._id || t.user;
          const name =
            t.user?.fullName || t.user?.email || t.user?.username || "User";
          return (
            <button
              key={t._id}
              type="button"
              onClick={() => uid && onOpenUser?.(String(uid))}
              className="min-w-[200px] shrink-0 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-left"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
                <span>
                  {t.asset} · {t.direction === "long" ? "LONG" : "SHORT"}
                </span>
                <span className="font-mono text-cyan-300">{rem}s</span>
              </div>
              <div className="mt-0.5 truncate text-[10px] text-slate-400">
                {name} · ${fmt(t.stake)}
              </div>
              {t.forcedOutcome && (
                <div
                  className={`mt-0.5 text-[10px] font-semibold uppercase ${
                    t.forcedOutcome === "win"
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }`}
                >
                  {t.forcedOutcome === "win" ? "WIN locked" : "LOSS locked"}
                </div>
              )}
            </button>
          );
        })}
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
  const [accessBusy, setAccessBusy] = useState(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await AdminAPI.userControlRoom(userId);
      setData(res);
    } catch (err) {
      if (err?.canceled) return;
      if (!silent && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onVerifyTx = async (tx, action) => {
    setTxBusy(tx._id);
    try {
      await AdminAPI.verifyTransaction(tx._id, { action });
      toastRef.current?.(
        "success",
        action === "approve"
          ? `${tx.kind === "deposit" ? "Deposit" : "Withdrawal"} approved.`
          : `${tx.kind === "deposit" ? "Deposit" : "Withdrawal"} declined.`
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setTxBusy(null);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await AdminAPI.userControlRoom(userId);
        if (alive) setData(res);
      } catch (err) {
        if (alive && !err?.canceled && err?.message) {
          toastRef.current?.("error", err.message);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const id = setInterval(async () => {
      try {
        const res = await AdminAPI.userControlRoom(userId);
        if (alive) setData(res);
      } catch {
        /* silent poll */
      }
      try {
        const res = await AdminAPI.activeSecondsTrades();
        if (!alive) return;
        const mine = (res.trades || []).filter(
          (t) => String(t.user?.id || t.user?._id || t.user) === String(userId)
        );
        setAlerts(mine);
      } catch {
        /* ignore */
      }
    }, 2000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  const onGraph = async (tradeId, direction, amount) => {
    setBusyId(tradeId);
    try {
      const res = await AdminAPI.nudgeTradePrice(
        tradeId,
        direction,
        undefined,
        amount
      );
      toastRef.current?.(
        "success",
        res.message ||
          (direction === "up"
            ? "Graph UP · candles rising · WIN locked · timer continues"
            : "Graph DOWN · candles falling · LOSS locked · timer continues")
      );
      await load({ silent: true });
    } catch (err) {
      if (err?.canceled) return;
      // Server may have applied the stamp after a client timeout — verify
      await load({ silent: true });
      if (err?.message) toastRef.current?.("error", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onForce = async (tradeId, outcome, amount) => {
    setBusyId(tradeId);
    try {
      const res = await AdminAPI.forceTradeOutcome(tradeId, outcome, amount);
      toastRef.current?.(
        "success",
        res.message ||
          (outcome === "win"
            ? "Force WIN locked · timer continues to 0"
            : "Force LOSS locked · timer continues to 0")
      );
      await load({ silent: true });
    } catch (err) {
      if (err?.canceled) return;
      await load({ silent: true });
      if (err?.message) toastRef.current?.("error", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onTradingAccess = async (allowed) => {
    setAccessBusy(true);
    try {
      const res = await AdminAPI.setUserTradingAccess(userId, allowed);
      toastRef.current?.(
        "success",
        res.message ||
          (allowed ? "User trading allowed." : "User trading blocked.")
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setAccessBusy(false);
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

        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            User Trading Access
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Block or allow this user independently of the global trading switch.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={accessBusy || u?.tradingAllowed !== false}
              onClick={() => onTradingAccess(true)}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-950 disabled:opacity-40"
            >
              Allow Trading
            </button>
            <button
              type="button"
              disabled={accessBusy || u?.tradingAllowed === false}
              onClick={() => onTradingAccess(false)}
              className="rounded-xl bg-rose-500/90 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-50 disabled:opacity-40"
            >
              Block Trading
            </button>
          </div>
          <div
            className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${
              u?.tradingAllowed === false ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {u?.tradingAllowed === false ? "Trading blocked" : "Trading allowed"}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Add USDT to Trading Wallet
          </label>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Precise decimals (e.g. 0.09, 10.55, −175).
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
                  toastRef.current?.(
                    "success",
                    `Wallet adjusted by ${n} USDT (precise)`
                  );
                  setTopUp("");
                  await load();
                } catch (err) {
                  if (!err?.canceled && err?.message) {
                    toastRef.current?.("error", err.message);
                  }
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
                toastRef.current?.("success", "Balance cleared to $0.00 USDT");
                await load({ silent: true });
              } catch (err) {
                if (!err?.canceled && err?.message) {
                  toastRef.current?.("error", err.message);
                }
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
                onForce={onForce}
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
