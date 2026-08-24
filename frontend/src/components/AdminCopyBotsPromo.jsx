/**
 * Admin — Copy bot catalog (Spot / Future display) + Promo codes.
 */
import { useCallback, useEffect, useState } from "react";
import { Bot, Ticket, Loader2, Plus, Trash2 } from "lucide-react";
import { CopyBotAPI, PromoAPI } from "../lib/api.js";

const emptyBot = {
  name: "",
  tradeType: "spot_copy",
  assetType: "Crude Oil (WTI)",
  predictionConfidence: 78,
  accuracyHistorical: "70%",
  totalFollowers: 1200,
  topSignalDirection: "Bullish",
  summary: "",
  lockDays: 30,
  yieldPct: 8,
  minPrincipal: 50,
  isTesting: false,
  enabled: true,
};

export default function AdminCopyBotsPromo({ toast }) {
  const [bots, setBots] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyBot);
  const [promo, setPromo] = useState({
    code: "",
    type: "flat_bonus",
    value: "50",
    minDeposit: "100",
    maxUses: "100",
    expiryDate: "",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([
        CopyBotAPI.adminList(),
        PromoAPI.adminList(),
      ]);
      setBots(b.bots || []);
      setCodes(p.codes || []);
    } catch (err) {
      toast?.("error", err?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveBot = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await CopyBotAPI.adminCreate({
        ...form,
        predictionConfidence: Number(form.predictionConfidence),
        totalFollowers: Number(form.totalFollowers),
        lockDays: Number(form.lockDays),
        yieldPct: Number(form.yieldPct),
        minPrincipal: Number(form.minPrincipal),
      });
      toast?.("success", "Bot created.");
      setForm(emptyBot);
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const removeBot = async (id) => {
    if (!window.confirm("Delete this bot?")) return;
    try {
      await CopyBotAPI.adminDelete(id);
      toast?.("success", "Deleted.");
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Delete failed");
    }
  };

  const genPromo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await PromoAPI.adminGenerate({
        code: promo.code,
        type: promo.type,
        value: Number(promo.value),
        minDeposit: Number(promo.minDeposit || 0),
        maxUses: Number(promo.maxUses || 100),
        expiryDate: promo.expiryDate || null,
      });
      toast?.("success", "Promo created.");
      setPromo({
        code: "",
        type: "flat_bonus",
        value: "50",
        minDeposit: "100",
        maxUses: "100",
        expiryDate: "",
      });
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Promo failed");
    } finally {
      setBusy(false);
    }
  };

  const removePromo = async (id) => {
    if (!window.confirm("Delete this promo code?")) return;
    try {
      await PromoAPI.adminDelete(id);
      toast?.("success", "Promo deleted.");
      await load();
    } catch (err) {
      toast?.("error", err?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const input =
    "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
          <Bot className="h-4 w-4 text-cyan-400" />
          Spot / Future Copy Bots
        </div>
        <form onSubmit={saveBot} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["name", "Name"],
            ["assetType", "Asset (e.g. Crude Oil (WTI))"],
            ["accuracyHistorical", "Accuracy (e.g. 70%)"],
            ["predictionConfidence", "Confidence 0–100"],
            ["totalFollowers", "Followers"],
            ["lockDays", "Lock days"],
            ["yieldPct", "Yield %"],
            ["minPrincipal", "Min principal"],
          ].map(([key, label]) => (
            <label key={key} className="block text-[10px] font-semibold uppercase text-slate-500">
              {label}
              <input
                className={input}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key === "name" || key === "assetType"}
              />
            </label>
          ))}
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Trade type
            <select
              className={input}
              value={form.tradeType}
              onChange={(e) => setForm((f) => ({ ...f, tradeType: e.target.value }))}
            >
              <option value="spot_copy">Spot Copy</option>
              <option value="future_ai">Future AI</option>
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Signal
            <select
              className={input}
              value={form.topSignalDirection}
              onChange={(e) =>
                setForm((f) => ({ ...f, topSignalDirection: e.target.value }))
              }
            >
              <option>Bullish</option>
              <option>Bearish</option>
              <option>Neutral</option>
            </select>
          </label>
          <label className="sm:col-span-2 lg:col-span-3 block text-[10px] font-semibold uppercase text-slate-500">
            Summary
            <textarea
              className={`${input} min-h-[70px]`}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.isTesting}
              onChange={(e) => setForm((f) => ({ ...f, isTesting: e.target.checked }))}
            />
            Testing mode
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold uppercase text-cyan-950 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Create bot
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2">
          {bots.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="text-sm">
                <span className="font-semibold text-white">{b.name}</span>
                <span className="ml-2 text-[10px] uppercase text-cyan-400">
                  {b.tradeType}
                </span>
                <div className="text-xs text-slate-400">
                  {b.assetType} · {b.topSignalDirection} {b.predictionConfidence}% ·{" "}
                  {b.accuracyHistorical} · {b.totalFollowers} followers
                  {b.isTesting ? " · TESTING" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeBot(b.id)}
                className="rounded-lg border border-rose-400/30 p-2 text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
          <Ticket className="h-4 w-4 text-amber-300" />
          Promo codes
        </div>
        <form onSubmit={genPromo} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Code
            <input
              className={input}
              value={promo.code}
              onChange={(e) => setPromo((p) => ({ ...p, code: e.target.value }))}
              required
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Type
            <select
              className={input}
              value={promo.type}
              onChange={(e) => setPromo((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="flat_bonus">Flat bonus ($)</option>
              <option value="percentage_bonus">Percentage (%)</option>
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Value
            <input
              className={input}
              value={promo.value}
              onChange={(e) => setPromo((p) => ({ ...p, value: e.target.value }))}
              required
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Min deposit
            <input
              className={input}
              value={promo.minDeposit}
              onChange={(e) => setPromo((p) => ({ ...p, minDeposit: e.target.value }))}
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Max uses
            <input
              className={input}
              value={promo.maxUses}
              onChange={(e) => setPromo((p) => ({ ...p, maxUses: e.target.value }))}
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase text-slate-500">
            Expiry
            <input
              type="date"
              className={input}
              value={promo.expiryDate}
              onChange={(e) => setPromo((p) => ({ ...p, expiryDate: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold uppercase text-amber-950 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Generate promo
            </button>
          </div>
        </form>
        <div className="mt-5 space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
            >
              <div className="text-sm">
                <span className="font-mono font-bold text-amber-200">{c.code}</span>
                <div className="text-xs text-slate-400">
                  {c.type === "percentage_bonus" ? `${c.value}%` : `$${c.value}`} ·
                  min ${c.minDeposit} · used {c.usedCount}/{c.maxUses}
                  {!c.active ? " · OFF" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removePromo(c.id)}
                className="rounded-lg border border-rose-400/30 p-2 text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
