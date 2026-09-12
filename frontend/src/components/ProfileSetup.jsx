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
import { displayUsdt, spendableUsdt } from "../lib/walletDisplay.js";
import BalanceTrendCard from "./BalanceTrendCard.jsx";
import StrategyBalanceCards from "./StrategyBalanceCards.jsx";
import MarketInsightsNews from "./MarketInsightsNews.jsx";

const PROFILE_MENU = [
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { key: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { key: "assets", label: "Assists", icon: Wallet },
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
    <div className="h-full rounded-2xl border border-white/10 bg-[#0d1424] px-3 py-3 md:px-4 md:py-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums leading-tight text-white md:text-xl">
        ${fmtUsd(value)}
        <span className="ml-1 text-[11px] font-medium text-slate-400">USDT</span>
      </div>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-slate-500">{hint}</p> : null}
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

  const withdrawable = spendableUsdt(user);
  const grand = displayUsdt(user);

  return (
    <div className="mx-auto w-full max-w-[400px] space-y-3 md:max-w-4xl md:space-y-4 lg:max-w-[1280px] lg:space-y-5">
      <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,17.5rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
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

          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 text-2xl font-bold text-cyan-100 ring-2 ring-white/10 md:h-20 md:w-20">
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
                className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full bg-cyan-500 text-slate-950 shadow-lg disabled:opacity-60"
                aria-label="Change profile picture"
              >
                <Camera className="h-3 w-3" />
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
              <div className="text-[22px] font-bold leading-tight tracking-tight text-white md:text-2xl">
                {user?.fullName || "Trader"}
              </div>
              {user?.username ? (
                <div className="mt-0.5 text-[13px] text-slate-500">@{user.username}</div>
              ) : null}
              {uid ? (
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
                  className="mt-1 flex items-center gap-1 font-mono text-[12px] tabular-nums text-slate-400"
                  aria-label="Copy UID"
                >
                  UID {uid}
                  <Copy className="h-3 w-3" />
                </button>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[11px] font-semibold text-cyan-300"
                >
                  Change Profile Picture
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

        <div className="rounded-2xl border border-white/10 bg-[#0c1222] px-2 py-3 md:px-3 md:py-4">
          <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Menu
          </div>
          <div className="grid grid-cols-4 gap-1 md:gap-2 lg:grid-cols-8">
            {PROFILE_MENU.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onOpenMenu?.(m.key)}
                  className="flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-slate-200 active:bg-white/10 md:hover:bg-white/[0.06]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-300 md:h-12 md:w-12">
                    <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                  </span>
                  <span className="text-center text-[10px] font-semibold leading-tight text-slate-300 md:text-[11px]">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[1.15fr_0.85fr] lg:gap-4">
        <BalanceTrendCard user={user} compact />
        <StrategyBalanceCards user={user} />
      </div>

      <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-3 md:gap-3 lg:gap-4">
        <div className="flex min-h-0 flex-col gap-2.5 md:contents">
          <MoneyTile
            label="Available assist"
            value={withdrawable}
            hint="That Assist is Withdrawable"
          />
          <MoneyTile
            label="Grand Total Assist"
            value={grand}
            hint="Full account total in USDT"
          />
        </div>
        <MarketInsightsNews />
      </div>
    </div>
  );
}
