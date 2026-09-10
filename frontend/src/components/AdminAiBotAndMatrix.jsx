/**
 * Admin: AI Bot Management + Algorithmic Trade Matrix.
 * Assign per-user lock days + yield from admin side.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { AiBotAPI, CopyBotAPI } from "../lib/api.js";
import { onSocketEvent } from "../lib/socket.js";
import {
  AI_FUTURES_LOCK_OPTIONS,
  DEFAULT_COMMISSION_TIERS,
  dailyYieldForLockDays,
  matchCommissionTier,
  newCommissionTierId,
  normalizeCommissionTiers,
  resolveAiFuturesDailyYield,
} from "../lib/aiBotYield.js";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const DEFAULT_SPOT_SLOTS = [0, 1, 2, 3].map((slot) => ({
  slot,
  accuracy: String([94, 88, 70, 62][slot] || 70),
  readyAt: "",
}));

export default function AdminAiBotAndMatrix({ toast }) {
  const say = toast || (() => {});
  const [tab, setTab] = useState("commission");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [tiers, setTiers] = useState(() =>
    DEFAULT_COMMISSION_TIERS.map((t) => ({ ...t }))
  );
  const [previewBal, setPreviewBal] = useState("400");
  const [previewDays, setPreviewDays] = useState("40");
  const [spotSlots, setSpotSlots] = useState(() =>
    DEFAULT_SPOT_SLOTS.map((s) => ({ ...s }))
  );
  const [spotSaving, setSpotSaving] = useState(false);
  const [yieldEdits, setYieldEdits] = useState({});
  const [dayEdits, setDayEdits] = useState({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reviewDays, setReviewDays] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [lockInboxReady, setLockInboxReady] = useState(true);

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const settled = await Promise.allSettled([
        AiBotAPI.adminActiveUsers(),
        AiBotAPI.adminContracts("active"),
        AiBotAPI.adminRequests("pending"),
      ]);
      const usersRes = settled[0].status === "fulfilled" ? settled[0].value : null;
      const contractsRes = settled[1].status === "fulfilled" ? settled[1].value : null;
      const reqRes = settled[2].status === "fulfilled" ? settled[2].value : null;
      setUsers(usersRes?.users || []);
      setContracts(contractsRes?.contracts || []);
      setRequests(reqRes?.requests || []);
      setLockInboxReady(reqRes?.unsupported !== true);
      const failed = settled.find((s) => s.status === "rejected");
      if (failed && failed.reason?.error !== "NotFound") {
        const msg = String(failed.reason?.message || "");
        if (!/^Route (GET|POST) /i.test(msg)) {
          say("error", failed.reason?.message || "Some AI Futures data failed to load.");
        }
      }
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
        defaultYieldPct: res.aiBotDefaults?.defaultYieldPct ?? 0.5,
        minPrincipal: res.aiBotDefaults?.minPrincipal ?? 50,
        lockOptions: (res.aiBotDefaults?.lockOptions || AI_FUTURES_LOCK_OPTIONS).join(","),
        contractVersion: res.aiBotDefaults?.contractVersion || "v1.0",
      });
      setTiers(
        normalizeCommissionTiers(res.aiBotDefaults?.commissionTiers)
      );
    } catch (err) {
      say("error", err?.message || "Failed to load matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpot = useCallback(async () => {
    setLoading(true);
    try {
      const res = await CopyBotAPI.adminSlotDefaults();
      const rows = Array.isArray(res?.slots) ? res.slots : [];
      setSpotSlots(
        DEFAULT_SPOT_SLOTS.map((base) => {
          const found = rows.find((s) => Number(s.slot) === base.slot);
          return {
            slot: base.slot,
            accuracy:
              found?.accuracy != null
                ? String(Math.round(Number(found.accuracy)))
                : base.accuracy,
            readyAt: toLocalInput(found?.readyAt),
          };
        })
      );
    } catch (err) {
      say("error", err?.message || "Failed to load Smart Spot blocks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "bots") {
      loadBots();
      loadSearch("");
    }
    if (tab === "matrix" || tab === "commission") loadMatrix();
    if (tab === "spot") loadSpot();
  }, [tab, loadBots, loadMatrix, loadSearch, loadSpot]);

  useEffect(() => {
    if (tab !== "bots") return undefined;
    const off = onSocketEvent("aibot:lock", () => {
      loadBots();
    });
    return off;
  }, [tab, loadBots]);

  const saveUserBot = async (u) => {
    const userId = u._id;
    const daysRaw = dayEdits[userId] ?? u.aiBotAssignedLockDays ?? "";
    const pctRaw = yieldEdits[userId] ?? u.aiBotCustomPercentage ?? "";
    const payload = {};
    if (pctRaw !== "" && pctRaw != null) {
      payload.aiBotCustomPercentage = Number(pctRaw);
    }
    if (daysRaw !== "" && daysRaw != null) {
      payload.aiBotAssignedLockDays = Number(daysRaw);
    }
    if (!Object.keys(payload).length) {
      say("error", "Enter lock days and/or daily commission %.");
      return;
    }
    setSavingId(userId);
    try {
      const res = await AiBotAPI.adminSetUserBot(userId, payload);
      say("success", res.message);
      setYieldEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setDayEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      loadBots();
      loadSearch(query);
    } catch (err) {
      say("error", err?.message || "Failed to update user AI Bot.");
    } finally {
      setSavingId(null);
    }
  };

  const reviewRequest = async (reqRow, action) => {
    const days = Number(
      reviewDays[reqRow.id] ?? reqRow.requestedDays ?? 0
    );
    if (action === "approve" && (!Number.isFinite(days) || days < 1)) {
      say("error", "Set lock days before approving.");
      return;
    }
    setReviewingId(reqRow.id);
    try {
      const res = await AiBotAPI.adminReviewRequest(reqRow.id, {
        action,
        lockDays: days,
      });
      say("success", res.message || `Request ${action}d.`);
      loadBots();
      loadSearch(query);
    } catch (err) {
      say("error", err?.message || "Review failed.");
    } finally {
      setReviewingId(null);
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
          useStakeTiers: true,
          stakeThreshold: Number(matrix.stakeThreshold ?? 150),
          winPercentage: Number(matrix.winPercentage ?? 25),
          lowPattern: lowPattern.length
            ? lowPattern
            : ["win", "loss", "loss", "win"],
          highPatternKey: matrix.highPatternKey || "A",
        },
        aiBotDefaults: {
          defaultYieldPct: Number(defaults.defaultYieldPct),
          minPrincipal: Number(defaults.minPrincipal),
          lockOptions: lockOptions.length ? lockOptions : AI_FUTURES_LOCK_OPTIONS,
          contractVersion: defaults.contractVersion,
          commissionTiers: normalizeCommissionTiers(tiers, { fallback: false }),
        },
      });
      say("success", res.message || "Saved.");
    } catch (err) {
      say("error", err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveCommission = async () => {
    setSaving(true);
    try {
      const cleaned = normalizeCommissionTiers(tiers, { fallback: false });
      if (!cleaned.length) {
        say("error", "Add at least one row (min balance, days, AI %, Smart Spot %).");
        return;
      }
      const res = await AiBotAPI.adminSaveMatrix({
        aiBotDefaults: {
          defaultYieldPct: Number(defaults?.defaultYieldPct ?? 1.25),
          minPrincipal: Number(defaults?.minPrincipal ?? 300),
          lockOptions: [...new Set(cleaned.map((t) => t.days))],
          contractVersion: defaults?.contractVersion || "v1.0",
          commissionTiers: cleaned,
        },
      });
      setTiers(normalizeCommissionTiers(res.aiBotDefaults?.commissionTiers || cleaned));
      if (res.aiBotDefaults) {
        setDefaults((prev) => ({
          ...(prev || {}),
          defaultYieldPct: res.aiBotDefaults.defaultYieldPct ?? prev?.defaultYieldPct,
          minPrincipal: res.aiBotDefaults.minPrincipal ?? prev?.minPrincipal,
          lockOptions: (res.aiBotDefaults.lockOptions || []).join(","),
          contractVersion:
            res.aiBotDefaults.contractVersion || prev?.contractVersion || "v1.0",
        }));
      }
      say("success", res.message || "Commission saved. All users now see these rates.");
    } catch (err) {
      say("error", err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const patchTier = (id, key, value) => {
    setTiers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        id: newCommissionTierId(),
        minBalance: 0,
        days: 40,
        aiDailyPct: 1.25,
        spotDailyPct: 1.25,
      },
    ]);
  };

  const removeTier = (id) => {
    setTiers((prev) => prev.filter((row) => row.id !== id));
  };

  const patchSpot = (slot, key, value) => {
    setSpotSlots((prev) =>
      prev.map((row) => (row.slot === slot ? { ...row, [key]: value } : row))
    );
  };

  const saveSpot = async () => {
    setSpotSaving(true);
    try {
      const res = await CopyBotAPI.adminSaveSlotDefaults({
        slots: spotSlots.map((s) => ({
          slot: s.slot,
          accuracy: Math.min(100, Math.max(0, Math.round(Number(s.accuracy) || 0))),
          readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
        })),
      });
      say("success", res.message || "Smart Spot blocks saved for all users.");
    } catch (err) {
      say("error", err?.message || "Save failed.");
    } finally {
      setSpotSaving(false);
    }
  };

  const preview = matchCommissionTier({
    principal: Number(previewBal) || 0,
    days: Number(previewDays) || 0,
    tiers,
  });

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
          onChange={(e) => {
            const v = e.target.value;
            setDayEdits((prev) => ({ ...prev, [u._id]: v }));
            const mapped = dailyYieldForLockDays(v, null, {
              principal: Number(u.aiBotPrincipal || 0),
              tiers,
            });
            if (mapped != null) {
              setYieldEdits((prev) => ({ ...prev, [u._id]: String(mapped) }));
            }
          }}
        />
        <span className="text-[11px] text-slate-500">days</span>
        <input
          type="number"
          min={0}
          max={500}
          step="any"
          readOnly
          className="w-20 cursor-default rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
          placeholder="Daily %"
          value={
            yieldEdits[u._id] ??
            resolveAiFuturesDailyYield(
              dayEdits[u._id] ?? u.aiBotAssignedLockDays ?? u.aiBotLockDays,
              u.aiBotCustomPercentage,
              { principal: Number(u.aiBotPrincipal || 0), tiers }
            ) ??
            ""
          }
        />
        <span className="text-[11px] text-slate-500">daily % auto</span>
        <button
          type="button"
          disabled={savingId === u._id}
          onClick={() => saveUserBot(u)}
          className="rounded-lg bg-cyan-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 disabled:opacity-50"
        >
          {savingId === u._id ? "Saving…" : "Save"}
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
          ["commission", "Commission"],
          ["spot", "Smart Spot"],
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
          onClick={() =>
            tab === "bots" ? loadBots() : tab === "spot" ? loadSpot() : loadMatrix()
          }
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

      {!loading && tab === "commission" && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0c1222] p-4">
          <p className="text-xs text-slate-400">
            Set commission by min balance and lock days. AI Futures and Smart
            Spot can have different daily %. One-click Save applies to every user
            — they see the row that matches their lock amount and days.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2 pr-2 font-semibold">Min balance $</th>
                  <th className="pb-2 pr-2 font-semibold">Days</th>
                  <th className="pb-2 pr-2 font-semibold">AI Futures % / day</th>
                  <th className="pb-2 pr-2 font-semibold">Smart Spot % / day</th>
                  <th className="pb-2 font-semibold"> </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                        value={row.minBalance}
                        onChange={(e) =>
                          patchTier(row.id, "minBalance", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                        value={row.days}
                        onChange={(e) =>
                          patchTier(row.id, "days", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step="any"
                        className="w-24 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                        value={row.aiDailyPct}
                        onChange={(e) =>
                          patchTier(row.id, "aiDailyPct", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step="any"
                        className="w-24 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm"
                        value={row.spotDailyPct}
                        onChange={(e) =>
                          patchTier(row.id, "spotDailyPct", e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeTier(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 px-2 py-1.5 text-[11px] font-semibold text-rose-200"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveCommission}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save — apply to all users
            </button>
          </div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/80">
              Preview match
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-400">
                Balance $
                <input
                  className="ml-2 w-24 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm text-white"
                  value={previewBal}
                  onChange={(e) => setPreviewBal(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-400">
                Days
                <input
                  className="ml-2 w-20 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-sm text-white"
                  value={previewDays}
                  onChange={(e) => setPreviewDays(e.target.value)}
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-slate-200">
              {preview
                ? `User with $${Number(previewBal || 0).toFixed(0)} / ${Number(previewDays || 0)} days → AI ${preview.aiDailyPct}% · Smart Spot ${preview.spotDailyPct}% (min $${preview.minBalance} / ${preview.days}d row).`
                : "No matching row yet."}
            </p>
          </div>
        </div>
      )}

      {!loading && tab === "spot" && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0c1222] p-4">
          <p className="text-xs text-slate-400">
            Set each block’s accuracy % and Opens at time. One-click Save applies
            to every user on Smart Spot Trade.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {spotSlots.map((s) => (
              <div
                key={s.slot}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="text-xs font-semibold text-white">
                  Block {s.slot + 1}
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    Accuracy
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        patchSpot(
                          s.slot,
                          "accuracy",
                          String(Math.max(0, Number(s.accuracy || 0) - 1))
                        )
                      }
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={s.accuracy}
                      onChange={(e) =>
                        patchSpot(s.slot, "accuracy", e.target.value)
                      }
                      className="w-16 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1 text-center font-mono text-sm text-white outline-none focus:border-cyan-500/30"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchSpot(
                          s.slot,
                          "accuracy",
                          String(Math.min(100, Number(s.accuracy || 0) + 1))
                        )
                      }
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
                    >
                      +
                    </button>
                    <span className="text-[11px] text-slate-500">%</span>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                    Opens at
                  </span>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="datetime-local"
                      value={s.readyAt}
                      onChange={(e) =>
                        patchSpot(s.slot, "readyAt", e.target.value)
                      }
                      className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-cyan-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => patchSpot(s.slot, "readyAt", "")}
                      className="rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-slate-300"
                    >
                      Now
                    </button>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={spotSaving}
            onClick={saveSpot}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {spotSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save — apply to all users
          </button>
        </div>
      )}

      {!loading && tab === "bots" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Users request lock days from their wallet. Approve, reject, or change
            the days. On an active contract, saving days updates the end date
            immediately — you can increase or decrease.
          </p>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
              Pending lock requests ({requests.length})
            </div>
            {!lockInboxReady ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-slate-400">
                Assign or change days with Save below. User lock requests appear here after the API refresh.
              </div>
            ) : null}
            {requests.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-500/5 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    {row.user?.fullName || row.user?.username || "User"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Asked {row.requestedDays} days · $
                    {Number(row.principal || 0).toFixed(2)} held
                    {row.user?.email ? ` · ${row.user.email}` : ""}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                  value={reviewDays[row.id] ?? row.requestedDays ?? ""}
                  onChange={(e) =>
                    setReviewDays((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                />
                <span className="text-[11px] text-slate-500">days</span>
                <button
                  type="button"
                  disabled={reviewingId === row.id}
                  onClick={() => reviewRequest(row, "approve")}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-emerald-950 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={reviewingId === row.id}
                  onClick={() => reviewRequest(row, "reject")}
                  className="rounded-lg border border-rose-400/30 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ))}
            {!lockInboxReady ? null : !requests.length ? (
              <div className="rounded-xl border border-white/5 px-3 py-3 text-center text-xs text-slate-500">
                No pending lock requests.
              </div>
            ) : null}
          </div>

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
            Stake-tier sequences are fixed on the server (≤$10 / ≤$50 / ≤$150 / $500+).
            Max/all-in stake always settles LOSS. Admin Force WIN/LOSS still overrides.
            Toggle below enables/disables the auto matrix.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={matrix.enabled}
              onChange={(e) => setMatrix({ ...matrix, enabled: e.target.checked })}
            />
            Algo matrix enabled
          </label>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
            <div>≤$10: W L L W → 2L+W / 2W+L / 3L+W (repeats)</div>
            <div>≤$50: L W → 2L+W → 2L+W → 3L+2W (repeats)</div>
            <div>≤$150: 2L+3W → 1L+1W → 3L+1W (repeats)</div>
            <div>&gt;$150 / $500+: 3L+1W → 2L+1W → 1L+1W (repeats)</div>
            <div className="mt-1 text-amber-200/80">Max wallet stake → LOSS</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Fallback win % (only if tiers off)"
              value={matrix.winPercentage}
              onChange={(v) => setMatrix({ ...matrix, winPercentage: v })}
            />
            <Field
              label="Default daily commission %"
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
