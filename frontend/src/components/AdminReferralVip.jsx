/**
 * Admin: Referral & VIP System Management — live commission rates + tiers.
 */
import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, Plus, RefreshCw, Save, Trash2, Zap } from "lucide-react";
import { AdminAPI } from "../lib/api.js";

const TIER_DEFAULTS = [
  { level: 1, minVolume30d: 1000, commissionRate: 10, perk: "Priority Live Chat queue" },
  { level: 2, minVolume30d: 10000, commissionRate: 15, perk: "Faster deposit screenshot review" },
  { level: 3, minVolume30d: 50000, commissionRate: 20, perk: "Personal manager routing" },
  { level: 4, minVolume30d: 100000, commissionRate: 22, perk: "Faster withdrawal review window" },
  { level: 5, minVolume30d: 200000, commissionRate: 24, perk: "Dedicated VIP desk hours" },
  { level: 6, minVolume30d: 350000, commissionRate: 26, perk: "Elevated Copy AI Bot allocation" },
  { level: 7, minVolume30d: 500000, commissionRate: 28, perk: "Concierge KYC and payout help" },
  { level: 8, minVolume30d: 750000, commissionRate: 30, perk: "Higher desk limits on verified rails" },
  { level: 9, minVolume30d: 1200000, commissionRate: 32, perk: "Senior relationship manager" },
  { level: 10, minVolume30d: 2000000, commissionRate: 35, perk: "Top-desk status and max referral cut" },
];

const emptyTier = (level) => {
  const d = TIER_DEFAULTS.find((t) => t.level === level) || {
    minVolume30d: level * 250000,
    commissionRate: Math.min(40, 8 + level * 2),
    perk: "",
  };
  return {
    level,
    name: `VIP ${level}`,
    minVolume30d: d.minVolume30d,
    commissionRate: d.commissionRate,
    perk: d.perk || "",
  };
};

export default function AdminReferralVip({ toast }) {
  const say = toast || (() => {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [defaultRate, setDefaultRate] = useState("15");
  const [unlockDays, setUnlockDays] = useState("30");
  const [tiers, setTiers] = useState(TIER_DEFAULTS.map((t) => emptyTier(t.level)));
  const [scope, setScope] = useState("tenant");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getReferralVip();
      const s = res.settings || {};
      setDefaultRate(String(s.defaultReferralCommissionRate ?? 15));
      setUnlockDays(String(s.referralUnlockTradingDays ?? 30));
      setTiers(
        Array.isArray(s.vipTierSettings) && s.vipTierSettings.length
          ? s.vipTierSettings
          : TIER_DEFAULTS.map((t) => emptyTier(t.level))
      );
      setScope(res.scope || "tenant");
    } catch (err) {
      say("error", err?.message || "Failed to load VIP settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await AdminAPI.saveReferralVip({
        defaultReferralCommissionRate: Number(defaultRate),
        referralUnlockTradingDays: Number(unlockDays),
        vipTierSettings: tiers.map((t, i) => ({
          level: Number(t.level) || i + 1,
          name: t.name || `VIP ${i + 1}`,
          minVolume30d: Number(t.minVolume30d) || 0,
          commissionRate: Number(t.commissionRate) || 0,
          perk: t.perk || "",
        })),
      });
      say("success", res.message || "Settings saved.");
      if (res.settings) {
        setTiers(res.settings.vipTierSettings || tiers);
      }
    } catch (err) {
      say("error", err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const runUpgrade = async () => {
    setRunning(true);
    try {
      const res = await AdminAPI.runVipUpgrade();
      say("success", res.message || "Sweep complete.");
    } catch (err) {
      say("error", err?.message || "Upgrade sweep failed.");
    } finally {
      setRunning(false);
    }
  };

  const updateTier = (idx, key, value) => {
    setTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Crown className="h-4 w-4 text-[#00C2B3]" />
        <h2 className="text-lg font-semibold">Referral & VIP System</h2>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
          {scope}
        </span>
        <button
          type="button"
          onClick={load}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Base referral commission applies to Standard accounts (VIP 0). VIP 1–10
        replace that rate from 30-day trading volume. Each level also has a desk
        perk shown on the VIP and Referral pages.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block text-slate-500">
                Default referral commission %
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#070a12] px-2.5 py-2 text-sm"
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-500">
                Unlock after N active trading days
              </span>
              <input
                type="number"
                min={1}
                max={365}
                value={unlockDays}
                onChange={(e) => setUnlockDays(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#070a12] px-2.5 py-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                VIP tier matrix
              </div>
              <button
                type="button"
                onClick={() =>
                  setTiers((prev) => [...prev, emptyTier(prev.length + 1)])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 px-2 py-1 text-[11px] font-semibold text-cyan-200"
              >
                <Plus className="h-3 w-3" /> Add tier
              </button>
            </div>
            {tiers.map((t, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border border-white/10 bg-[#0c1222] p-3 sm:grid-cols-[70px_1fr_1fr_1fr_1fr_auto]"
              >
                <label className="text-[10px] text-slate-500">
                  Level
                  <input
                    type="number"
                    min={1}
                    value={t.level}
                    onChange={(e) => updateTier(i, "level", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[10px] text-slate-500">
                  Name
                  <input
                    value={t.name}
                    onChange={(e) => updateTier(i, "name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[10px] text-slate-500">
                  30-day volume $
                  <input
                    type="number"
                    min={0}
                    value={t.minVolume30d}
                    onChange={(e) =>
                      updateTier(i, "minVolume30d", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[10px] text-slate-500">
                  Commission %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={t.commissionRate}
                    onChange={(e) =>
                      updateTier(i, "commissionRate", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[10px] text-slate-500">
                  Perk / detailing
                  <input
                    value={t.perk || ""}
                    onChange={(e) => updateTier(i, "perk", e.target.value)}
                    placeholder="What this level unlocks"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTiers((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="self-end rounded-lg border border-rose-400/20 p-2 text-rose-300"
                  aria-label="Remove tier"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save live rates
            </button>
            <button
              type="button"
              disabled={running}
              onClick={runUpgrade}
              className="inline-flex items-center gap-2 rounded-xl border border-[#00C2B3]/30 bg-[#00C2B3]/10 px-4 py-2.5 text-sm font-semibold text-[#00C2B3] disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run VIP upgrade now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
