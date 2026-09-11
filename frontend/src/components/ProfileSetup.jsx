/**
 * Profile — identity + live USDT trend. Wallet and password live on Account Setting.
 */
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Copy,
  UserRound,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Lock,
  ShieldCheck,
  CreditCard,
  Gift,
} from "lucide-react";
import { AuthAPI } from "../lib/api.js";
import { publicUid } from "../lib/userUid.js";
import { displayUsdt, heldAiUsdt, heldSmartSpotUsdt, spendableUsdt } from "../lib/walletDisplay.js";
import BalanceTrendCard from "./BalanceTrendCard.jsx";
import StrategyBalanceCards from "./StrategyBalanceCards.jsx";

const PROFILE_MENU = [
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { key: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { key: "assets", label: "Balances", icon: Wallet },
  { key: "security", label: "Security", icon: Lock },
  { key: "verification", label: "Verify", icon: ShieldCheck },
  { key: "addresses", label: "Wallet", icon: Wallet },
  { key: "payment", label: "Card", icon: CreditCard },
  { key: "referral", label: "Invite", icon: Gift },
];

const AVATAR_MAX_BYTES = 900_000;

function fmtUsd(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MoneyTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-white">
        ${fmtUsd(value)}
        <span className="ml-1 text-sm font-medium text-slate-400">USDT</span>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfileSetup({
  user,
  onSaved,
  toast,
  onOpenSettings,
  onOpenMenu,
}) {
  const uid = publicUid(user);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setAvatar(user?.avatar || null);
  }, [user?.avatar]);

  const persistAvatar = async (nextAvatar) => {
    const res = await AuthAPI.updateProfile({
      fullName: (user?.fullName || "Trader").slice(0, 80),
      trc20Address: user?.trc20Address || "",
      trc20AddressConfirm: user?.trc20Address || "",
      avatar: nextAvatar,
    });
    onSaved?.(res.user);
    return res;
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      setSaving(true);
      await persistAvatar(dataUrl);
      toast?.("success", "Profile picture updated.");
    } catch (err) {
      toast?.("error", err?.message || "Could not save profile picture.");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setAvatar(null);
      await persistAvatar(null);
      toast?.("success", "Profile picture removed.");
    } catch (err) {
      toast?.("error", err?.message || "Could not remove photo.");
      setAvatar(user?.avatar || null);
    } finally {
      setSaving(false);
    }
  };

  const initials =
    user?.initials ||
    (user?.fullName || "U")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");

  const holding = heldAiUsdt(user) + heldSmartSpotUsdt(user);
  const withdrawable = spendableUsdt(user);
  const grand = displayUsdt(user);
  const totalGrand = grand;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserRound className="h-4 w-4 text-cyan-300" />
            Profile
          </div>
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Account Setting
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 text-2xl font-bold text-cyan-100 ring-2 ring-white/10">
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
              disabled={saving}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-cyan-500 text-slate-950 shadow-lg disabled:opacity-60"
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
            <div className="text-xl font-bold tracking-tight text-white">
              {user?.fullName || "Trader"}
            </div>
            {user?.username ? (
              <div className="mt-0.5 text-sm text-slate-500">@{user.username}</div>
            ) : null}
            {uid ? (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-cyan-200">
                  UID {uid}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(String(uid));
                      toast?.("success", "UID copied.");
                    } catch {
                      toast?.("error", "Could not copy UID.");
                    }
                  }}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
                  aria-label="Copy UID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] font-semibold text-cyan-300"
              >
                Upload Profile Picture
              </button>
              {avatar ? (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="text-[11px] font-medium text-rose-300"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0c1222] p-3">
        <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PROFILE_MENU.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onOpenMenu?.(m.key)}
                className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-slate-200 active:bg-white/10"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-center text-[10px] font-semibold leading-tight text-slate-300">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <BalanceTrendCard user={user} />
      <StrategyBalanceCards user={user} />
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneyTile
          label="Holding balance"
          value={holding}
          hint="AI Futures + Smart Spot locked"
        />
        <MoneyTile
          label="Withdrawable balance"
          value={withdrawable}
          hint="Available in your Trading Wallet"
        />
        <MoneyTile
          label="Grand balance"
          value={grand}
          hint="Holding + withdrawable"
        />
        <MoneyTile
          label="Total Grand Balance"
          value={totalGrand}
          hint="Full account total in USDT"
        />
      </div>
    </div>
  );
}
