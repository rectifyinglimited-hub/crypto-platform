/**
 * AI Bot Trading — professional desk: accrued profit, equity graph,
 * assigned lock, cancel with 15% penalty (T&Cs).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Loader2,
  ShieldCheck,
  FileText,
  X,
  CheckCircle2,
  Clock,
  Ban,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AiBotAPI } from "../lib/api.js";
import { onSocketEvent } from "../lib/socket.js";

const CANCEL_PENALTY_PCT = 15;
const TRADE_PAIR = "BTC/USDT";

const CONTRACT_SECTIONS = [
  {
    title: "1. Parties & Scope",
    body: `This AI Algorithmic Trading Agreement ("Agreement") is entered into between you ("User") and equiti ("Platform"). By activating an AI Bot you authorize algorithmic capital lock and yield targeting as disclosed herein.`,
  },
  {
    title: "2. Nature of the Service",
    body: `Funds allocated are deducted from your Trading Wallet when you send the lock request. Target yield is set by administrators and is illustrative — not a bank deposit or guaranteed return.`,
  },
  {
    title: "3. Lock Periods",
    body: `You choose lock days from your Trading Wallet balance and send a request. An administrator must approve the lock and may increase or decrease the days before the contract starts. Once active you cannot change principal or trade pair.`,
  },
  {
    title: "4. Yield & Daily Profit Display",
    body: `Daily commission is a percentage of locked principal, set and editable by administrators at any time (including after activation). Accrued amounts become claimable only after the lock end date if the contract remains active.`,
  },
  {
    title: "5. Early Cancellation Penalty",
    body: `If you cancel an active AI Bot before the end date: (a) you forfeit all target / accrued yield; (b) a penalty of ${CANCEL_PENALTY_PCT}% of your locked principal is deducted; (c) only the remaining principal (after the ${CANCEL_PENALTY_PCT}% deduction) is returned to your Trading Wallet. Example: $100 principal cancelled early → $15 penalty → $85 refunded, $0 yield.`,
  },
  {
    title: "6. Risk Disclosure",
    body: `Algorithmic trading involves substantial risk of loss. Market volatility, model error, outages, and regulatory action may reduce or eliminate expected yield.`,
  },
  {
    title: "7. No Investment Advice",
    body: `Nothing herein is investment, legal, or tax advice. You alone assess suitability.`,
  },
  {
    title: "8. KYC & Eligibility",
    body: `You represent you are of legal age, not sanctioned, and funds are lawfully obtained.`,
  },
  {
    title: "9. Operational Controls",
    body: `The Platform may pause trading, adjust defaults, or refuse new locks. Active locks follow recorded dates unless prohibited by law.`,
  },
  {
    title: "10. Limitation of Liability",
    body: `Aggregate liability for AI Bot Trading is limited to the principal of the affected contract, less any lawful penalties.`,
  },
  {
    title: "11. Dispute Resolution",
    body: `Raise disputes via Support Chat first. Electronic acceptance constitutes a valid signature.`,
  },
  {
    title: "12. Acknowledgement",
    body: `By confirming you have read this Agreement including the ${CANCEL_PENALTY_PCT}% early-cancel penalty, accept all risk disclosures, and authorize holding principal until an administrator approves your requested lock duration.`,
  },
];

function fmtUsd(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function ProfitSpark({ series, principal }) {
  const data =
    Array.isArray(series) && series.length >= 2
      ? series
      : Array.from({ length: 24 }, (_, i) =>
          Number((Number(principal || 100) * (1 + i * 0.002)).toFixed(4))
        );
  const W = 560;
  const H = 160;
  const pad = { t: 16, r: 16, b: 28, l: 48 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xy = data.map((v, i) => {
    const x =
      pad.l + (i / Math.max(data.length - 1, 1)) * (W - pad.l - pad.r);
    const y =
      pad.t + ((max - v) / range) * (H - pad.t - pad.b);
    return [x, y];
  });
  const line = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xy[xy.length - 1][0]},${H - pad.b} L${xy[0][0]},${
    H - pad.b
  } Z`;
  const yTicks = [0, 0.5, 1].map((t) => ({
    y: pad.t + t * (H - pad.t - pad.b),
    v: max - t * range,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full">
      <defs>
        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={t.y}
            y2={t.y}
            stroke="rgba(255,255,255,0.06)"
          />
          <text
            x={pad.l - 6}
            y={t.y + 3}
            textAnchor="end"
            fill="#64748b"
            fontSize="10"
          >
            {t.v.toFixed(2)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#eqFill)" />
      <path
        d={line}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {xy.length > 0 && (
        <circle
          cx={xy[xy.length - 1][0]}
          cy={xy[xy.length - 1][1]}
          r="4"
          fill="#5eead4"
          stroke="#0f172a"
          strokeWidth="2"
        />
      )}
      <text x={pad.l} y={H - 8} fill="#64748b" fontSize="10">
        Start
      </text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" fill="#64748b" fontSize="10">
        Now
      </text>
    </svg>
  );
}

export default function AiBotTradingPage({ user, onToast, onWalletUpdate, onGoDeposit }) {
  const [config, setConfig] = useState(null);
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lockDays, setLockDays] = useState(30);
  const [principal, setPrincipal] = useState("100");
  const [agreed, setAgreed] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [walletUsdt, setWalletUsdt] = useState(
    Number(user?.wallet?.USDT || 0)
  );
  const scrollRef = useRef(null);
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const pending = bot?.pendingRequest?.status === "pending" ? bot.pendingRequest : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AiBotAPI.config();
      setConfig(res.defaults);
      setBot(res.bot);
      if (res.wallet && typeof res.wallet.USDT === "number") {
        setWalletUsdt(Number(res.wallet.USDT));
      }
      const suggested =
        res.bot?.pendingRequest?.requestedDays ||
        res.bot?.aiBotAssignedLockDays ||
        res.defaults?.lockOptions?.[0] ||
        30;
      setLockDays(Number(suggested) || 30);
    } catch (err) {
      toastRef.current?.("error", err?.message || "Failed to load AI Bot config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      AiBotAPI.config()
        .then((res) => {
          setConfig(res.defaults);
          setBot(res.bot);
          if (res.wallet && typeof res.wallet.USDT === "number") {
            setWalletUsdt(Number(res.wallet.USDT));
          }
        })
        .catch(() => {});
    }, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const off = onSocketEvent("aibot:lock", () => {
      load();
    });
    const offWallet = onSocketEvent("wallet:update", (payload) => {
      if (payload?.wallet && typeof payload.wallet.USDT === "number") {
        setWalletUsdt(Number(payload.wallet.USDT));
      }
    });
    return () => {
      off?.();
      offWallet?.();
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const yieldPct =
    bot?.aiBotCustomPercentage ??
    user?.aiBotCustomPercentage ??
    config?.defaultYieldPct ??
    8;

  const accrued = useMemo(() => {
    if (!bot?.aiBotActive || !bot.aiBotStartDate || !bot.aiBotLockDays) {
      return { daily: 0, total: 0, elapsedDays: 0, progress: 0 };
    }
    const start = new Date(bot.aiBotStartDate).getTime();
    const end = bot.aiBotEndDate
      ? new Date(bot.aiBotEndDate).getTime()
      : start + bot.aiBotLockDays * 86400000;
    const elapsedMs = Math.max(0, Math.min(now, end) - start);
    const elapsedDays = elapsedMs / 86400000;
    const principalN = Number(bot.aiBotPrincipal || 0);
    const daily = principalN * (Number(yieldPct) / 100);
    const totalTarget = daily * bot.aiBotLockDays;
    const total = Math.min(totalTarget, daily * elapsedDays);
    const progress = Math.min(1, elapsedDays / bot.aiBotLockDays);
    return { daily, total, elapsedDays, progress, totalTarget };
  }, [bot, yieldPct, now]);

  const equitySeries = useMemo(() => {
    const p = Number(bot?.aiBotPrincipal || principal || 100);
    const lock = Math.max(Number(bot?.aiBotLockDays || 14), 7);
    // Always show a smooth professional curve (at least 28 points)
    const points = 28;
    const elapsedFrac = bot?.aiBotActive
      ? Math.min(1, Math.max(0.02, accrued.progress || 0.02))
      : 0.35;
    const daily = Number(accrued.daily || (p * (Number(yieldPct) / 100)) / lock);
    const out = [];
    for (let i = 0; i < points; i++) {
      const t = (i / (points - 1)) * elapsedFrac * lock;
      const wave = Math.sin(i / 3) * daily * 0.15;
      out.push(Number((p + daily * t + wave).toFixed(4)));
    }
    if (bot?.aiBotActive) {
      out[out.length - 1] = Number((p + accrued.total).toFixed(4));
    }
    return out;
  }, [bot, principal, accrued, yieldPct]);

  const onScrollContract = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledEnd(true);
    }
  };

  const openModal = () => {
    const days = Number(lockDays);
    if (!Number.isFinite(days) || days < 1) {
      toastRef.current?.("error", "Choose lock days first.");
      return;
    }
    if (!(walletUsdt > 0)) {
      toastRef.current?.("error", "Trading Wallet is empty. Deposit USDT first.");
      onGoDeposit?.();
      return;
    }
    if (pending) {
      toastRef.current?.("error", "Your request is already waiting for admin.");
      return;
    }
    setAgreed(false);
    setScrolledEnd(false);
    setFormError("");
    setModalOpen(true);
  };

  const activate = async () => {
    if (busy) return;
    if (!agreed || !scrolledEnd) {
      toastRef.current?.("error", "Scroll to the end and accept the agreement.");
      return;
    }
    const days = Number(lockDays);
    if (!Number.isFinite(days) || days < 1) {
      toastRef.current?.("error", "Choose lock days first.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const res = await AiBotAPI.requestLock({
        lockDays: days,
        principal: Number(principal),
        contractAccepted: true,
        contractVersion: config?.contractVersion || "v1.0",
      });
      setBot(res.bot);
      if (res.wallet) {
        onWalletUpdate?.({ wallet: res.wallet });
        setWalletUsdt(Number(res.wallet.USDT || 0));
      }
      toastRef.current?.(
        "success",
        res.message || "Request sent to admin for approval."
      );
      setModalOpen(false);
    } catch (err) {
      const msg = err?.message || "Request failed. Try again.";
      setFormError(msg);
      toastRef.current?.("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const cancelPending = async () => {
    setBusy(true);
    try {
      const res = await AiBotAPI.cancelRequest();
      setBot(res.bot);
      if (res.wallet) {
        onWalletUpdate?.({ wallet: res.wallet });
        if (typeof res.wallet.USDT === "number") setWalletUsdt(Number(res.wallet.USDT));
      }
      toastRef.current?.("success", res.message || "Request cancelled.");
    } catch (err) {
      toastRef.current?.("error", err?.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setBusy(true);
    try {
      const res = await AiBotAPI.claim();
      setBot(res.bot);
      if (res.wallet) onWalletUpdate?.({ wallet: res.wallet });
      toastRef.current?.("success", res.message || "Claimed.");
    } catch (err) {
      toastRef.current?.("error", err?.message || "Claim failed.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await AiBotAPI.cancel();
      setBot(res.bot);
      if (res.wallet) onWalletUpdate?.({ wallet: res.wallet });
      toastRef.current?.("success", res.message || "Cancelled.");
      setCancelOpen(false);
    } catch (err) {
      toastRef.current?.("error", err?.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  const matured =
    bot?.aiBotActive &&
    bot?.aiBotEndDate &&
    new Date(bot.aiBotEndDate) <= new Date();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/5 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/20 text-cyan-300">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/80">
                AI Futures Strategy
              </div>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Algorithmic lock contracts
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Choose lock days from your wallet · admin approves or adjusts ·
              live accrued profit. Copy strategies live under Smart Spot Trade.
            </p>
          </div>
        </div>
      </div>

      {bot?.aiBotActive ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1424] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-300">
              Active
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
              Trading {TRADE_PAIR}
            </span>
            <span className="text-xs text-slate-500">
              Started {fmtDate(bot.aiBotStartDate)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Principal" value={fmtUsd(bot.aiBotPrincipal)} />
            <Stat label="Lock" value={`${bot.aiBotLockDays} days`} />
            <Stat label="Daily commission" value={`${yieldPct}%`} />
            <Stat label="Ends" value={fmtDate(bot.aiBotEndDate)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Daily commission ($)" value={fmtUsd(accrued.daily)} accent />
            <Stat label="Accrued so far" value={fmtUsd(accrued.total)} accent />
            <Stat
              label="Target at maturity"
              value={fmtUsd(accrued.totalTarget)}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <TrendingUp className="h-3.5 w-3.5 text-teal-300" />
                Equity graph · {TRADE_PAIR}
              </div>
              <div className="text-[10px] text-slate-500">
                {Math.round(accrued.progress * 100)}% of lock
              </div>
            </div>
            <ProfitSpark
              series={equitySeries}
              principal={bot?.aiBotPrincipal || principal}
            />
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
                style={{ width: `${Math.round(accrued.progress * 100)}%` }}
              />
            </div>
          </div>

          {matured ? (
            <button
              type="button"
              disabled={busy}
              onClick={claim}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-emerald-950 disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Claim principal + yield
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-200/90">
                <Clock className="h-4 w-4" />
                Lock in progress — claim unlocks after end date.
              </div>
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-200"
              >
                <Ban className="h-3.5 w-3.5" /> Cancel early
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1424] p-5">
          {pending ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
              <div className="text-sm font-semibold text-amber-100">
                Waiting for admin approval
              </div>
              <p className="mt-1 text-xs text-amber-100/80">
                You requested <strong>{pending.requestedDays} days</strong> with{" "}
                {fmtUsd(pending.principal)} held from your Trading Wallet. Admin
                can approve this, or increase / decrease the days.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={cancelPending}
                className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-slate-200 disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Cancel request & refund"}
              </button>
            </div>
          ) : walletUsdt <= 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-100">
                Trading Wallet is empty. Deposit USDT to choose lock days and start AI Futures.
              </div>
              <button
                type="button"
                onClick={() => onGoDeposit?.()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C2B3] py-3.5 text-sm font-bold text-[#1a1400]"
              >
                <Wallet className="h-4 w-4" />
                Deposit USDT
              </button>
            </div>
          ) : (
            <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                Lock duration (days)
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(config?.lockOptions?.length ? config.lockOptions : [7, 15, 30, 60, 90]).map(
                  (d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLockDays(Number(d))}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                        Number(lockDays) === Number(d)
                          ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {d}d
                    </button>
                  )
                )}
              </div>
              <input
                type="number"
                min={1}
                max={3650}
                value={lockDays}
                onChange={(e) => setLockDays(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#070a12] px-3 py-2.5 text-sm text-white"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                Wallet {fmtUsd(walletUsdt)} · request goes to admin for approval
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                Principal (USDT)
              </span>
              <input
                type="number"
                min={config?.minPrincipal || 50}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#070a12] px-3 py-2.5 text-sm text-white"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                Min {fmtUsd(config?.minPrincipal || 50)} · Daily commission {yieldPct}% · Pair{" "}
                {TRADE_PAIR}
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={openModal}
            disabled={!Number(lockDays)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-slate-950 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            <FileText className="h-4 w-4" />
            Review & send to admin
          </button>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c1222] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      AI Algorithmic Trading Terms & Risk Disclosure
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Version {config?.contractVersion || "v1.0"} · Scroll to the end
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                ref={scrollRef}
                onScroll={onScrollContract}
                className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-slate-300"
              >
                {CONTRACT_SECTIONS.map((s) => (
                  <section key={s.title}>
                    <h3 className="mb-1.5 text-sm font-bold text-white">{s.title}</h3>
                    <p className="text-[13px] text-slate-400">{s.body}</p>
                  </section>
                ))}
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-[12px] text-amber-100/90">
                  Requested lock: <strong>{lockDays} days</strong> · Principal:{" "}
                  <strong>{fmtUsd(principal)}</strong> · Daily commission:{" "}
                  <strong>{yieldPct}%</strong> · Pair: <strong>{TRADE_PAIR}</strong>
                  <br />
                  Admin can approve or change the days. Early cancel = no profit + {CANCEL_PENALTY_PCT}% principal deduction.
                </div>
              </div>
              <div className="space-y-3 border-t border-white/5 px-4 py-3">
                <label className="flex items-start gap-2 text-[12px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={agreed}
                    disabled={!scrolledEnd}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read the full Agreement including the {CANCEL_PENALTY_PCT}%
                    cancel penalty{!scrolledEnd ? " (scroll to the end first)" : ""}.
                  </span>
                </label>
                  {formError ? (
                    <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
                      {formError}
                    </div>
                  ) : null}
                  <button
                  type="button"
                  disabled={busy || !agreed || !scrolledEnd}
                  onClick={activate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {busy ? "Sending request…" : "Confirm & send lock request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3"
          >
            <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[#0c1222] p-5">
              <h3 className="text-lg font-bold text-white">Cancel AI Bot early?</h3>
              <p className="mt-2 text-sm text-slate-400">
                You will <strong className="text-rose-300">forfeit all yield</strong> and
                pay a <strong className="text-rose-300">{CANCEL_PENALTY_PCT}% penalty</strong>{" "}
                on principal (
                {fmtUsd(Number(bot?.aiBotPrincipal || 0) * (CANCEL_PENALTY_PCT / 100))}
                ). Refund ≈{" "}
                {fmtUsd(Number(bot?.aiBotPrincipal || 0) * (1 - CANCEL_PENALTY_PCT / 100))}.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-300"
                >
                  Keep contract
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancel}
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm cancel"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          accent ? "text-teal-300" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
