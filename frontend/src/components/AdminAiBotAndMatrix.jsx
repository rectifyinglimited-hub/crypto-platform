/**
 * Admin: AI Bot Management + Algorithmic Trade Matrix.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  RefreshCw,
  Save,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { AiBotAPI } from "../lib/api.js";

export default function AdminAiBotAndMatrix({ toast }) {
  const say = toast || (() => {});
  const [tab, setTab] = useState("bots");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [yieldEdits, setYieldEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([
        AiBotAPI.adminActiveUsers(),
        AiBotAPI.adminContracts("active"),
      ]);
      setUsers(u.users || []);
      setContracts(c.contracts || []);
    } catch (err) {
      say("error", err?.message || "Failed to load AI bots.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AiBotAPI.adminMatrix();
      setMatrix({
        enabled: res.algoMatrix?.enabled !== false,
        stakeThreshold: res.algoMatrix?.stakeThreshold ?? 100,
        winPercentage: res.algoMatrix?.winPercentage ?? 25,
        lowPattern: (res.algoMatrix?.lowPattern || ["win", "loss", "loss", "loss"]).join(","),
        highPatternKey: res.algoMatrix?.highPatternKey || "A",
      });
      setDefaults({
        defaultYieldPct: res.aiBotDefaults?.defaultYieldPct ?? 8,
        minPrincipal: res.aiBotDefaults?.minPrincipal ?? 50,
        lockOptions: (res.aiBotDefaults?.lockOptions || [7, 15, 30, 90]).join(","),
        contractVersion: res.aiBotDefaults?.contractVersion || "v1.0",
      });
    } catch (err) {
      say("error", err?.message || "Failed to load matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "bots") loadBots();
    if (tab === "matrix") loadMatrix();
  }, [tab, loadBots, loadMatrix]);

  const saveYield = async (userId) => {
    const pct = Number(yieldEdits[userId]);
    if (!Number.isFinite(pct)) {
      say("error", "Enter a valid percentage.");
      return;
    }
    try {
      const res = await AiBotAPI.adminSetYield(userId, pct);
      say("success", res.message);
      loadBots();
    } catch (err) {
      say("error", err?.message || "Failed to set yield.");
    }
  };

  const saveMatrix = async () => {
    setSaving(true);
    try {
      const lowPattern = String(matrix.lowPattern || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .map((s) => (s.startsWith("w") ? "win" : "loss"));
      const lockOptions = String(defaults.lockOptions || "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0);
      const res = await AiBotAPI.adminSaveMatrix({
        algoMatrix: {
          enabled: matrix.enabled,
          stakeThreshold: Number(matrix.stakeThreshold),
          winPercentage: Number(matrix.winPercentage),
          lowPattern: lowPattern.length ? lowPattern : ["win", "loss", "loss", "loss"],
          highPatternKey: matrix.highPatternKey,
        },
        aiBotDefaults: {
          defaultYieldPct: Number(defaults.defaultYieldPct),
          minPrincipal: Number(defaults.minPrincipal),
          lockOptions: lockOptions.length ? lockOptions : [7, 15, 30, 90],
          contractVersion: defaults.contractVersion,
        },
      });
      say("success", res.message || "Saved.");
    } catch (err) {
      say("error", err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="h-4 w-4 text-cyan-300" />
        <h2 className="text-lg font-semibold">AI Bot & Trade Algorithm</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["bots", "AI Bot Management"],
          ["matrix", "Algorithmic Trade Matrix"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              tab === k
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                : "border-white/10 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (tab === "bots" ? loadBots() : loadMatrix())}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      )}

      {!loading && tab === "bots" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Active AI Bot contracts. Set per-user target yield (`aiBotCustomPercentage`).
          </p>
          {users.map((u) => (
            <div
              key={u._id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">
                  {u.fullName || u.username}
                </div>
                <div className="text-[11px] text-slate-500">
                  {u.email} · Lock {u.aiBotLockDays}d · Principal $
                  {Number(u.aiBotPrincipal || 0).toFixed(2)} · Ends{" "}
                  {u.aiBotEndDate
                    ? new Date(u.aiBotEndDate).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                  placeholder={`${u.aiBotCustomPercentage ?? 8}`}
                  value={yieldEdits[u._id] ?? u.aiBotCustomPercentage ?? ""}
                  onChange={(e) =>
                    setYieldEdits((prev) => ({
                      ...prev,
                      [u._id]: e.target.value,
                    }))
                  }
                />
                <span className="text-[11px] text-slate-500">%</span>
                <button
                  type="button"
                  onClick={() => saveYield(u._id)}
                  className="rounded-lg bg-cyan-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950"
                >
                  Set yield
                </button>
              </div>
            </div>
          ))}
          {!users.length && (
            <div className="py-8 text-center text-sm text-slate-500">
              No active AI Bot contracts.
            </div>
          )}
          {contracts.length > 0 && (
            <div className="pt-2 text-[11px] text-slate-500">
              {contracts.length} contract record(s) in ledger.
            </div>
          )}
        </div>
      )}

      {!loading && tab === "matrix" && matrix && defaults && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#0c1222] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
              Algorithmic Trade Matrix (seconds / delivery)
            </div>
            <p className="text-[11px] text-slate-500">
              Applies when global trading is ON and no Force Win/Lose override is set.
              Low stake uses mixed sequence; high stake uses Pattern A/B/C.
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={matrix.enabled}
                onChange={(e) =>
                  setMatrix({ ...matrix, enabled: e.target.checked })
                }
              />
              Enable algorithmic matrix
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Stake threshold (Small vs High)"
                value={matrix.stakeThreshold}
                onChange={(v) => setMatrix({ ...matrix, stakeThreshold: v })}
              />
              <Field
                label="Win percentage (0–100 fallback)"
                value={matrix.winPercentage}
                onChange={(v) => setMatrix({ ...matrix, winPercentage: v })}
              />
              <label className="block text-xs sm:col-span-2">
                <span className="text-slate-500">Low-stake pattern (comma: win,loss,...)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-3 py-2 text-sm"
                  value={matrix.lowPattern}
                  onChange={(e) =>
                    setMatrix({ ...matrix, lowPattern: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="text-slate-500">High-stake pattern</span>
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-3 py-2 text-sm"
                  value={matrix.highPatternKey}
                  onChange={(e) =>
                    setMatrix({ ...matrix, highPatternKey: e.target.value })
                  }
                >
                  <option value="A">A — 2 Loss then 1 Win (same stake)</option>
                  <option value="B">B — Alternating L/W</option>
                  <option value="C">C — Conservative 2 Loss : 1 Win</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0c1222] p-4 space-y-3">
            <div className="text-sm font-semibold text-white">AI Bot global defaults</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Default yield %"
                value={defaults.defaultYieldPct}
                onChange={(v) => setDefaults({ ...defaults, defaultYieldPct: v })}
              />
              <Field
                label="Min principal USDT"
                value={defaults.minPrincipal}
                onChange={(v) => setDefaults({ ...defaults, minPrincipal: v })}
              />
              <label className="block text-xs sm:col-span-2">
                <span className="text-slate-500">Lock options (days, comma)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-3 py-2 text-sm"
                  value={defaults.lockOptions}
                  onChange={(e) =>
                    setDefaults({ ...defaults, lockOptions: e.target.value })
                  }
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={saveMatrix}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-950 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save matrix & defaults
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Tenant admins only affect their users; Super Admin sees all contracts.
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-white/10 bg-[#070a12] px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
