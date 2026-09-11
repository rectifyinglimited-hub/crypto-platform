/**
 * Profile strategy wallets — one lock, two desks, one countdown.
 */
import { useEffect, useMemo, useState } from "react";
import { Bot, Copy, Lock } from "lucide-react";
import { AiBotAPI, CopyBotAPI, WalletAPI } from "../lib/api.js";
import {
  RECOVER_DAYS,
  accruedFromSchedule,
  matchCommissionTier,
  smartSpotTargetPct,
} from "../lib/aiBotYield.js";
import { splitAiLockShares } from "../lib/walletDisplay.js";

function fmtUsd(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function remainParts(endAt, now) {
  const ms = endAt ? new Date(endAt).getTime() - now : NaN;
  if (!Number.isFinite(ms) || ms <= 0) {
    return { ended: true, days: 0, hours: 0, mins: 0, secs: 0, label: "Lock ended" };
  }
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { ended: false, days, hours, mins, secs, label: "" };
}

function pad2(n) {
  return String(n).padStart(2, "0");
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

function DeskPanel({ icon: Icon, title, balance, commission, daily, displayPct }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
        <Icon className="h-3.5 w-3.5 text-cyan-300" />
        {title}
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-400/25 bg-amber-400/10">
          <Lock className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.4} />
        </span>
        <div className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
          ${fmtUsd(balance)}
        </div>
      </div>
      <div className="mt-0.5 text-xs text-slate-400">Locked balance</div>
      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
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
    </div>
  );
}

function LockTimer({ endAt, now, lockDays, progress }) {
  const t = remainParts(endAt, now);
  const days = Number(lockDays) > 0 ? Number(lockDays) : RECOVER_DAYS;
  const cells = [
    { n: t.days, l: "Days" },
    { n: t.hours, l: "Hours" },
    { n: t.mins, l: "Min" },
    { n: t.secs, l: "Sec" },
  ];
  return (
    <div className="border-t border-white/10 bg-black/20 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
          Lock timer
        </div>
        <div className="text-[10px] text-slate-500">{days}-day lock</div>
      </div>
      {t.ended ? (
        <p className="mt-3 text-sm font-semibold text-amber-200">Lock ended</p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {cells.map((c) => (
            <div
              key={c.l}
              className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-1 py-2 text-center"
            >
              <div className="text-lg font-bold tabular-nums text-white sm:text-xl">
                {pad2(c.n)}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/70">
                {c.l}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300"
          style={{ width: `${Math.round(Math.min(100, (progress || 0) * 100))}%` }}
        />
      </div>
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
  }, [
    user?.id,
    user?._id,
    user?.aiBotActive,
    user?.aiBotPrincipal,
    user?.smartCopyHeldUsdt,
  ]);

  const liveBot = bot || {
    aiBotActive: user?.aiBotActive,
    aiBotPrincipal: user?.aiBotPrincipal,
    aiBotLockDays: user?.aiBotLockDays || user?.aiBotAssignedLockDays,
    aiBotStartDate: user?.aiBotStartDate,
    aiBotEndDate: user?.aiBotEndDate,
    aiBotCustomPercentage: user?.aiBotCustomPercentage,
    smartCopyHeldUsdt: user?.smartCopyHeldUsdt,
  };

  const userSeed = String(user?._id || user?.id || "anon");
  const heldSpot = Number(
    liveBot?.smartCopyHeldUsdt ??
      user?.smartCopyHeldUsdt ??
      desk?.heldCommission ??
      0
  );

  const lockDays = Number(
    liveBot?.aiBotLockDays || liveBot?.aiBotAssignedLockDays || RECOVER_DAYS
  );
  const endAt = liveBot?.aiBotEndDate
    ? new Date(liveBot.aiBotEndDate).getTime()
    : liveBot?.aiBotStartDate && lockDays
      ? new Date(liveBot.aiBotStartDate).getTime() + lockDays * 86400000
      : 0;

  const ai = useMemo(() => {
    const active = Boolean(liveBot?.aiBotActive);
    const principal = Number(liveBot?.aiBotPrincipal || 0);
    const share = splitAiLockShares(principal).ai;
    if (!active || !liveBot?.aiBotStartDate) {
      return { active, balance: share, daily: 0, commission: 0, displayPct: null, progress: 0 };
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
      principal: share,
      now,
    });
    return {
      active,
      balance: share,
      daily: view.daily,
      commission: view.total,
      displayPct: view.displayPct,
      progress: view.progress,
    };
  }, [liveBot, now, userSeed, tiers, lockDays]);

  const spot = useMemo(() => {
    const active = Boolean(liveBot?.aiBotActive || desk?.unlocked);
    const principal = Number(desk?.aiPrincipal || liveBot?.aiBotPrincipal || 0);
    const share = splitAiLockShares(principal).spot;
    const locked = Number((share + Math.max(0, heldSpot)).toFixed(8));
    const target =
      Number(desk?.autoRate ?? desk?.liveRate) ||
      smartSpotTargetPct(principal, lockDays, tiers);
    if (!active || !liveBot?.aiBotStartDate) {
      return {
        active,
        balance: locked,
        daily: Number(desk?.estimatedCredit || 0),
        commission: Math.max(0, heldSpot) || smartEarned,
        displayPct: desk?.liveRate != null ? Number(desk.liveRate) : null,
        progress: 0,
      };
    }
    const view = accruedFromSchedule({
      seed: `spot:${userSeed}`,
      startDate: liveBot.aiBotStartDate,
      days: lockDays,
      targetPct: target,
      principal: share,
      now,
    });
    return {
      active,
      balance: locked,
      daily: view.daily,
      commission: Math.max(0, heldSpot) || view.total,
      displayPct: view.displayPct,
      progress: view.progress,
    };
  }, [desk, liveBot, now, smartEarned, userSeed, tiers, heldSpot, lockDays]);

  const active = Boolean(ai.active || spot.active);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
          Strategy wallets
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
          <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-white/8">
            <DeskPanel
              icon={Bot}
              title="AI Futures Strategy"
              balance={ai.balance}
              commission={ai.commission}
              daily={ai.daily}
              displayPct={ai.displayPct}
            />
            <div className="border-t border-white/8 sm:border-t-0">
              <DeskPanel
                icon={Copy}
                title="Smart Spot Trade"
                balance={spot.balance}
                commission={spot.commission}
                daily={spot.daily}
                displayPct={spot.displayPct}
              />
            </div>
          </div>
          <LockTimer
            endAt={endAt}
            now={now}
            lockDays={lockDays}
            progress={ai.progress || spot.progress}
          />
        </>
      ) : (
        <p className="px-4 py-5 text-sm text-slate-500 sm:px-5">
          Subscribe to AI Futures Strategy to lock a balance here. Both desks and
          the lock timer will show in this section.
        </p>
      )}
    </div>
  );
}
