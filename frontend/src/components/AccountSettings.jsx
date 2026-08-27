/**
 * Account Setting — withdrawal wallet (TRC-20 + confirm) and password (with confirm).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Lock,
  Loader2,
  Copy,
  Trash2,
  LogOut,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { AuthAPI } from "../lib/api.js";

const TRC20_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/40";

export default function AccountSettings({
  user,
  onSaved,
  toast,
  onLogout,
  onOpenKyc,
}) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [trc20, setTrc20] = useState(user?.trc20Address || "");
  const [trc20Confirm, setTrc20Confirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingWallet, setRemovingWallet] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFullName(user?.fullName || "");
    setTrc20("");
    setTrc20Confirm("");
  }, [user?.fullName, user?.trc20Address]);

  const persistProfile = async ({
    nextName = fullName.trim(),
    nextTrc20,
  }) => {
    const res = await AuthAPI.updateProfile({
      fullName: nextName,
      trc20Address: nextTrc20,
      trc20AddressConfirm: nextTrc20,
      avatar: user?.avatar || null,
    });
    onSaved?.(res.user);
    return res;
  };

  const handleSaveWallet = async (ev) => {
    ev.preventDefault();
    if (saving) return;
    const e = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = "Enter your full name.";
    }
    const addr = trc20.trim();
    const confirm = trc20Confirm.trim();
    if (addr || confirm) {
      if (!TRC20_REGEX.test(addr)) {
        e.trc20 = "Valid TRC-20 address required (starts with T, 34 chars).";
      }
      if (addr !== confirm) {
        e.trc20Confirm = "Re-enter the same TRC-20 address to confirm.";
      }
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const nextTrc20 = addr || user?.trc20Address || "";
      const res = await persistProfile({ nextTrc20 });
      setTrc20Confirm("");
      toast?.("success", res.message || "Account setting saved.");
    } catch (err) {
      toast?.("error", err?.message || "Could not save account setting.");
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

  const handleRemoveWallet = async () => {
    if (removingWallet) return;
    const ok = window.confirm(
      "Remove your saved TRC-20 wallet address from this account?"
    );
    if (!ok) return;
    setRemovingWallet(true);
    try {
      const res = await persistProfile({
        nextName: (fullName.trim() || user?.fullName || "Trader").slice(0, 80),
        nextTrc20: "",
      });
      setTrc20("");
      setTrc20Confirm("");
      toast?.("success", res.message || "TRC-20 wallet removed.");
    } catch (err) {
      toast?.("error", err?.message || "Could not remove wallet.");
    } finally {
      setRemovingWallet(false);
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Account Setting</div>
            <p className="mt-0.5 text-xs text-slate-500">
              Name, TRC-20 withdrawal wallet, and password. Confirm each change
              before it saves.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWallet} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Your legal full name"
            />
            {errors.fullName ? (
              <p className="mt-1 text-[11px] text-rose-400">{errors.fullName}</p>
            ) : null}
          </div>

          {user?.trc20Address ? (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Saved TRC-20
                </div>
                <button
                  type="button"
                  onClick={handleRemoveWallet}
                  disabled={removingWallet}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-500/30 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {removingWallet ? "Removing…" : "Remove wallet"}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-xs text-cyan-200">
                  {user.trc20Address}
                </code>
                <button
                  type="button"
                  onClick={copyAddr}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
                  aria-label="Copy TRC-20"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <Wallet className="h-3 w-3" /> TRC-20 wallet address
            </label>
            <input
              value={trc20}
              onChange={(e) => setTrc20(e.target.value.trim())}
              className={`${inputCls} font-mono`}
              placeholder="T… paste a new address to change"
              autoComplete="off"
              spellCheck={false}
            />
            {errors.trc20 ? (
              <p className="mt-1 text-[11px] text-rose-400">{errors.trc20}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Re-enter TRC-20 to confirm
            </label>
            <input
              value={trc20Confirm}
              onChange={(e) => setTrc20Confirm(e.target.value.trim())}
              className={`${inputCls} font-mono`}
              placeholder="Type the same address again"
              autoComplete="off"
              spellCheck={false}
            />
            {errors.trc20Confirm ? (
              <p className="mt-1 text-[11px] text-rose-400">
                {errors.trc20Confirm}
              </p>
            ) : null}
            <p className="mt-1.5 text-[11px] text-slate-500">
              Required when you add or change a withdrawal address. Leave both
              blank to keep the saved wallet.
            </p>
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
              "Save account setting"
            )}
          </motion.button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Password</div>
            <p className="mt-0.5 text-xs text-slate-500">
              Enter your current password, then re-enter the new one to confirm.
            </p>
          </div>
        </div>
        <PasswordChangeForm toast={toast} />
      </div>

      {onOpenKyc ? (
        <button
          type="button"
          onClick={onOpenKyc}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 py-3 text-sm font-semibold text-emerald-200"
        >
          <ShieldCheck className="h-4 w-4" /> Identity Verification (ID Card /
          License)
        </button>
      ) : null}

      <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-transparent p-5">
        <div className="text-sm font-semibold text-rose-100">Sign out</div>
        <p className="mt-1 text-xs text-slate-400">
          End this session and return to the public landing page.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function PasswordChangeForm({ toast }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (newPassword.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      toast?.("error", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setLocalError("Re-enter the same new password to confirm.");
      toast?.("error", "Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await AuthAPI.changePassword({ currentPassword, newPassword });
      toast?.("success", "Password changed.");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      toast?.("error", err?.message || "Could not change password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Current password
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          className={inputCls}
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          New password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          placeholder="New password (8+)"
          className={inputCls}
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Re-enter password to confirm
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type the new password again"
          className={inputCls}
          required
          autoComplete="new-password"
        />
      </div>
      {localError ? (
        <p className="text-[11px] text-rose-400">{localError}</p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Updating…
          </>
        ) : (
          "Update password"
        )}
      </button>
    </form>
  );
}
