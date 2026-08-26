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
  Bot,
  Copy,
} from "lucide-react";
import { AdminAPI, AiBotAPI, assetUrl } from "../lib/api.js";
import { onSocketEvent } from "../lib/socket.js";
import { sourceLabel } from "../lib/marketAssets.js";

const AI_BOT_DAY_PRESETS = [7, 15, 30, 40, 60, 90];

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const SMART_COPY_BLOCKS = ["Block 1", "Block 2", "Block 3", "Block 4"];
const WALLET_SOURCES = [
  { id: "admin_credit", label: "Admin credit" },
  { id: "smart_copy", label: "Smart Spot Trade" },
  { id: "ai_future", label: "AI Futures Strategy" },
];

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
            {trade.asset}/{trade.quote || "USDT"} ·{" "}
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
                  {t.asset}/{t.quote || "USDT"} · {t.direction === "long" ? "LONG" : "SHORT"}
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
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [botDays, setBotDays] = useState("");
  const [botYield, setBotYield] = useState("");
  const [botBusy, setBotBusy] = useState(false);
  const [forceBusy, setForceBusy] = useState(false);
  const [forcePct, setForcePct] = useState("85");
  const [vipBusy, setVipBusy] = useState(false);
  const [vipLevelBusy, setVipLevelBusy] = useState(false);
  const [vipLevelEdit, setVipLevelEdit] = useState("0");
  const [scMaxSlots, setScMaxSlots] = useState(1);
  const [scSlots, setScSlots] = useState(() =>
    [0, 1, 2, 3].map((slot) => ({ slot, enabled: true, readyAt: "" }))
  );
  const [scBusy, setScBusy] = useState(false);
  const [scCredit, setScCredit] = useState("");
  const [scCommission, setScCommission] = useState("0");
  const [scMode, setScMode] = useState("auto");
  const [topUpSource, setTopUpSource] = useState("admin_credit");
  const scHydratedFor = useRef(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await AdminAPI.userControlRoom(userId);
      setData(res);
      const u = res?.user;
      if (u) {
        setBotDays(
          u.aiBotAssignedLockDays != null
            ? String(u.aiBotAssignedLockDays)
            : ""
        );
        setBotYield(
          u.aiBotCustomPercentage != null
            ? String(u.aiBotCustomPercentage)
            : "8"
        );
        setForcePct(
          u.tradeControlPercentage != null
            ? String(u.tradeControlPercentage)
            : "85"
        );
        setVipLevelEdit(String(u.vipLevel ?? 0));
      }
    } catch (err) {
      if (err?.canceled) return;
      if (!silent && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const hydrateSmartCopy = (sc) => {
    if (!sc) return;
    setScMaxSlots(Number(sc.maxSlots || 1));
    setScCommission(
      sc.commissionPct != null ? String(sc.commissionPct) : "0"
    );
    setScMode(sc.commissionMode === "manual" ? "manual" : "auto");
    setScSlots(
      [0, 1, 2, 3].map((slot) => {
        const s = (sc.slots || []).find((x) => Number(x.slot) === slot);
        return {
          slot,
          enabled: s ? s.enabled !== false : true,
          readyAt: toLocalInput(s?.readyAt),
        };
      })
    );
  };

  useEffect(() => {
    scHydratedFor.current = null;
  }, [userId]);

  useEffect(() => {
    const sc = data?.user?.smartCopy;
    if (!sc || scHydratedFor.current === userId) return;
    hydrateSmartCopy(sc);
    scHydratedFor.current = userId;
  }, [data, userId]);

  const onSaveSmartCopy = async () => {
    const max = Math.min(4, Math.max(1, Number(scMaxSlots) || 1));
    setScBusy(true);
    try {
      const res = await AdminAPI.saveSmartCopy(userId, {
        maxSlots: max,
        commissionMode: scMode,
        commissionPct: Number(scCommission) || 0,
        slots: scSlots.map((s) => ({
          slot: s.slot,
          enabled: Boolean(s.enabled),
          readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
        })),
      });
      if (res?.smartCopy) hydrateSmartCopy(res.smartCopy);
      toastRef.current?.("success", res.message || "Smart Spot Trade saved.");
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setScBusy(false);
    }
  };

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

  const onChartQuote = async (next) => {
    setQuoteBusy(true);
    try {
      const res = await AdminAPI.setChartQuote(userId, next);
      toastRef.current?.(
        "success",
        res.message ||
          (next ? `User desk locked to ${next}` : "User can pick USDT or USDC")
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setQuoteBusy(false);
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

  const onAssignAiBot = async () => {
    const days = Number(botDays);
    const pct = Number(botYield);
    if (!Number.isFinite(days) || days < 1) {
      toastRef.current?.("error", "Select or enter lock days (e.g. 40).");
      return;
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 500) {
      toastRef.current?.("error", "Enter a valid daily commission % (0–500).");
      return;
    }
    setBotBusy(true);
    try {
      const res = await AiBotAPI.adminSetUserBot(userId, {
        aiBotAssignedLockDays: days,
        aiBotCustomPercentage: pct,
      });
      toastRef.current?.(
        "success",
        res.message || `AI Bot assigned: ${days} days · ${pct}% daily commission.`
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setBotBusy(false);
    }
  };

  const onDefaultForce = async (state) => {
    const percentage = Number(forcePct);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toastRef.current?.("error", "Profit/loss % must be 0–100.");
      return;
    }
    setForceBusy(true);
    try {
      const res = await AdminAPI.setTradeControl(userId, {
        state,
        percentage,
      });
      toastRef.current?.(
        "success",
        res.message ||
          (state === "normal"
            ? "Cleared — normal trading."
            : `Default ${state === "force_win" ? "PROFIT" : "LOSS"} locked for this user.`)
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setForceBusy(false);
    }
  };

  const onVip = async (vip) => {
    setVipBusy(true);
    try {
      const res = await AdminAPI.setUserVip(userId, vip);
      toastRef.current?.(
        "success",
        res.message || (vip ? "VIP granted." : "VIP revoked.")
      );
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setVipBusy(false);
    }
  };

  const onVipLevel = async () => {
    const level = Number(vipLevelEdit);
    if (!Number.isFinite(level) || level < 0 || level > 20) {
      toastRef.current?.("error", "VIP level must be 0–20.");
      return;
    }
    setVipLevelBusy(true);
    try {
      const res = await AdminAPI.setUserVipLevel(userId, {
        vipLevel: level,
        locked: true,
      });
      toastRef.current?.("success", res.message || `VIP level ${level}.`);
      await load({ silent: true });
    } catch (err) {
      if (!err?.canceled && err?.message) {
        toastRef.current?.("error", err.message);
      }
    } finally {
      setVipLevelBusy(false);
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

        <div className="mt-4 rounded-xl border border-[#00C2B3]/35 bg-[#00C2B3]/5 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#00C2B3]">
            VIP lounge
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Grant VIP so this user sees the neon VIP desk, perks, and live graph lounge.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={vipBusy || u?.vipStatus}
              onClick={() => onVip(true)}
              className="rounded-xl bg-[#00C2B3] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#1a1400] disabled:opacity-40"
            >
              Grant VIP
            </button>
            <button
              type="button"
              disabled={vipBusy || !u?.vipStatus}
              onClick={() => onVip(false)}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300 disabled:opacity-40"
            >
              Revoke VIP
            </button>
          </div>
          <div
            className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${
              u?.vipStatus ? "text-[#00C2B3]" : "text-slate-500"
            }`}
          >
            {u?.vipStatus ? "VIP lounge active" : "Standard lounge"} · Level{" "}
            {u?.vipLevel ?? 0}
            {u?.vipLevelLocked ? " · manual lock" : " · auto-upgrade on"}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="text-[10px] font-semibold uppercase text-slate-500">
              Manual VIP level
              <input
                type="number"
                min={0}
                max={20}
                value={vipLevelEdit}
                onChange={(e) => setVipLevelEdit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={vipLevelBusy}
                onClick={onVipLevel}
                className="w-full rounded-xl bg-[#00C2B3] px-3 py-2 text-xs font-bold uppercase text-[#1a1400] disabled:opacity-40"
              >
                {vipLevelBusy ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Set level"
                )}
              </button>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            30d volume {fmt(u?.volume30d || 0)} · {u?.activeTradingDays || 0}{" "}
            active trading days · code {u?.referralCode || "—"}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Trade pair quote
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            If they trade BTC/USDT, lock USDC to show BTC/USDC on their desk and chart.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["USDT", "USDC"].map((q) => (
              <button
                key={q}
                type="button"
                disabled={quoteBusy}
                onClick={() => onChartQuote(q)}
                className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-40 ${
                  u?.chartQuote === q
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                Show {q}
              </button>
            ))}
            <button
              type="button"
              disabled={quoteBusy}
              onClick={() => onChartQuote(null)}
              className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-40 ${
                !u?.chartQuote
                  ? "bg-white/10 text-white"
                  : "border border-white/10 text-slate-400"
              }`}
            >
              User choice
            </button>
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80">
            {u?.chartQuote
              ? `Locked · user sees /${u.chartQuote}`
              : "User picks USDT or USDC"}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/5 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
            Force Profit / Loss (this user)
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Default for all new Delivery trades by this user. Open live trades below
            can still use Graph UP/DOWN or Force WIN/LOSS per trade.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Amount %
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={forcePct}
                onChange={(e) => setForcePct(e.target.value)}
                className="mt-1 w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={forceBusy}
              onClick={() => onDefaultForce("force_win")}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold uppercase text-emerald-950 disabled:opacity-50"
            >
              Force Profit
            </button>
            <button
              type="button"
              disabled={forceBusy}
              onClick={() => onDefaultForce("force_loss")}
              className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold uppercase text-white disabled:opacity-50"
            >
              Force Loss
            </button>
            <button
              type="button"
              disabled={forceBusy}
              onClick={() => onDefaultForce("normal")}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold uppercase text-slate-300 disabled:opacity-50"
            >
              Normal
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Current:{" "}
            <span
              className={`font-semibold ${
                u?.tradeControlState === "force_win"
                  ? "text-emerald-300"
                  : u?.tradeControlState === "force_loss"
                    ? "text-rose-300"
                    : "text-slate-300"
              }`}
            >
              {u?.tradeControlState === "force_win"
                ? `Force Profit ${u?.tradeControlPercentage ?? forcePct}%`
                : u?.tradeControlState === "force_loss"
                  ? `Force Loss ${u?.tradeControlPercentage ?? forcePct}%`
                  : "Normal market"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-teal-400/30 bg-teal-500/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-300">
            <Bot className="h-3.5 w-3.5" />
            AI Bot Assign (this user)
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Select days and daily commission %, then Assign. You can edit daily
            commission later even if the contract is already active.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {AI_BOT_DAY_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setBotDays(String(d))}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                  String(botDays) === String(d)
                    ? "border-teal-400/40 bg-teal-500/20 text-teal-200"
                    : "border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Lock days
              </span>
              <input
                type="number"
                min={1}
                max={3650}
                value={botDays}
                onChange={(e) => setBotDays(e.target.value)}
                placeholder="e.g. 40"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-teal-400/40"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Daily commission %
              </span>
              <input
                type="number"
                min={0}
                max={500}
                step="any"
                value={botYield}
                onChange={(e) => setBotYield(e.target.value)}
                placeholder="8"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-teal-400/40"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={botBusy}
                onClick={onAssignAiBot}
                className="w-full rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-950 disabled:opacity-50 sm:w-auto"
              >
                {botBusy ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Assign & Activate"
                )}
              </button>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400">
            Status:{" "}
            {u?.aiBotAssignedLockDays ? (
              <span className="font-semibold text-teal-300">
                Assigned {u.aiBotAssignedLockDays} days · daily commission{" "}
                {u.aiBotCustomPercentage ?? 8}%
                {u.aiBotActive
                  ? ` · contract active until ${
                      u.aiBotEndDate
                        ? new Date(u.aiBotEndDate).toLocaleDateString()
                        : "—"
                    }`
                  : " · waiting for user to start"}
              </span>
            ) : (
              <span className="font-semibold text-amber-300">
                Not assigned yet
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            <Copy className="h-3.5 w-3.5" />
            Smart Spot Trade
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Auto pays 2.0–2.7% of the user’s current total USDT each time they
            submit (rate moves day by day). Manual uses the % you type. After
            one submit they must come back after 24 hours to submit again.
          </p>

          <div className="mt-3">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Commission
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                { id: "auto", label: "Auto 2.0–2.7%" },
                { id: "manual", label: "Manual" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setScMode(m.id)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                    scMode === m.id
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                      : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {scMode === "auto" ? (
              <p className="mt-2 text-[11px] text-emerald-200/90">
                Today’s auto rate for this user:{" "}
                <span className="font-semibold">
                  {Number(data?.user?.smartCopy?.autoRate || 0).toFixed(1)}%
                </span>{" "}
                of total ${fmt(data?.user?.smartCopy?.walletUsdt)} ≈ $
                {fmt(data?.user?.smartCopy?.estimatedCredit)} USDT. Next
                submit:{" "}
                {data?.user?.smartCopy?.canClaim
                  ? "ready now"
                  : data?.user?.smartCopy?.nextSubmitAt
                    ? new Date(
                        data.user.smartCopy.nextSubmitAt
                      ).toLocaleString()
                    : "first submit"}
                .
              </p>
            ) : (
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">
                  Commission % (manual)
                </span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step="any"
                  value={scCommission}
                  onChange={(e) => setScCommission(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
                />
              </label>
            )}
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Max copy blocks
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScMaxSlots(n)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                    Number(scMaxSlots) === n
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                      : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {scSlots.map((s) => {
              const live = (data?.user?.smartCopy?.copies || []).find(
                (c) => Number(c.slot) === s.slot
              );
              return (
                <div
                  key={s.slot}
                  className="rounded-lg border border-white/10 bg-black/25 p-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-white">
                      {SMART_COPY_BLOCKS[s.slot]}
                      {live ? (
                        <span className="ml-2 text-[10px] font-medium text-emerald-300">
                          Submitted {live.asset || live.pair}
                          {live.assetType ? ` · ${live.assetType}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScSlots((prev) =>
                          prev.map((row) =>
                            row.slot === s.slot
                              ? { ...row, enabled: !row.enabled }
                              : row
                          )
                        )
                      }
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase ${
                        s.enabled
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          : "border-white/10 bg-black/30 text-slate-400"
                      }`}
                    >
                      {s.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <label className="mt-2 block">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                      Opens at (optional)
                    </span>
                    <div className="mt-1 flex gap-1.5">
                      <input
                        type="datetime-local"
                        value={s.readyAt}
                        onChange={(e) =>
                          setScSlots((prev) =>
                            prev.map((row) =>
                              row.slot === s.slot
                                ? { ...row, readyAt: e.target.value }
                                : row
                            )
                          )
                        }
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-cyan-400/40"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setScSlots((prev) =>
                            prev.map((row) =>
                              row.slot === s.slot
                                ? { ...row, readyAt: "" }
                                : row
                            )
                          )
                        }
                        className="rounded-lg border border-white/10 px-2 text-[10px] text-slate-400"
                      >
                        Now
                      </button>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={scBusy}
            onClick={onSaveSmartCopy}
            className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-950 disabled:opacity-50"
          >
            {scBusy ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Save Smart Spot"
            )}
          </button>

          <label className="mt-3 block">
            <span className="text-[10px] font-semibold uppercase text-slate-500">
              Credit USDT from Smart Spot Trade
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                step="any"
                value={scCredit}
                onChange={(e) => setScCredit(e.target.value)}
                placeholder="e.g. 50"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-cyan-400/40"
              />
              <button
                type="button"
                disabled={topUpBusy}
                onClick={async () => {
                  const n = Number(scCredit);
                  if (!Number.isFinite(n) || n === 0) {
                    toastRef.current?.("error", "Enter a non-zero amount.");
                    return;
                  }
                  setTopUpBusy(true);
                  try {
                    await AdminAPI.updateBalance(userId, {
                      symbol: "USDT",
                      amount: n,
                      mode: "add",
                      source: "smart_copy",
                      note: `Smart Spot Trade · ${n >= 0 ? "+" : ""}${n} USDT`,
                    });
                    toastRef.current?.(
                      "success",
                      `Smart Spot Trade credit ${n} USDT`
                    );
                    setScCredit("");
                    await load({ silent: true });
                  } catch (err) {
                    if (!err?.canceled && err?.message) {
                      toastRef.current?.("error", err.message);
                    }
                  } finally {
                    setTopUpBusy(false);
                  }
                }}
                className="rounded-xl bg-cyan-500 px-3 py-2 text-[11px] font-bold text-cyan-950 disabled:opacity-50"
              >
                Credit
              </button>
            </div>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            Add USDT to Trading Wallet
          </label>
          <p className="mt-0.5 text-[10px] text-slate-500">
            One Trading Wallet. History label follows the source you pick.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WALLET_SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTopUpSource(s.id)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                  topUpSource === s.id
                    ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                    : "border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
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
                    source: topUpSource,
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
                  source: "admin_credit",
                  note: "Admin cleared Trading Wallet to $0.00",
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
          Wallet history
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {(data?.transactions || []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No wallet history yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {(data.transactions || []).map((tx) => {
                const delta =
                  typeof tx.ledgerDelta === "number"
                    ? Number(tx.ledgerDelta)
                    : tx.kind === "withdrawal"
                      ? -Number(tx.amount)
                      : Number(tx.amount);
                return (
                  <li
                    key={tx._id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white">
                        {sourceLabel(tx.source, tx.kind, tx.reviewerNote)}
                        {tx.symbol ? ` · ${tx.symbol}` : ""}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString()
                          : "—"}
                        {tx.reviewerNote ? ` · ${tx.reviewerNote}` : ""}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-sm font-bold ${
                        delta > 0
                          ? "text-emerald-300"
                          : delta < 0
                            ? "text-rose-300"
                            : "text-white/60"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {fmt(delta)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

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
