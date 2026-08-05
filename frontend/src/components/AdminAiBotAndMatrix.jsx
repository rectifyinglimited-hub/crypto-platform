/**
 * Admin: AI Bot Management + Algorithmic Trade Matrix.
 * Assign per-user lock days + yield from admin side.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { AiBotAPI } from "../lib/api.js";

export default function AdminAiBotAndMatrix({ toast }) {
  const say = toast || (() => {});
  const [tab, setTab] = useState("bots");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [yieldEdits, setYieldEdits] = useState({});
  const [dayEdits, setDayEdits] = useState({});
  const [query, setQuery] = useState("");
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

  const loadSearch = useCallback(async (q) => {
    try {
      const res = await AiBotAPI.adminSearchUsers(q);
      setSearchUsers(res.users || []);
    } catch (err) {
      say("error", err?.message || "User search failed.");
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
    if (tab === "bots") {
      loadBots();
      loadSearch("");
    }
    if (tab === "matrix") loadMatrix();
  }, [tab, loadBots, loadMatrix, loadSearch]);

  const saveUserBot = async (userId) => {
    const payload = {};
    if (yieldEdits[userId] !== undefined && yieldEdits[userId] !== "") {
      payload.aiBotCustomPercentage = Number(yieldEdits[userId]);
    }
    if (dayEdits[userId] !== undefined && dayEdits[userId] !== "") {
      payload.aiBotAssignedLockDays = Number(dayEdits[userId]);
    }
    if (!Object.keys(payload).length) {
      say("error", "Enter lock days and/or yield %.");
      return;
    }
    try {
      const res = await AiBotAPI.adminSetUserBot(userId, payload);
      say("success", res.message);
      loadBots();
      loadSearch(query);
    } catch (err) {
      say("error", err?.message || "Failed to update user AI Bot.");
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

  const renderUserRow = (u) => (
    <div
      key={u._id}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">
          {u.fullName || u.username}
          {u.aiBotActive ? (
            <span className="ml-2 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
              Active
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-slate-500">
          {u.email} · Assigned {u.aiBotAssignedLockDays ?? "—"}d
          {u.aiBotActive
            ? ` · Locked ${u.aiBotLockDays}d · $${Number(u.aiBotPrincipal || 0).toFixed(2)}`
            : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          className="w-20 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
          placeholder="Days"
          value={dayEdits[u._id] ?? u.aiBotAssignedLockDays ?? ""}
          onChange={(e) =>
            setDayEdits((prev) => ({ ...prev, [u._id]: e.target.value }))
          }
        />
        <span className="text-[11px] text-slate-500">days</span>
        <input
          type="number"
          className="w-20 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
          placeholder="Yield"
          value={yieldEdits[u._id] ?? u.aiBotCustomPercentage ?? ""}
          onChange={(e) =>
            setYieldEdits((prev) => ({ ...prev, [u._id]: e.target.value }))
          }
        />
        <span className="text-[11px] text-slate-500">%</span>
        <button
          type="button"
          onClick={() => saveUserBot(u._id)}
          className="rounded-lg bg-cyan-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950"
        >
          Save
        </button>
      </div>
    </div>
  );

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
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Assign lock days per user (e.g. 40). User cannot change days — only admin controls them.
            Also set target yield %.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users to assign days…"
                className="w-full rounded-xl border border-white/10 bg-[#070a12] py-2 pl-8 pr-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => loadSearch(query)}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-200"
            >
              Search
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Assign / edit users
            </div>
            {searchUsers.map(renderUserRow)}
            {!searchUsers.length && (
              <div className="py-4 text-center text-sm text-slate-500">
                No users found.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active contracts
            </div>
            {users.map(renderUserRow)}
            {!users.length && (
              <div className="py-4 text-center text-sm text-slate-500">
                No active AI Bot contracts.
              </div>
            )}
            {contracts.length > 0 && (
              <div className="pt-2 text-[11px] text-slate-500">
                {contracts.length} contract record(s) in ledger.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "matrix" && matrix && defaults && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0c1222] p-4">
          <p className="text-xs text-slate-500">
            Defaults below are platform reference only. Per-user lock days override everything on the user AI Bot page.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={matrix.enabled}
              onChange={(e) => setMatrix({ ...matrix, enabled: e.target.checked })}
            />
            Algo matrix enabled
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Stake threshold"
              value={matrix.stakeThreshold}
              onChange={(v) => setMatrix({ ...matrix, stakeThreshold: v })}
            />
            <Field
              label="Win percentage"
              value={matrix.winPercentage}
              onChange={(v) => setMatrix({ ...matrix, winPercentage: v })}
            />
            <Field
              label="Low pattern (comma)"
              value={matrix.lowPattern}
              onChange={(v) => setMatrix({ ...matrix, lowPattern: v })}
            />
            <Field
              label="High pattern key"
              value={matrix.highPatternKey}
              onChange={(v) => setMatrix({ ...matrix, highPatternKey: v })}
            />
            <Field
              label="Default yield %"
              value={defaults.defaultYieldPct}
              onChange={(v) => setDefaults({ ...defaults, defaultYieldPct: v })}
            />
            <Field
              label="Min principal"
              value={defaults.minPrincipal}
              onChange={(v) => setDefaults({ ...defaults, minPrincipal: v })}
            />
            <Field
              label="Reference lock options (admin notes)"
              value={defaults.lockOptions}
              onChange={(v) => setDefaults({ ...defaults, lockOptions: v })}
            />
            <Field
              label="Contract version"
              value={defaults.contractVersion}
              onChange={(v) => setDefaults({ ...defaults, contractVersion: v })}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveMatrix}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save matrix & defaults
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-slate-500">{label}</span>
      <input
        className="w-full rounded-lg border border-white/10 bg-[#070a12] px-2.5 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
