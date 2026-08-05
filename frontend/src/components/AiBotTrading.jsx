/**
 * AI Bot Trading — legal contract modal + lock activation + claim.
 * Lock days are admin-assigned only (user cannot pick freely).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Loader2,
  ShieldCheck,
  FileText,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AiBotAPI } from "../lib/api.js";

const CONTRACT_SECTIONS = [
  {
    title: "1. Parties & Scope",
    body: `This AI Algorithmic Trading Agreement ("Agreement") is entered into between you ("User", "you") and Nexus / the platform operator ("Platform", "we"). By activating an AI Bot Trading position you appoint the Platform's automated systems to allocate locked capital according to algorithmic strategies disclosed herein. This Agreement governs all AI Bot locks, yields, risk disclosures, and claims.`,
  },
  {
    title: "2. Nature of the Service",
    body: `AI Bot Trading is an automated capital-lock product. Funds you allocate are deducted from your Trading Wallet for the assigned lock period. Yield is a target metric configured by Platform administrators and is not a bank deposit, insurance product, or guaranteed return. Past illustrative performance does not predict future results.`,
  },
  {
    title: "3. Lock Periods",
    body: `Lock duration is assigned exclusively by your Platform administrator for your account. You cannot select an alternate period. During the lock, principal is unavailable for withdrawal, spot conversion, or delivery trading. Early termination is not permitted except where the Platform expressly cancels a contract for compliance or operational reasons.`,
  },
  {
    title: "4. Yield & Custom Percentage",
    body: `Target return is expressed as a percentage of locked principal ("aiBotCustomPercentage"). Administrators may set a global default and/or a user-specific percentage. At maturity you may claim principal plus calculated yield. Yield accrues only if the contract remains active through the end date and claim is submitted successfully.`,
  },
  {
    title: "5. Risk Disclosure",
    body: `Algorithmic trading involves substantial risk of loss. Market volatility, liquidity gaps, model error, latency, custody events, network outages, and regulatory action may reduce or eliminate expected yield. You may lose part or all of locked principal if the Platform is required to reverse or adjust balances under fraud, chargeback, or force-majeure policies.`,
  },
  {
    title: "6. No Investment Advice",
    body: `Nothing in the AI Bot interface constitutes investment, legal, tax, or accounting advice. You are solely responsible for assessing suitability relative to your financial condition, risk tolerance, and local law. If you do not understand the risks, do not activate an AI Bot.`,
  },
  {
    title: "7. KYC, Sanctions & Eligibility",
    body: `You represent that you are of legal age, not subject to sanctions, and that funds are lawfully obtained. The Platform may suspend AI Bot activation or claims pending identity verification, enhanced due diligence, or regulatory requests.`,
  },
  {
    title: "8. Operational Controls",
    body: `The Platform may pause global trading, adjust algorithmic matrices for standard trades, modify AI Bot defaults, or refuse new locks to protect market integrity. Existing active locks will be honored according to their recorded start/end dates and yield percentage unless prohibited by law.`,
  },
  {
    title: "9. Taxes & Reporting",
    body: `You are responsible for any taxes arising from yields or currency conversions. The Platform may provide transaction records but does not withhold taxes unless required by applicable law.`,
  },
  {
    title: "10. Limitation of Liability",
    body: `To the maximum extent permitted by law, the Platform's aggregate liability arising from AI Bot Trading is limited to the principal amount of the affected contract. We are not liable for indirect, incidental, special, consequential, or punitive damages, including lost profits or opportunity costs.`,
  },
  {
    title: "11. Dispute Resolution",
    body: `Disputes should first be raised via Support Chat. Unresolved disputes may be submitted to binding arbitration or courts of competent jurisdiction as specified in the Platform Terms of Service. Electronic acceptance (checkbox + timestamp) constitutes a valid signature.`,
  },
  {
    title: "12. Acknowledgement",
    body: `By checking the agreement box and selecting Confirm & Start AI Trading, you confirm that you have scrolled through and read this Agreement, understand the admin-assigned lock period and yield mechanics, accept all risk disclosures, and authorize deduction of principal from your Trading Wallet for the assigned duration.`,
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

export default function AiBotTradingPage({ user, onToast, onWalletUpdate }) {
  const [config, setConfig] = useState(null);
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [lockDays, setLockDays] = useState(null);
  const [principal, setPrincipal] = useState("100");
  const [agreed, setAgreed] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const toastRef = useRef(onToast);
  toastRef.current = onToast;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AiBotAPI.config();
      setConfig(res.defaults);
      setBot(res.bot);
      const assigned =
        res.bot?.aiBotAssignedLockDays ??
        res.defaults?.lockOptions?.[0] ??
        null;
      setLockDays(assigned);
    } catch (err) {
      toastRef.current?.("error", err?.message || "Failed to load AI Bot config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onScrollContract = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (atEnd) setScrolledEnd(true);
  };

  const openModal = () => {
    if (!lockDays) {
      toastRef.current?.(
        "error",
        "Admin has not assigned your lock days yet. Contact support."
      );
      return;
    }
    setAgreed(false);
    setScrolledEnd(false);
    setModalOpen(true);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, 50);
  };

  const canConfirm = agreed && scrolledEnd && !busy && !!lockDays;

  const activate = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      const res = await AiBotAPI.activate({
        lockDays,
        principal: Number(principal),
        contractAccepted: true,
        contractVersion: config?.contractVersion || "v1.0",
      });
      setBot(res.bot);
      if (res.wallet) onWalletUpdate?.({ wallet: res.wallet });
      toastRef.current?.("success", res.message || "AI Bot activated.");
      setModalOpen(false);
    } catch (err) {
      toastRef.current?.("error", err?.message || "Activation failed.");
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

  const yieldPct =
    bot?.aiBotCustomPercentage ??
    user?.aiBotCustomPercentage ??
    config?.defaultYieldPct ??
    8;
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
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/80">
              AI Bot Trading
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Algorithmic lock contracts
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Lock USDT for an admin-assigned period under a legally binding risk disclosure.
              Target yield is set by your administrator ({yieldPct}% illustrative).
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
            <span className="text-xs text-slate-500">
              Contract accepted {fmtDate(bot.aiBotContractAcceptedAt)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Principal" value={fmtUsd(bot.aiBotPrincipal)} />
            <Stat label="Lock" value={`${bot.aiBotLockDays} days`} />
            <Stat label="Target yield" value={`${bot.aiBotCustomPercentage}%`} />
            <Stat label="Ends" value={fmtDate(bot.aiBotEndDate)} />
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
            <div className="flex items-center gap-2 text-sm text-amber-200/90">
              <Clock className="h-4 w-4" />
              Lock in progress — claim unlocks after end date.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1424] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                Lock duration (admin assigned)
              </span>
              <div className="mt-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100">
                {lockDays ? `${lockDays} Days` : "Not assigned yet — contact admin"}
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
                Min {fmtUsd(config?.minPrincipal || 50)} · Target yield {yieldPct}%
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={openModal}
            disabled={!lockDays}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-slate-950 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            <FileText className="h-4 w-4" />
            Review contract & start AI Trading
          </button>
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
                      Version {config?.contractVersion || "v1.0"} · Scroll to the end to continue
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
                  Assigned lock: <strong>{lockDays} days</strong> · Principal:{" "}
                  <strong>{fmtUsd(principal)}</strong> · Target yield:{" "}
                  <strong>{yieldPct}%</strong>
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
                    I have read the full Agreement{!scrolledEnd ? " (scroll to the end first)" : ""}{" "}
                    and accept all terms and risk disclosures.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={activate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm & Start AI Trading
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
