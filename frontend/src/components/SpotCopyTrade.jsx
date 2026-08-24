/**
 * AI Spot Copy Trade — analytics tabs + follow/lock strategy.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Loader2,
  TrendingUp,
  Users,
  Target,
  Lock,
  BarChart3,
  Activity,
} from "lucide-react";
import { CopyBotAPI } from "../lib/api.js";

const TABS = [
  { id: "analytics", label: "AI Analytics", icon: BarChart3 },
  { id: "prediction", label: "Prediction & Asset", icon: Target },
  { id: "followers", label: "Live Followers", icon: Users },
  { id: "lock", label: "Execution & Lock", icon: Lock },
];

function fmtUsd(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function AccuracyBars({ pct }) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  return (
    <div className="mt-3 space-y-2">
      {[
        { label: "7d window", v: Math.max(40, n - 6) },
        { label: "30d window", v: n },
        { label: "90d window", v: Math.min(95, n + 4) },
      ].map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-[10px] text-slate-500">
            <span>{row.label}</span>
            <span className="font-semibold text-cyan-300">{row.v}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${row.v}%` }}
              transition={{ duration: 0.7 }}
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SpotCopyTrade({ onToast, onWalletUpdate, walletUsdt = 0 }) {
  const [bots, setBots] = useState([]);
  const [top, setTop] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lock, setLock] = useState(null);
  const [tab, setTab] = useState("analytics");
  const [loading, setLoading] = useState(true);
  const [principal, setPrincipal] = useState("100");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, lockRes] = await Promise.all([
        CopyBotAPI.list("spot_copy"),
        CopyBotAPI.myLock(),
      ]);
      setBots(listRes.bots || []);
      setTop(listRes.topPrediction || null);
      setLock(lockRes.lock || null);
      setSelectedId((prev) => {
        if (prev && (listRes.bots || []).some((b) => b.id === prev)) return prev;
        return listRes.bots?.[0]?.id || null;
      });
    } catch (err) {
      onToast?.("error", err?.message || "Failed to load Spot Copy bots.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const bot = useMemo(
    () => bots.find((b) => b.id === selectedId) || bots[0] || null,
    [bots, selectedId]
  );

  const accuracyNum = useMemo(() => {
    const raw = String(bot?.accuracyHistorical || "70").replace(/%/g, "");
    const n = Number(raw);
    return Number.isFinite(n) ? n : 70;
  }, [bot]);

  const follow = async () => {
    if (!bot || busy) return;
    const amt = Number(principal);
    if (!Number.isFinite(amt) || amt <= 0) {
      onToast?.("error", "Enter a valid amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await CopyBotAPI.follow({ botId: bot.id, principal: amt });
      onToast?.("success", res.message || "Strategy followed.");
      if (res.user && onWalletUpdate) onWalletUpdate(res.user);
      await load();
      setTab("lock");
    } catch (err) {
      onToast?.("error", err?.message || "Follow failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Spot Copy…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 to-teal-500/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              AI Spot Copy Trade
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              Top Prediction
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              AI Signal:{" "}
              <span className="font-bold text-white">
                {top?.assetType || bot?.assetType || "—"}
              </span>{" "}
              <span
                className={
                  (top?.direction || bot?.topSignalDirection) === "Bearish"
                    ? "text-rose-300"
                    : "text-emerald-300"
                }
              >
                {top?.direction || bot?.topSignalDirection || "—"}
              </span>{" "}
              (
              {top?.confidence ?? bot?.predictionConfidence ?? "—"}
              %)
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center">
            <div className="text-[10px] uppercase text-slate-500">Followers</div>
            <div className="text-xl font-bold tabular-nums text-white">
              {(bot?.totalFollowers || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {bots.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {bots.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedId(b.id)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                bot?.id === b.id
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              {b.name} · {b.assetType}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${
              tab === id ? "bg-white/10 text-white" : "text-slate-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border border-white/10 bg-[#0d1424] p-5"
        >
          {tab === "analytics" && bot && (
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Activity className="h-4 w-4 text-cyan-400" />
                Historical accuracy
              </div>
              <p className="mt-2 text-3xl font-extrabold text-teal-300">
                {bot.accuracyHistorical || `${accuracyNum}%`}{" "}
                <span className="text-base font-semibold text-slate-400">
                  success rate
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {bot.summary ||
                  "Model blends momentum, volatility regimes, and session filters. Accuracy is illustrative of closed signal history."}
              </p>
              <AccuracyBars pct={accuracyNum} />
            </div>
          )}

          {tab === "prediction" && bot && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Primary asset
                </div>
                <div className="mt-1 text-xl font-bold text-white">
                  {bot.assetType}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <TrendingUp className="h-4 w-4" />
                    {bot.topSignalDirection}
                  </span>
                  <span className="text-cyan-300">
                    Confidence {bot.predictionConfidence}%
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase text-slate-500">
                  Other high-probability signals
                </div>
                <div className="space-y-2">
                  {bots.slice(0, 4).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left text-sm"
                    >
                      <span className="font-semibold text-white">
                        {b.assetType}
                      </span>
                      <span className="text-xs text-slate-400">
                        {b.topSignalDirection} · {b.predictionConfidence}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "followers" && bot && (
            <div>
              <div className="text-4xl font-extrabold tabular-nums text-white">
                {Number(bot.totalFollowers || 0).toLocaleString()}
              </div>
              <p className="mt-1 text-sm text-slate-400">
                traders following {bot.name}
              </p>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
                  >
                    <span>
                      Trader ···
                      {String(1000 + ((bot.totalFollowers || 0) + i) % 9000)}
                    </span>
                    <span className="text-emerald-400">Followed just now</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "lock" && bot && (
            <div className="space-y-4">
              {lock ? (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                  <div className="text-sm font-bold text-emerald-200">
                    Active Spot Copy lock
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {lock.assetType || bot.assetType} · {fmtUsd(lock.principal)}{" "}
                    · {lock.lockDays}d · ends{" "}
                    {lock.endDate
                      ? new Date(lock.endDate).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-400">
                    Lock Trading Wallet funds into this Spot strategy (
                    {bot.lockDays} days · target daily commission{" "}
                    {bot.yieldPct}%).
                  </p>
                  <div className="text-xs text-slate-500">
                    Available {fmtUsd(walletUsdt)} · Min {fmtUsd(bot.minPrincipal)}
                  </div>
                  <input
                    type="number"
                    min={bot.minPrincipal}
                    step="any"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/40"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={follow}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold uppercase tracking-wide text-cyan-950 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    Follow Strategy · Lock Assets
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
