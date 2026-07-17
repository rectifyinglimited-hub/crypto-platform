/**
 * Profile completion: Full Name + TRC-20 (enter twice to confirm).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserRound, Wallet, Loader2, CheckCircle2, Copy } from "lucide-react";
import { AuthAPI } from "../lib/api.js";

const TRC20_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export default function ProfileSetup({ user, onSaved, toast }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [trc20, setTrc20] = useState(user?.trc20Address || "");
  const [trc20Confirm, setTrc20Confirm] = useState(user?.trc20Address || "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFullName(user?.fullName || "");
    setTrc20(user?.trc20Address || "");
    setTrc20Confirm(user?.trc20Address || "");
  }, [user?.fullName, user?.trc20Address]);

  const validate = () => {
    const e = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = "Enter your full name.";
    }
    if (!TRC20_REGEX.test(trc20.trim())) {
      e.trc20 = "Valid TRC-20 address required (starts with T, 34 chars).";
    }
    if (trc20.trim() !== trc20Confirm.trim()) {
      e.trc20Confirm = "Addresses must match exactly.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const res = await AuthAPI.updateProfile({
        fullName: fullName.trim(),
        trc20Address: trc20.trim(),
        trc20AddressConfirm: trc20Confirm.trim(),
      });
      toast?.("success", res.message || "Profile saved.");
      onSaved?.(res.user);
    } catch (err) {
      toast?.("error", err?.message || "Could not save profile.");
      if (err?.details?.length) {
        const mapped = {};
        err.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...mapped }));
      }
    } finally {
      setSaving(false);
    }
  };

  const copyAddr = async () => {
    if (!user?.trc20Address) return;
    try {
      await navigator.clipboard.writeText(user.trc20Address);
      toast?.("success", "TRC-20 address copied.");
    } catch {
      /* ignore */
    }
  };

  const complete = Boolean(user?.trc20Address && user?.fullName);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserRound className="h-4 w-4 text-cyan-300" />
            Profile setup
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Full name and TRC-20 wallet for withdrawals. Enter the address twice
            to confirm.
          </p>
        </div>
        {complete && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      {user?.trc20Address && (
        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Saved TRC-20
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs text-cyan-200">
              {user.trc20Address}
            </code>
            <button
              type="button"
              onClick={copyAddr}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Full name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40"
            placeholder="Your legal full name"
          />
          {errors.fullName && (
            <p className="mt-1 text-[11px] text-rose-400">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <Wallet className="h-3 w-3" /> Enter TRC-20 address
          </label>
          <input
            value={trc20}
            onChange={(e) => setTrc20(e.target.value.trim())}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-500/40"
            placeholder="T…"
            autoComplete="off"
            spellCheck={false}
          />
          {errors.trc20 && (
            <p className="mt-1 text-[11px] text-rose-400">{errors.trc20}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Confirm TRC-20 address
          </label>
          <input
            value={trc20Confirm}
            onChange={(e) => setTrc20Confirm(e.target.value.trim())}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-500/40"
            placeholder="Re-enter the same address"
            autoComplete="off"
            spellCheck={false}
          />
          {errors.trc20Confirm && (
            <p className="mt-1 text-[11px] text-rose-400">
              {errors.trc20Confirm}
            </p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save profile"
          )}
        </motion.button>
      </form>
    </div>
  );
}
