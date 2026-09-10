/**
 * Profile strategy wallets — AI Futures lock + Smart Spot commission.
 */
import { useEffect, useMemo, useState } from "react";
import { Bot, Copy } from "lucide-react";
import { AiBotAPI, CopyBotAPI, WalletAPI } from "../lib/api.js";
import {
  RECOVER_DAYS,
  accruedFromSchedule,
  matchCommissionTier,
  smartSpotTargetPct,
} from "../lib/aiBotYield.js";

function fmtUsd(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function remainLabel(endAt, now) {
  if (!endAt) return "—";
  const ms = new Date(endAt).getTime() - now;
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "Lock ended";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}

function isSmartSpotTx(tx) {
  const src = String(tx.source || "").toLowerCase();
  if (src === "smart_copy") return true;
  const note = String(tx.reviewerNote || tx.note || "");
  return /smart spot|smart copy/i.test(note);
}

function txCredit(tx) {
  if (typeof tx.ledgerDelta === "number") return Number(tx.ledgerDelta) || 0;
  const amt = Number(tx.usdValue ?? tx.amount ?? 0) || 0;
  if (tx.kind === "withdrawal" || tx.side === "sell") return -amt;
  return amt;
}

function StrategyCard({
  icon: Icon,
  title,
  active,
  balance,
  commission,
  daily,
  displayPct,
  remain,
  progress,
  emptyText,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
          <Icon className="h-3.5 w-3.5 text-cyan-300" />
          {title}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            active
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/5 text-slate-500"
          }`}
        >
          {active ? "Active" : "Off"}
        </span>
      </div>

      {active ? (
        <>
          <div className="mt-2 text-3xl font-bold tabular-nums text-white">
            ${fmtUsd(balance)}
          </div>
          <div className="mt-0.5 text-sm text-slate-400">Locked balance</div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Commission
              </div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-300">
                ${fmtUsd(commission)}
              </div>
              <div className="text-[10px] text-slate-500">
                {displayPct != null
                  ? `${Number(displayPct).toFixed(2)}% today · $${fmtUsd(daily)}`
                  : `Daily $${fmtUsd(daily)}`}
              </div>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                Remaining days
              </div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-white">
                {remain}
              </div>
              <div className="text-[10px] text-cyan-200/70">
                {RECOVER_DAYS}-day recover path
              </div>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
              style={{ width: `${Math.round(Math.min(100, progress * 100))}%` }}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

export default function StrategyBalanceCards({ user }) {
  const [bot, setBot] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [desk, setDesk] = useState(null);
  const [smartEarned, setSmartEarned] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await AiBotAPI.config();
        if (!cancelled) {
          setBot(res?.bot || null);
          setTiers(res?.defaults?.commissionTiers || []);
        }
      } catch {
        if (!cancelled) setBot(null);
      }
      try {
        const [deskRes, txRes] = await Promise.all([
          CopyBotAPI.desk().catch(() => null),
          WalletAPI.transactions().catch(() => ({ transactions: [] })),
        ]);
        if (cancelled) return;
        setDesk(deskRes?.desk || null);
        const paid = (txRes?.transactions || [])
          .filter(isSmartSpotTx)
          .filter((tx) =>
            ["completed", "approved"].includes(String(tx.status || "").toLowerCase())
          )
          .reduce((sum, tx) => sum + Math.max(0, txCredit(tx)), 0);
        setSmartEarned(paid);
      } catch {
        if (!cancelled) {
          setDesk(null);
          setSmartEarned(0);
        }
      }
    };
    load();
    const tick = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [user?.id, user?._id, user?.aiBotActive, user?.aiBotPrincipal]);

  const liveBot = bot || {
    aiBotActive: user?.aiBotActive,
    aiBotPrincipal: user?.aiBotPrincipal,
    aiBotLockDays: user?.aiBotLockDays || user?.aiBotAssignedLockDays,
    aiBotStartDate: user?.aiBotStartDate,
    aiBotEndDate: user?.aiBotEndDate,
    aiBotCustomPercentage: user?.aiBotCustomPercentage,
  };

  const userSeed = String(user?._id || user?.id || "anon");

  const ai = useMemo(() => {
    const active = Boolean(liveBot?.aiBotActive);
    const principal = Number(liveBot?.aiBotPrincipal || 0);
    const lockDays = Number(
      liveBot?.aiBotLockDays || liveBot?.aiBotAssignedLockDays || RECOVER_DAYS
    );
    const end = liveBot?.aiBotEndDate
      ? new Date(liveBot.aiBotEndDate).getTime()
      : liveBot?.aiBotStartDate && lockDays
        ? new Date(liveBot.aiBotStartDate).getTime() + lockDays * 86400000
        : 0;
    if (!active || !liveBot?.aiBotStartDate) {
      return {
        active,
        principal,
        daily: 0,
        commission: 0,
        displayPct: null,
        remain: remainLabel(end || null, now),
        progress: 0,
      };
    }
    const view = accruedFromSchedule({
      seed: `ai:${userSeed}`,
      startDate: liveBot.aiBotStartDate,
      days: lockDays,
      targetPct:
        Number(liveBot.aiBotCustomPercentage) ||
        matchCommissionTier({
          principal,
          days: lockDays,
          tiers,
        })?.aiDailyPct ||
        1.25,
      principal,
      now,
    });
    return {
      active,
      principal,
      daily: view.daily,
      commission: view.total,
      displayPct: view.displayPct,
      remain: remainLabel(end || null, now),
      progress: view.progress,
    };
  }, [liveBot, now, userSeed, tiers]);

  const spot = useMemo(() => {
    const active = Boolean(liveBot?.aiBotActive || desk?.unlocked);
    const principal = Number(
      desk?.aiPrincipal || liveBot?.aiBotPrincipal || 0
    );
    const lockDays = Number(
      liveBot?.aiBotLockDays || liveBot?.aiBotAssignedLockDays || RECOVER_DAYS
    );
    const end = liveBot?.aiBotEndDate || null;
    const target =
      Number(desk?.autoRate ?? desk?.liveRate) ||
      smartSpotTargetPct(principal, lockDays, tiers);
    if (!active || !liveBot?.aiBotStartDate) {
      return {
        active,
        principal,
        daily: Number(desk?.estimatedCredit || 0),
        commission: smartEarned,
        displayPct: desk?.liveRate != null ? Number(desk.liveRate) : null,
        remain: remainLabel(end, now),
        progress: 0,
      };
    }
    const view = accruedFromSchedule({
      seed: `spot:${userSeed}`,
      startDate: liveBot.aiBotStartDate,
      days: lockDays,
      targetPct: target,
      principal,
      now,
    });
    return {
      active,
      principal,
      daily: view.daily,
      commission: view.total,
      displayPct: view.displayPct,
      remain: remainLabel(end, now),
      progress: view.progress,
    };
  }, [desk, liveBot, now, smartEarned, userSeed, tiers]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StrategyCard
        icon={Bot}
        title="AI Futures Strategy"
        active={ai.active}
        balance={ai.principal}
        commission={ai.commission}
        daily={ai.daily}
        displayPct={ai.displayPct}
        remain={ai.remain}
        progress={ai.progress}
        emptyText="Subscribe to AI Futures Strategy to lock a balance here. Remaining days and commission will show on this card."
      />
      <StrategyCard
        icon={Copy}
        title="Smart Spot Trade"
        active={spot.active}
        balance={spot.principal}
        commission={spot.commission}
        daily={spot.daily}
        displayPct={spot.displayPct}
        remain={spot.remain}
        progress={spot.progress}
        emptyText="Subscribe to AI Futures Strategy to unlock Smart Spot Trade. Commission and remaining days will show here."
      />
    </div>
  );
}
