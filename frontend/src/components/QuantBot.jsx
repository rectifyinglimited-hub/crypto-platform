/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/QuantBot.jsx
 * =============================================================================
 *  Quant Trading Bot engine (staking grid).
 *    • Loads tier catalog from /api/staking/tiers.
 *    • User picks a tier, allocates funds → POST /api/staking/lock debits
 *      spot wallet and creates an active position.
 *    • Live positions grid shows countdown to maturity + Claim button.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  TrendingUp,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Wallet,
  Play,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { StakingAPI } from "../lib/api.js";

// ---------------------------------------------------------------------------
// Fallback tier catalog — used if the API request fails.
// Kept in sync with backend/routes/staking.js TIERS.
// ---------------------------------------------------------------------------
const FALLBACK_TIERS = [
  {
    key: "micro",
    label: "AI Micro Bot",
    tagline: "Beginner-friendly automated liquidity grid",
    days: 7,
    yieldPct: 5,
    minAmount: 50,
    maxAmount: 5000,
    color: "emerald",
  },
  {
    key: "alpha",
    label: "Alpha Signal Engine",
    tagline: "Momentum-driven mid-frequency AI",
    days: 14,
    yieldPct: 12,
    minAmount: 250,
    maxAmount: 25000,
    color: "indigo",
  },
  {
    key: "quantum",
    label: "Nexus Pro Quantum",
    tagline: "Institutional-grade multi-strategy quant",
    days: 30,
    yieldPct: 25,
    minAmount: 1000,
    maxAmount: 250000,
    color: "cyan",
  },
];

const fmt = (n, d = 2) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d });

const useCountdown = (target) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(ms / (24 * 3600_000));
  const h = Math.floor((ms % (24 * 3600_000)) / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, d, h, m, s, ready: ms === 0 };
};

const colorMap = {
  emerald: {
    ring: "from-emerald-500/30 to-emerald-400/10",
    accent: "text-emerald-300",
    btn: "from-emerald-500 to-emerald-400 shadow-emerald-500/25",
    badge: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  },
  indigo: {
    ring: "from-indigo-500/30 to-indigo-400/10",
    accent: "text-indigo-300",
    btn: "from-indigo-500 to-indigo-400 shadow-indigo-500/25",
    badge: "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
  },
  cyan: {
    ring: "from-cyan-500/30 to-cyan-400/10",
    accent: "text-cyan-300",
    btn: "from-cyan-500 to-cyan-400 shadow-cyan-500/25",
    badge: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
  },
};

// ---------------------------------------------------------------------------
// TierCard
// ---------------------------------------------------------------------------
const TierCard = ({ tier, onLaunch }) => {
  const c = colorMap[tier.color] || colorMap.emerald;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${c.ring} blur-3xl`}
      />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className={`grid h-9 w-9 place-items-center rounded-lg bg-white/5 ${c.accent}`}>
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">
              {tier.label}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              {tier.days}-day lock
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.badge}`}
          >
            {tier.yieldPct}% yield
          </span>
        </div>

        <p className="mb-4 text-xs text-slate-400">{tier.tagline}</p>

        <div className="mb-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
            <div className="text-[9px] uppercase tracking-widest text-slate-500">
              Min
            </div>
            <div className="font-semibold tabular-nums">
              ${fmt(tier.minAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
            <div className="text-[9px] uppercase tracking-widest text-slate-500">
              Max
            </div>
            <div className="font-semibold tabular-nums">
              ${fmt(tier.maxAmount)}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onLaunch(tier)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.btn} px-4 py-2.5 text-sm font-semibold text-white shadow-lg`}
        >
          <Play className="h-4 w-4" /> Allocate & Launch
        </motion.button>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Launch modal
// ---------------------------------------------------------------------------
const LaunchModal = ({ tier, onClose, onSubmit, wallet }) => {
  const c = colorMap[tier?.color] || colorMap.emerald;
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const usdt = Number(wallet?.USDT || 0);
  const usable = useMemo(() => {
    if (!tier) return 0;
    return Math.min(usdt, tier.maxAmount);
  }, [usdt, tier]);

  const projected = (parseFloat(amount) || 0) * (1 + (tier?.yieldPct || 0) / 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tier || submitting) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError("Enter an amount.");
    if (amt < tier.minAmount) return setError(`Minimum ${tier.minAmount} USDT.`);
    if (amt > tier.maxAmount) return setError(`Maximum ${tier.maxAmount} USDT.`);
    if (amt > usdt) return setError(`Not enough USDT. You have ${fmt(usdt)}.`);
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(tier, amt);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {tier && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div
              className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${c.ring} opacity-40 blur-xl`}
            />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bot className={`h-4 w-4 ${c.accent}`} /> Launch{" "}
                  {tier.label}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    <span>Amount (USDT)</span>
                    <span>Available: {fmt(usdt)} USDT</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`${tier.minAmount} - ${tier.maxAmount}`}
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-lg font-semibold text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[0.25, 0.5, 0.75, 1].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setAmount(String(Math.floor(usable * p) || ""))
                      }
                      className="rounded-lg border border-white/5 bg-white/[0.02] py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    >
                      {p * 100}%
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Lock duration</span>
                    <span className="font-semibold">{tier.days} days</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-400">Yield</span>
                    <span className={`font-semibold ${c.accent}`}>
                      +{tier.yieldPct}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-slate-400">Projected payout</span>
                    <span className="font-semibold">{fmt(projected, 4)} USDT</span>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.01 } : undefined}
                  whileTap={!submitting ? { scale: 0.99 } : undefined}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${c.btn} px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-70`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Locking…
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Confirm & Lock
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// PositionCard
// ---------------------------------------------------------------------------
const PositionCard = ({ position, onClaim, claiming }) => {
  const cd = useCountdown(position.endsAt);
  const c = colorMap[
    position.tier === "micro"
      ? "emerald"
      : position.tier === "quantum"
      ? "cyan"
      : "indigo"
  ];
  const payout = position.principal * (1 + position.yieldPct / 100);
  const isDone = position.status === "completed";
  const canClaim = !isDone && cd.ready;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`grid h-8 w-8 place-items-center rounded-lg bg-white/5 ${c.accent}`}>
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold">
              {position.tierLabel || position.tier}
            </div>
            <div className="text-[10px] text-slate-500">
              {position.days}-day · +{position.yieldPct}%
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isDone
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
              : canClaim
              ? "border-amber-400/25 bg-amber-500/10 text-amber-200"
              : c.badge
          }`}
        >
          {isDone ? "Claimed" : canClaim ? "Ready" : "Active"}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500">
            Principal
          </div>
          <div className="font-semibold tabular-nums">
            {fmt(position.principal)} {position.symbol}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500">
            Payout
          </div>
          <div className={`font-semibold tabular-nums ${c.accent}`}>
            {fmt(isDone ? position.payout : payout, 4)} {position.symbol}
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">
            {cd.ready
              ? "Matured — claim your payout"
              : `${cd.d}d ${cd.h}h ${cd.m}m ${cd.s}s`}
          </span>
        </div>
      )}

      {!isDone && (
        <motion.button
          disabled={!canClaim || claiming}
          onClick={() => onClaim(position)}
          whileHover={canClaim && !claiming ? { scale: 1.01 } : undefined}
          whileTap={canClaim && !claiming ? { scale: 0.99 } : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-lg ${
            canClaim
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-emerald-500/25"
              : "bg-white/[0.03] text-slate-500"
          } disabled:cursor-not-allowed`}
        >
          {claiming ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming…
            </>
          ) : (
            <>
              <Trophy className="h-3.5 w-3.5" />
              {canClaim ? "Claim Payout" : "Locked"}
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Main QuantBot
// ---------------------------------------------------------------------------
export default function QuantBot({ user, onUserUpdate, toast }) {
  const [tiers, setTiers] = useState(FALLBACK_TIERS);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [launchTier, setLaunchTier] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const wallet = useMemo(() => {
    const w = user?.wallet;
    if (!w) return {};
    if (w instanceof Map) return Object.fromEntries(w);
    return { ...w };
  }, [user]);

  const say = (kind, message) => {
    if (toast) toast(kind, message);
  };

  const loadTiers = async () => {
    try {
      const res = await StakingAPI.tiers();
      if (Array.isArray(res.tiers) && res.tiers.length) setTiers(res.tiers);
    } catch {
      /* keep fallback */
    }
  };

  const loadPositions = async () => {
    setLoading(true);
    try {
      const res = await StakingAPI.positions();
      setPositions(res.positions || []);
    } catch (err) {
      say("error", err?.message || "Failed to load positions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTiers();
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLaunch = async (tier, amount) => {
    try {
      const res = await StakingAPI.lock({
        tier: tier.key,
        principal: amount,
      });
      setPositions((prev) => [res.position, ...prev]);
      if (res.user) onUserUpdate?.(res.user);
      say("success", res.message || `${tier.label} activated.`);
      setLaunchTier(null);
    } catch (err) {
      say("error", err?.message || "Failed to launch bot.");
    }
  };

  const handleClaim = async (position) => {
    setClaimingId(position._id);
    try {
      const res = await StakingAPI.claim(position._id);
      setPositions((prev) =>
        prev.map((p) => (p._id === position._id ? res.position : p))
      );
      if (res.user) onUserUpdate?.(res.user);
      say("success", res.message || "Claimed.");
    } catch (err) {
      say("error", err?.message || "Failed to claim.");
    } finally {
      setClaimingId(null);
    }
  };

  const activePositions = positions.filter((p) => p.status === "active");
  const totalStaked = activePositions.reduce((s, p) => s + p.principal, 0);
  const totalProjected = activePositions.reduce(
    (s, p) => s + p.principal * (1 + p.yieldPct / 100),
    0
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <Wallet className="h-3 w-3" /> Spot USDT
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums">
            {fmt(wallet.USDT)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <Bot className="h-3 w-3" /> Currently Staked
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums">
            {fmt(totalStaked)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <TrendingUp className="h-3 w-3" /> Projected Payout
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-emerald-300">
            {fmt(totalProjected)}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold tracking-tight">
            Quant Bot Tiers
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t) => (
            <TierCard key={t.key} tier={t} onLaunch={setLaunchTier} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-300" />
            <h2 className="text-sm font-semibold tracking-tight">
              My Positions
            </h2>
          </div>
          <button
            onClick={loadPositions}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {positions.map((p) => (
              <PositionCard
                key={p._id}
                position={p}
                claiming={claimingId === p._id}
                onClaim={handleClaim}
              />
            ))}
          </AnimatePresence>
        </div>
        {!loading && positions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
            No positions yet. Pick a tier above and put your capital to work.
          </div>
        )}
      </div>

      <LaunchModal
        tier={launchTier}
        onClose={() => setLaunchTier(null)}
        onSubmit={handleLaunch}
        wallet={wallet}
      />
    </div>
  );
}
