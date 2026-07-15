/**
 * Mobile-first shell: hamburger drawer + sticky bottom nav.
 * Bottom nav hides while the drawer is open.
 */

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
} from "lucide-react";

const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "trading", label: "Trade", icon: CandlestickChart },
  { key: "history", label: "History", icon: History },
];

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
  children,
}) {
  const initials =
    user?.initials ||
    (user?.fullName || "U")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");

  return (
    <div className="relative min-h-screen w-full bg-[#070a12] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070a12]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <button
            type="button"
            onClick={onDrawerOpen}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
              Nexus
            </div>
            <div className="text-sm font-semibold tracking-tight">
              Seconds Trading
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-500/30 to-emerald-500/20 text-xs font-bold text-cyan-100 ring-1 ring-white/10">
            {initials}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">{children}</main>

      {/* Sticky bottom nav — hidden when drawer open */}
      <AnimatePresence>
        {!drawerOpen && (
          <motion.nav
            key="bottom-nav"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1020]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
          >
            <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
              {NAV.map(({ key, label, icon: Icon }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onTabChange(key)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
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

      {/* Side drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={onDrawerClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col border-r border-white/10 bg-[#0c1222] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
                    {initials}
                  </div>
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
                  icon={UserRound}
                  label="Profile"
                  hint={user?.email}
                  onClick={() => {
                    onTabChange("home");
                    onDrawerClose();
                  }}
                />
                <DrawerItem
                  icon={ShieldCheck}
                  label="KYC Verification"
                  hint={user?.kyc?.status || "unverified"}
                  onClick={() => {
                    onOpenKyc?.();
                    onDrawerClose();
                  }}
                />
                {user?.role === "admin" && (
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
