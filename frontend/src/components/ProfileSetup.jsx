/**
 * Profile / Account Settings: avatar, full name, TRC-20 (add/edit/remove),
 * password change, and Sign Out.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UserRound,
  Wallet,
  Loader2,
  CheckCircle2,
  Copy,
  Camera,
  Trash2,
  LogOut,
} from "lucide-react";
import { AuthAPI } from "../lib/api.js";

const TRC20_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const AVATAR_MAX_BYTES = 900_000;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileSetup({ user, onSaved, toast, onLogout }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [trc20, setTrc20] = useState(user?.trc20Address || "");
  const [trc20Confirm, setTrc20Confirm] = useState(user?.trc20Address || "");
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [removingWallet, setRemovingWallet] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setTrc20(user?.trc20Address || "");
    setTrc20Confirm(user?.trc20Address || "");
    setAvatar(user?.avatar || null);
  }, [user?.fullName, user?.trc20Address, user?.avatar]);

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast?.("error", "Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast?.("error", "Image too large — keep under ~900KB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatar(dataUrl);
      // Persist immediately so navbar + user card update without a second click
      setSaving(true);
      try {
        await persistProfile({
          nextName: (fullName.trim() || user?.fullName || "Trader").slice(0, 80),
          nextTrc20: (user?.trc20Address || trc20 || "").trim() || "",
          nextAvatar: dataUrl,
        });
        toast?.("success", "Profile picture updated.");
      } catch (err) {
        toast?.("error", err?.message || "Could not save profile picture.");
      } finally {
        setSaving(false);
      }
    } catch {
      toast?.("error", "Could not read image.");
    }
  };

  const validate = () => {
    const e = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = "Enter your full name.";
    }
    const addr = trc20.trim();
    const confirm = trc20Confirm.trim();
    // Empty = clear / leave unset — allowed
    if (addr || confirm) {
      if (!TRC20_REGEX.test(addr)) {
        e.trc20 = "Valid TRC-20 address required (starts with T, 34 chars).";
      }
      if (addr !== confirm) {
        e.trc20Confirm = "Addresses must match exactly.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persistProfile = async ({
    nextName = fullName.trim(),
    nextTrc20,
    nextAvatar = avatar,
  }) => {
    const res = await AuthAPI.updateProfile({
      fullName: nextName,
      trc20Address: nextTrc20,
      trc20AddressConfirm: nextTrc20,
      avatar: nextAvatar || null,
    });
    onSaved?.(res.user);
    return res;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const addr = trc20.trim();
      const res = await persistProfile({
        nextTrc20: addr || "",
      });
      toast?.("success", res.message || "Profile saved.");
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

  const complete = Boolean(user?.trc20Address && user?.fullName);
  const initials =
    user?.initials ||
    (user?.fullName || "U")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <UserRound className="h-4 w-4 text-cyan-300" />
              Settings
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Avatar, full name, TRC-20 wallet, and security controls.
            </p>
          </div>
          {complete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="mb-5 flex items-center gap-4">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 text-lg font-bold text-cyan-100 ring-2 ring-white/10">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || "U"
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-cyan-500 text-slate-950 shadow-lg"
              aria-label="Upload profile picture"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">
              Profile picture
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Shown in the navbar and your workspace. JPG/PNG under 900KB.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] font-semibold text-cyan-300"
              >
                Upload Profile Picture
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="text-[11px] font-medium text-rose-300"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        {user?.trc20Address && (
          <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
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
              <Wallet className="h-3 w-3" /> TRC-20 wallet address
            </label>
            <input
              value={trc20}
              onChange={(e) => setTrc20(e.target.value.trim())}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-500/40"
              placeholder="T… (optional — leave blank to clear)"
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
              placeholder="Re-enter the same address (or leave blank)"
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

      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <PasswordChangeForm toast={toast} />
      </div>

      <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-transparent p-5">
        <div className="text-sm font-semibold text-rose-100">Sign out</div>
        <p className="mt-1 text-xs text-slate-400">
          Securely end this session, clear your auth token, and return to the
          public Landing Page.
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

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast?.("error", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      toast?.("error", "New passwords do not match.");
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
      <div className="text-sm font-semibold text-white">Change password</div>
      <p className="text-[11px] text-slate-500">
        Or ask Live Chat support — admin can also reset your password from User
        Management.
      </p>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Current password"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
        required
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNew(e.target.value)}
        placeholder="New password (8+)"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
        required
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
        required
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
