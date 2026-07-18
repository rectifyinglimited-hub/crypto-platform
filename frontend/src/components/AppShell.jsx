/**
 * Responsive shell: hamburger drawer + sticky bottom nav (mobile) +
 * expanded top nav (tablet/desktop) + avatar menu.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Wallet,
  CandlestickChart,
  History,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  UserRound,
  ChevronRight,
  Settings,
} from "lucide-react";
import { isStaffRole } from "../lib/roles.js";

const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "trading", label: "Trading", icon: CandlestickChart },
  { key: "history", label: "History", icon: History },
  { key: "settings", label: "Settings", icon: Settings },
];

function AvatarBadge({ user, size = "md", onClick, className = "" }) {
  const initials =
    user?.initials ||
    (user?.fullName || "U")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  const dim =
    size === "lg"
      ? "h-11 w-11 text-sm"
      : size === "sm"
        ? "h-9 w-9 text-[11px]"
        : "h-10 w-10 text-xs";
  const base =
    "grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 font-bold text-cyan-100 ring-1 ring-white/10";

  if (user?.avatar) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${dim} ${base} ${className}`}
        aria-label="Account menu"
      >
        <img
          src={user.avatar}
          alt=""
          className="h-full w-full object-cover"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dim} ${base} ${className}`}
      aria-label="Account menu"
    >
      {initials || "U"}
    </button>
  );
}

export default function AppShell({
  user,
  tab,
  onTabChange,
  drawerOpen,
  onDrawerOpen,
  onDrawerClose,
  onLogout,
  onOpenAdmin,
  onOpenKyc,
  walletUsdt,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const goSettings = () => {
    onTabChange("settings");
    setMenuOpen(false);
    onDrawerClose?.();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070a12] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070a12]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDrawerOpen}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-left md:pl-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
                Nexus
              </div>
              <div className="text-sm font-semibold tracking-tight">
                Seconds Trading
              </div>
            </div>
          </div>

          {/* Desktop / tablet top nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTabChange(key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition lg:px-3.5 lg:text-sm ${
                    active
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {walletUsdt != null && (
              <button
                type="button"
                onClick={() => onTabChange("wallet")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-1.5 text-left sm:px-2.5"
                title="Trading Wallet"
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-300" />
                <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80 sm:inline">
                  Wallet
                </span>
                <span className="text-xs font-bold tabular-nums text-white">
                  $
                  {Number(walletUsdt || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </button>
            )}
          <div className="relative" ref={menuRef}>
            <AvatarBadge
              user={user}
              onClick={() => setMenuOpen((v) => !v)}
            />
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0c1222] py-1 shadow-2xl"
                >
                  <div className="border-b border-white/5 px-3 py-2.5">
                    <div className="truncate text-sm font-semibold">
                      {user?.fullName || "Trader"}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      @{user?.username}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={goSettings}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4 text-cyan-300" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenKyc?.();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    KYC Verification
                  </button>
                  {isStaffRole(user?.role) && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdmin?.();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5"
                    >
                      <ShieldCheck className="h-4 w-4 text-indigo-300" />
                      Admin Console
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>
      </header>

      {/* Content — full-width grid on tablet/desktop */}
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 lg:px-8 lg:pt-6">
        {children}
      </main>

      {/* Sticky bottom nav — mobile only */}
      <AnimatePresence>
        {!drawerOpen && (
          <motion.nav
            key="bottom-nav"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1020]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1.5 py-1.5">
              {NAV.map(({ key, label, icon: Icon }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onTabChange(key)}
                    className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition active:scale-95 ${
                      active
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${active ? "text-cyan-300" : ""}`}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Side drawer — mobile */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onDrawerClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col border-r border-white/10 bg-[#0c1222] shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
                <div className="flex items-center gap-3">
                  <AvatarBadge user={user} size="lg" onClick={goSettings} />
                  <div>
                    <div className="text-sm font-semibold">
                      {user?.fullName || "Trader"}
                    </div>
                    <div className="text-xs text-slate-400">
                      @{user?.username}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDrawerClose}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto p-3">
                <DrawerItem
                  icon={Settings}
                  label="Settings"
                  hint="Avatar, TRC-20, password, sign out"
                  onClick={goSettings}
                />
                <DrawerItem
                  icon={UserRound}
                  label="Home"
                  hint={user?.email}
                  onClick={() => {
                    onTabChange("home");
                    onDrawerClose();
                  }}
                />
                <DrawerItem
                  icon={ShieldCheck}
                  label="KYC Verification"
                  hint={
                    user?.kyc?.status === "approved"
                      ? "Verified"
                      : user?.kyc?.status || "unverified"
                  }
                  onClick={() => {
                    onOpenKyc?.();
                    onDrawerClose();
                  }}
                />
                {isStaffRole(user?.role) && (
                  <DrawerItem
                    icon={ShieldCheck}
                    label="Admin Console"
                    hint="Control room"
                    onClick={() => {
                      onOpenAdmin?.();
                      onDrawerClose();
                    }}
                  />
                )}
              </div>

              <div className="border-t border-white/5 p-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DrawerItem({ icon: Icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-cyan-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        {hint && (
          <div className="truncate text-xs text-slate-500">{hint}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600" />
    </button>
  );
}
