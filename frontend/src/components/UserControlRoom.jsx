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
import { publicUid } from "../lib/userUid.js";

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

const TABS = [
  { key: "trading", label: "Trading" },
  { key: "finance", label: "Finance" },
  { key: "live", label: "Live Trades" },
  { key: "history", label: "History" },
];

/* ── Shared UI Helpers ─────────────────────────────────────────── */

const SectionCard = ({ icon: Icon, title, description, accent = "cyan", children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 ${className}`}>
    {(title || Icon) && (
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className={`h-4 w-4 text-${accent}-400`} />}
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
        </div>
        {description && <p className="mt-1 ml-[26px] text-[11px] text-slate-500">{description}</p>}
      </div>
    )}
    {children}
  </div>
);

const PillTabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1">
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)}
        className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
          active === t.key ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
        }`}>{t.label}{t.badge ? <span className="ml-1.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">{t.badge}</span> : null}</button>
    ))}
  </div>
);

const ToggleSwitch = ({ enabled, onToggle, disabled }) => (
  <button type="button" disabled={disabled} onClick={() => onToggle(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-600"} ${disabled ? "opacity-40" : "cursor-pointer"}`}>
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const inputClass = "rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/20";
const btnPrimary = "rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-cyan-950 hover:bg-cyan-400 disabled:opacity-40 transition";
const btnDanger = "rounded-xl bg-rose-500/90 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-500 disabled:opacity-40 transition";
const btnSecondary = "rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-40 transition";

/* ── Helper: avatar color from first letter ─────────────────── */
function avatarColor(name) {
  const colors = [
    "from-cyan-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-sky-500 to-indigo-600",
  ];
  const code = (name || "U").charCodeAt(0);
  return colors[code % colors.length];
}

function biasLabel(trade) {
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

/* ── LiveTradeCard ──────────────────────────────────────────── */

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

  const timerPct = Math.min(100, (rem / 60) * 100);
  const timerColor = rem <= 5 ? "bg-rose-500" : rem <= 15 ? "bg-amber-500" : "bg-cyan-500";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white">
              {trade.asset}/{trade.quote || "USDT"}
            </span>
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
              trade.direction === "long"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            }`}>
              {trade.direction === "long" ? "LONG" : "SHORT"}
            </span>
          </div>
          {forced && (
            <div className={`mt-1.5 text-[11px] font-semibold uppercase ${
              forced === "win" ? "text-emerald-300" : "text-rose-300"
            }`}>
              {forced === "win" ? "WIN locked" : "LOSS locked"} · settles at 0s
              {trade.forcedAmount != null && ` · $${fmt(Math.abs(Number(trade.forcedAmount)))}`}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 font-mono text-2xl font-bold text-cyan-300">
            <Timer className="h-4 w-4" />
            {rem}s
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500">Entry</div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-white">{fmt(trade.entryPrice)}</div>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500">Stake</div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-white">${fmt(trade.stake)}</div>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <div className="text-[10px] uppercase text-slate-500">Bias</div>
          <div className={`mt-0.5 text-xs font-semibold ${
            forced === "win" || bias.startsWith("UP") || bias === "Graph UP"
              ? "text-emerald-300"
              : forced === "loss" || bias.startsWith("DOWN") || bias === "Graph DOWN"
                ? "text-rose-300"
                : "text-slate-300"
          }`}>{bias}</div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-all duration-500 ${timerColor}`} style={{ width: `${timerPct}%` }} />
      </div>

      {/* Manual Balance Add */}
      <div className="mt-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Manual Balance Add
        </label>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 25 or 0.09"
          className={`mt-1.5 w-full font-mono font-semibold ${inputClass}`}
        />
        {valid && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px]">
              <span className="font-semibold text-emerald-400">WIN</span>
              <span className="ml-1 text-emerald-300">→ ${fmt(previewWin)}</span>
              <span className="block text-emerald-400/60">stake + {fmt(absAmt)}</span>
            </div>
            <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-[10px]">
              <span className="font-semibold text-rose-400">LOSS</span>
              <span className="ml-1 text-rose-300">→ ${fmt(previewLossReturn)}</span>
              <span className="block text-rose-400/60">stake − {fmt(absAmt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "up", valid ? amount : undefined)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/25 disabled:opacity-50 transition"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Graph UP
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onGraph(trade._id, "down", valid ? amount : undefined)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 py-2.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/20 hover:bg-rose-500/25 disabled:opacity-50 transition"
        >
          <TrendingDown className="h-3.5 w-3.5" /> Graph DOWN
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => onForce(trade._id, "win", amount)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          <Trophy className="h-3.5 w-3.5" /> Force WIN
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => onForce(trade._id, "loss", amount)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-rose-950 hover:bg-rose-400 disabled:opacity-50 transition"
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
    const poll = setInterval(pull, 4000);
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

/* ── Main Component ────────────────────────────────────────────── */

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
    [0, 1, 2, 3].map((slot) => ({
      slot,
      enabled: true,
      readyAt: "",
      accuracy: String([94, 88, 70, 62][slot] || 70),
    }))
  );
  const [scBusy, setScBusy] = useState(false);
  const [scCredit, setScCredit] = useState("");
  const [scCommission, setScCommission] = useState("0");
  const [scMode, setScMode] = useState("auto");
  const [topUpSource, setTopUpSource] = useState("admin_credit");
  const [activeTab, setActiveTab] = useState("trading");
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
          u.aiBotPendingRequest?.requestedDays != null
            ? String(u.aiBotPendingRequest.requestedDays)
            : u.aiBotAssignedLockDays != null
              ? String(u.aiBotAssignedLockDays)
              : u.aiBotLockDays != null
                ? String(u.aiBotLockDays)
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

  useEffect(() => {
    const off = onSocketEvent("aibot:lock", (payload) => {
      if (payload?.userId && String(payload.userId) !== String(userId)) return;
      load({ silent: true });
    });
    return off;
  }, [userId, load]);

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
          accuracy:
            s?.accuracy != null && Number.isFinite(Number(s.accuracy))
              ? String(Math.round(Number(s.accuracy)))
              : String([94, 88, 70, 62][slot] || 70),
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
          accuracy: Math.min(100, Math.max(0, Math.round(Number(s.accuracy) || 0))),
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
        res.message || `AI Bot updated: ${days} days · ${pct}% daily commission.`
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

  const onReviewAiLock = async (action) => {
    const pendingId = data?.user?.aiBotPendingRequest?.id;
    if (!pendingId) return;
    const days = Number(botDays);
    if (action === "approve" && (!Number.isFinite(days) || days < 1)) {
      toastRef.current?.("error", "Set lock days before approving.");
      return;
    }
    setBotBusy(true);
    try {
      const res = await AiBotAPI.adminReviewRequest(pendingId, {
        action,
        lockDays: days,
      });
      toastRef.current?.("success", res.message || `Request ${action}d.`);
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

  const initials = (u?.fullName || u?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tabsWithBadge = TABS.map((t) =>
    t.key === "live" ? { ...t, badge: openTrades?.length || null } : t
  );

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Back + Refresh row */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
        </button>
        <button type="button" onClick={() => load({ silent: false })}
          className={btnSecondary + " flex items-center gap-1.5"}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Hero Card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor(u?.fullName || u?.email)} text-lg font-bold text-white shadow-lg`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{u?.fullName || u?.email || "User"}</h1>
            <p className="text-xs text-slate-400">{u?.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {publicUid(u) ? (
                <span className="rounded-lg bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  UID {publicUid(u)}
                </span>
              ) : null}
              {u?.trc20Address && (
                <span className="max-w-[200px] truncate rounded-lg bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  TRC-20 · {u.trc20Address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat mini-cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border-l-2 border-emerald-500 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase text-slate-500">USDT Balance</div>
            <div className={`mt-0.5 text-lg font-bold ${Number(u?.wallet?.USDT || 0) < 0 ? "text-rose-400" : "text-white"}`}>
              {Number(u?.wallet?.USDT || 0) < 0 ? "-" : ""}${fmt(Math.abs(Number(u?.wallet?.USDT || 0)))}
            </div>
          </div>
          <div className="rounded-xl border-l-2 border-amber-500 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase text-slate-500">Trade Control</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-200">
              {u?.tradeControlState === "force_win" ? "Force Win"
                : u?.tradeControlState === "force_loss" ? "Force Loss"
                : "Normal"}
            </div>
          </div>
          <div className="rounded-xl border-l-2 border-cyan-500 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase text-slate-500">Open Trades</div>
            <div className="mt-0.5 text-lg font-bold text-white">{openTrades?.length || 0}</div>
          </div>
          <div className={`rounded-xl border-l-2 bg-white/[0.03] p-3 ${u?.banned ? "border-rose-500" : "border-emerald-500"}`}>
            <div className="text-[10px] uppercase text-slate-500">Status</div>
            <div className={`mt-0.5 text-sm font-semibold ${u?.banned ? "text-rose-400" : "text-emerald-400"}`}>
              {u?.banned ? "Banned" : "Active"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <PillTabs tabs={tabsWithBadge} active={activeTab} onChange={setActiveTab} />

      {/* ══════════════════ TRADING TAB ══════════════════════════ */}
      {activeTab === "trading" && (
        <div className="space-y-5">
          {/* User Trading Access */}
          <SectionCard icon={Bell} title="User Trading Access" accent="amber"
            description="Block or allow this user independently of the global trading switch.">
            <div className="flex items-center gap-3">
              <ToggleSwitch
                enabled={u?.tradingAllowed !== false}
                onToggle={(v) => onTradingAccess(v)}
                disabled={accessBusy}
              />
              <span className={`text-xs font-semibold ${u?.tradingAllowed === false ? "text-rose-300" : "text-emerald-300"}`}>
                {u?.tradingAllowed === false ? "Trading blocked" : "Trading allowed"}
              </span>
            </div>
          </SectionCard>

          {/* VIP Lounge */}
          <SectionCard icon={Trophy} title="VIP Lounge" accent="teal"
            description="Grant VIP so this user sees the neon VIP desk, perks, and live graph lounge.">
            <div className="flex items-center gap-3">
              <ToggleSwitch
                enabled={!!u?.vipStatus}
                onToggle={(v) => onVip(v)}
                disabled={vipBusy}
              />
              <span className={`text-xs font-semibold ${u?.vipStatus ? "text-teal-300" : "text-slate-500"}`}>
                {u?.vipStatus ? "VIP lounge active" : "Standard lounge"} · Level {u?.vipLevel ?? 0}
                {u?.vipLevelLocked ? " · manual lock" : " · auto-upgrade on"}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Manual VIP level</span>
                <input type="number" min={0} max={20} value={vipLevelEdit}
                  onChange={(e) => setVipLevelEdit(e.target.value)}
                  className={`mt-1 w-full font-mono ${inputClass}`} />
              </label>
              <div className="flex items-end">
                <button type="button" disabled={vipLevelBusy} onClick={onVipLevel}
                  className={`w-full sm:w-auto ${btnPrimary}`}>
                  {vipLevelBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Set level"}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
                30d vol {fmt(u?.volume30d || 0)}
              </span>
              <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
                {u?.activeTradingDays || 0} active days
              </span>
              <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400">
                Code {u?.referralCode || "—"}
              </span>
            </div>
          </SectionCard>

          {/* Trade Pair Quote */}
          <SectionCard icon={TrendingUp} title="Trade Pair Quote" accent="cyan"
            description="If they trade BTC/USDT, lock USDC to show BTC/USDC on their desk and chart.">
            <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1">
              {["USDT", "USDC"].map((q) => (
                <button key={q} type="button" disabled={quoteBusy}
                  onClick={() => onChartQuote(q)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                    u?.chartQuote === q ? "bg-cyan-500 text-cyan-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
                  } disabled:opacity-40`}>
                  Show {q}
                </button>
              ))}
              <button type="button" disabled={quoteBusy}
                onClick={() => onChartQuote(null)}
                className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  !u?.chartQuote ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                } disabled:opacity-40`}>
                User choice
              </button>
            </div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80">
              {u?.chartQuote ? `Locked · user sees /${u.chartQuote}` : "User picks USDT or USDC"}
            </div>
          </SectionCard>

          {/* Force Profit / Loss */}
          <SectionCard icon={Skull} title="Force Profit / Loss" accent="rose"
            description="Default for all new Delivery trades by this user. Open live trades can still use Graph UP/DOWN or Force WIN/LOSS per trade.">
            <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1">
              {[
                { key: "normal", label: "Normal" },
                { key: "force_win", label: "Force Profit" },
                { key: "force_loss", label: "Force Loss" },
              ].map((opt) => (
                <button key={opt.key} type="button" disabled={forceBusy}
                  onClick={() => onDefaultForce(opt.key)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                    u?.tradeControlState === opt.key
                      ? opt.key === "force_win" ? "bg-emerald-500 text-emerald-950 shadow-sm"
                        : opt.key === "force_loss" ? "bg-rose-500 text-white shadow-sm"
                        : "bg-white/10 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  } disabled:opacity-40`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Amount %</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <input type="number" min={0} max={100} value={forcePct}
                    onChange={(e) => setForcePct(e.target.value)}
                    className={`w-24 font-mono ${inputClass}`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </label>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Current:{" "}
              <span className={`font-semibold ${
                u?.tradeControlState === "force_win" ? "text-emerald-300"
                  : u?.tradeControlState === "force_loss" ? "text-rose-300"
                  : "text-slate-300"
              }`}>
                {u?.tradeControlState === "force_win"
                  ? `Force Profit ${u?.tradeControlPercentage ?? forcePct}%`
                  : u?.tradeControlState === "force_loss"
                    ? `Force Loss ${u?.tradeControlPercentage ?? forcePct}%`
                    : "Normal market"}
              </span>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════ FINANCE TAB ═════════════════════════ */}
      {activeTab === "finance" && (
        <div className="space-y-5">
          {/* AI Bot Assign */}
          <SectionCard icon={Bot} title="AI Futures Strategy" accent="teal"
            description="User requests lock days. You approve, reject, or change days up or down. Saving days on an active contract updates the end date immediately.">
            {u?.aiBotPendingRequest ? (
              <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-100">
                Pending request · {u.aiBotPendingRequest.requestedDays} days · $
                {Number(u.aiBotPendingRequest.principal || 0).toFixed(2)} held.
                Set days below, then Approve or Reject.
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {AI_BOT_DAY_PRESETS.map((d) => (
                <button key={d} type="button" onClick={() => setBotDays(String(d))}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    String(botDays) === String(d)
                      ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/30"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Lock days</span>
                <input type="number" min={1} max={3650} value={botDays}
                  onChange={(e) => setBotDays(e.target.value)} placeholder="e.g. 40"
                  className={`mt-1 w-full font-mono ${inputClass}`} />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Daily commission %</span>
                <input type="number" min={0} max={500} step="any" value={botYield}
                  onChange={(e) => setBotYield(e.target.value)} placeholder="8"
                  className={`mt-1 w-full font-mono ${inputClass}`} />
              </label>
              <div className="flex flex-wrap items-end gap-2">
                {u?.aiBotPendingRequest ? (
                  <>
                    <button type="button" disabled={botBusy} onClick={() => onReviewAiLock("approve")}
                      className={`flex-1 sm:flex-none ${btnPrimary}`}>
                      {botBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Approve lock"}
                    </button>
                    <button type="button" disabled={botBusy} onClick={() => onReviewAiLock("reject")}
                      className={btnSecondary}>
                      Reject & refund
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={botBusy} onClick={onAssignAiBot}
                    className={`w-full sm:w-auto ${btnPrimary}`}>
                    {botBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : u?.aiBotActive ? "Update days" : "Save lock days"}
                  </button>
                )}
              </div>
            </div>
            {/* Status mini info card */}
            <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-[11px] text-slate-400">
              Status:{" "}
              {u?.aiBotPendingRequest ? (
                <span className="font-semibold text-amber-300">
                  Waiting approval · requested {u.aiBotPendingRequest.requestedDays} days
                </span>
              ) : u?.aiBotActive ? (
                <span className="font-semibold text-teal-300">
                  Active {u.aiBotLockDays || u.aiBotAssignedLockDays} days · daily commission{" "}
                  {u.aiBotCustomPercentage ?? 8}% until{" "}
                  {u.aiBotEndDate ? new Date(u.aiBotEndDate).toLocaleDateString() : "—"}
                </span>
              ) : u?.aiBotAssignedLockDays ? (
                <span className="font-semibold text-teal-300">
                  Last lock {u.aiBotAssignedLockDays} days · daily commission{" "}
                  {u.aiBotCustomPercentage ?? 8}%
                </span>
              ) : (
                <span className="font-semibold text-slate-400">No lock yet — user can request from their wallet</span>
              )}
            </div>
          </SectionCard>

          {/* Smart Spot Trade */}
          <SectionCard icon={Copy} title="Smart Spot Trade" accent="cyan"
            description="Smart Spot opens only after this user buys AI Futures Strategy. Blocks: $500 → 1, $1000 → 2, $2000 → 3, $3000+ → 4.">
            {/* Commission mode */}
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Commission</span>
              <div className="mt-1.5 flex gap-1 rounded-xl bg-white/[0.03] p-1">
                {[
                  { id: "manual", label: "Manual credit" },
                  { id: "auto", label: "Auto (admin approve)" },
                ].map((m) => (
                  <button key={m.id} type="button" onClick={() => setScMode(m.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                      scMode === m.id ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
              {scMode === "auto" ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] uppercase text-slate-500">Rate</div>
                    <div className="mt-0.5 text-sm font-semibold text-emerald-300">
                      {Number(data?.user?.smartCopy?.autoRate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] uppercase text-slate-500">Est. Credit</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">
                      ${fmt(data?.user?.smartCopy?.estimatedCredit)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] uppercase text-slate-500">Next Submit</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white">
                      {data?.user?.smartCopy?.canClaim
                        ? "Ready now"
                        : data?.user?.smartCopy?.nextSubmitAt
                          ? new Date(data.user.smartCopy.nextSubmitAt).toLocaleString()
                          : "First submit"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] uppercase text-slate-500">Pending</div>
                    <div className="mt-0.5 text-sm font-semibold text-amber-300">
                      {data?.user?.smartCopy?.pendingCommission
                        ? `$${fmt(data.user.smartCopy.pendingCommission.amount)}`
                        : "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <label className="mt-3 block">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">Commission % (manual)</span>
                  <input type="number" min={0} max={500} step="any" value={scCommission}
                    onChange={(e) => setScCommission(e.target.value)} placeholder="0"
                    className={`mt-1 w-full font-mono ${inputClass}`} />
                </label>
              )}
            </div>

            {/* Block slots info */}
            <div className="mt-4">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Open blocks (from AI Futures lock)</span>
              <p className="mt-1 text-[11px] text-cyan-200">
                {data?.user?.smartCopy?.unlocked
                  ? `${Number(data?.user?.smartCopy?.maxSlots || 0)} block${Number(data?.user?.smartCopy?.maxSlots || 0) === 1 ? "" : "s"} open · lock $${fmt(data?.user?.smartCopy?.aiPrincipal)}`
                  : "Locked — user has not bought AI Futures Strategy yet"}
              </p>
            </div>

            {/* Block slot cards */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scSlots.map((s) => {
                const live = (data?.user?.smartCopy?.copies || []).find(
                  (c) => Number(c.slot) === s.slot
                );
                const locked = s.slot >= scMaxSlots;
                return (
                  <div key={s.slot}
                    className={`relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 ${locked ? "opacity-50" : ""}`}>
                    {locked && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
                        <span className="text-[10px] font-semibold text-amber-300">Requires higher AI Futures tier</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-white">
                        {SMART_COPY_BLOCKS[s.slot]}
                        {live ? (
                          <span className="ml-2 text-[10px] font-medium text-emerald-300">
                            Submitted {live.asset || live.pair}
                            {live.assetType ? ` · ${live.assetType}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <ToggleSwitch
                        enabled={s.enabled}
                        onToggle={() =>
                          setScSlots((prev) =>
                            prev.map((row) =>
                              row.slot === s.slot ? { ...row, enabled: !row.enabled } : row
                            )
                          )
                        }
                        disabled={locked}
                      />
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold uppercase text-slate-500">Accuracy</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button type="button"
                          onClick={() =>
                            setScSlots((prev) =>
                              prev.map((row) =>
                                row.slot === s.slot
                                  ? { ...row, accuracy: String(Math.max(0, Number(row.accuracy || 0) - 1)) }
                                  : row
                              )
                            )
                          }
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5">
                          −
                        </button>
                        <input type="number" min={0} max={100} value={s.accuracy}
                          onChange={(e) =>
                            setScSlots((prev) =>
                              prev.map((row) =>
                                row.slot === s.slot ? { ...row, accuracy: e.target.value } : row
                              )
                            )
                          }
                          className="w-16 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1 text-center font-mono text-sm text-white outline-none focus:border-cyan-500/30" />
                        <button type="button"
                          onClick={() =>
                            setScSlots((prev) =>
                              prev.map((row) =>
                                row.slot === s.slot
                                  ? { ...row, accuracy: String(Math.min(100, Number(row.accuracy || 0) + 1)) }
                                  : row
                              )
                            )
                          }
                          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5">
                          +
                        </button>
                        <span className="text-[11px] text-slate-500">%</span>
                      </div>
                    </div>
                    <label className="mt-3 block">
                      <span className="text-[10px] font-semibold uppercase text-slate-500">Opens at</span>
                      <div className="mt-1 flex gap-1.5">
                        <input type="datetime-local" value={s.readyAt}
                          onChange={(e) =>
                            setScSlots((prev) =>
                              prev.map((row) =>
                                row.slot === s.slot ? { ...row, readyAt: e.target.value } : row
                              )
                            )
                          }
                          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-cyan-500/30" />
                        <button type="button"
                          onClick={() =>
                            setScSlots((prev) =>
                              prev.map((row) =>
                                row.slot === s.slot ? { ...row, readyAt: "" } : row
                              )
                            )
                          }
                          className="rounded-lg border border-white/10 px-2 text-[10px] text-slate-400 hover:bg-white/5">
                          Now
                        </button>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            <button type="button" disabled={scBusy} onClick={onSaveSmartCopy}
              className={`mt-4 w-full ${btnPrimary}`}>
              {scBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save Smart Spot"}
            </button>

            {/* Credit USDT from Smart Spot */}
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Credit USDT from Smart Spot Trade</span>
              <div className="mt-1.5 flex gap-2">
                <input type="number" step="any" value={scCredit}
                  onChange={(e) => setScCredit(e.target.value)} placeholder="e.g. 50"
                  className={`min-w-0 flex-1 font-mono ${inputClass}`} />
                <button type="button" disabled={topUpBusy}
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
                  className={btnPrimary}>
                  Credit
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Credit USDT */}
          <SectionCard icon={ArrowDownToLine} title="Add USDT to Trading Wallet" accent="cyan"
            description="One Trading Wallet. History label follows the source you pick.">
            <div className="flex flex-wrap gap-1.5">
              {WALLET_SOURCES.map((s) => (
                <button key={s.id} type="button" onClick={() => setTopUpSource(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    topUpSource === s.id
                      ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30"
                      : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="number" step="any" value={topUp}
                onChange={(e) => setTopUp(e.target.value)} placeholder="e.g. 0.09 or 10.55"
                className={`min-w-0 flex-1 font-mono ${inputClass}`} />
              <button type="button" disabled={topUpBusy}
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
                className={btnPrimary}>
                {topUpBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Wallet"}
              </button>
            </div>
            <button type="button" disabled={topUpBusy}
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
              className={`mt-3 w-full ${btnDanger}`}>
              Clear Balance
            </button>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════ LIVE TRADES TAB ═════════════════════ */}
      {activeTab === "live" && (
        <div className="space-y-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
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
      )}

      {/* ══════════════════ HISTORY TAB ═════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Wallet History */}
            <SectionCard icon={ArrowDownToLine} title="Wallet History" accent="cyan">
              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                {(data?.transactions || []).length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No wallet history yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {(data.transactions || []).map((tx) => {
                      const delta =
                        typeof tx.ledgerDelta === "number"
                          ? Number(tx.ledgerDelta)
                          : tx.kind === "withdrawal"
                            ? -Number(tx.amount)
                            : Number(tx.amount);
                      return (
                        <li key={tx._id}
                          className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-semibold text-white">
                              {sourceLabel(tx.source, tx.kind, tx.reviewerNote)}
                              {tx.symbol ? ` · ${tx.symbol}` : ""}
                            </div>
                            <div className="truncate text-[11px] text-slate-500">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                              {tx.reviewerNote ? ` · ${tx.reviewerNote}` : ""}
                            </div>
                          </div>
                          <div className={`shrink-0 font-mono text-sm font-bold ${
                            delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-white/60"
                          }`}>
                            {delta > 0 ? "+" : ""}{fmt(delta)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </SectionCard>

            {/* Recent Settled */}
            <SectionCard icon={Trophy} title="Recent Settled" accent="amber">
              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                {(data?.recentTrades || []).length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No settled trades yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {(data?.recentTrades || []).map((t) => (
                      <li key={t._id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="text-slate-300">
                          <span className="font-semibold text-white">
                            {t.asset} {t.direction}
                          </span>
                          <span className="text-slate-500"> · ${fmt(t.stake)}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          t.status === "won"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}>
                          {t.status === "won" ? "WON" : "LOST"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Pending Transactions */}
          {!!(data?.pendingDeposits?.length || data?.pendingWithdrawals?.length) && (
            <SectionCard icon={RefreshCw} title="Pending Transactions" accent="amber">
              <div className="space-y-2">
                {[
                  ...(data?.pendingDeposits || []),
                  ...(data?.pendingWithdrawals || []),
                ].map((tx) => (
                  <div key={tx._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
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
                        <a href={assetUrl(tx.proofUrl)} target="_blank" rel="noreferrer"
                          className="text-[11px] text-cyan-400 underline">
                          Proof
                        </a>
                      )}
                      <button type="button" disabled={txBusy === tx._id}
                        onClick={() => onVerifyTx(tx, "approve")}
                        className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition">
                        <CheckCircle2 className="mr-1 inline h-3 w-3" />
                        Approve
                      </button>
                      <button type="button" disabled={txBusy === tx._id}
                        onClick={() => onVerifyTx(tx, "reject")}
                        className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition">
                        <X className="mr-1 inline h-3 w-3" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
