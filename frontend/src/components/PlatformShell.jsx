/**
 * CXM-style authenticated top nav shell — Trade / NFT mode toggle,
 * dropdown Trade menu, wallet chip, notifications, account + logout.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  LineChart,
  CandlestickChart,
  Users,
  Leaf,
  Cpu,
  Bot,
  Rocket,
  Copy,
  Landmark,
  Wallet,
  Image as ImageIcon,
  Images,
  ChevronDown,
  LogOut,
  ShieldCheck,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import NotificationBell from "./NotificationBell.jsx";

const TRADE_LINKS = [
  { key: "home", label: "Home", icon: Home },
  { key: "market", label: "Market", icon: LineChart },
  {
    key: "trade",
    label: "Trade",
    icon: CandlestickChart,
    children: [
      { key: "spot", label: "Spot" },
      { key: "perpetual", label: "Perpetual" },
      { key: "delivery", label: "Delivery" },
    ],
  },
  { key: "c2c", label: "C2C", icon: Users },
  { key: "carbon", label: "Carbon Rights ETF", icon: Leaf },
  { key: "ai", label: "AI Compute", icon: Cpu },
  { key: "aibot", label: "AI Bot Trading", icon: Bot },
  { key: "ico", label: "ICO Subscription", icon: Rocket },
  { key: "copy", label: "Copy Trade", icon: Copy },
  { key: "loan", label: "Loan", icon: Landmark },
  { key: "assets", label: "Assets", icon: Wallet },
];

const NFT_LINKS = [
  { key: "home", label: "Home", icon: Home },
  { key: "nft", label: "NFT Market", icon: ImageIcon },
  { key: "nft_mine", label: "My collection", icon: Images },
  { key: "assets", label: "Assets", icon: Wallet },
];

function TradeDropdown({ item, active, page, onPageChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const Icon = item.icon;

  return (
    <div className="relative shrink-0" ref={ref}>
      <div
        className={`inline-flex items-stretch overflow-hidden rounded-xl ${
          active
            ? "bg-cyan-500/15 text-cyan-300"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            // Main Trade click → open Delivery desk (chart + buy/sell)
            onPageChange("delivery");
            setOpen(false);
          }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-semibold transition lg:px-3.5 lg:text-sm"
        >
          <Icon className="h-4 w-4" />
          {item.label}
        </button>
        <button
          type="button"
          aria-label="Trade menu"
          onClick={() => setOpen((v) => !v)}
          className="border-l border-white/10 px-2 py-2 transition hover:bg-white/5"
        >
          <ChevronDown
            className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0c1222] py-1 shadow-2xl shadow-black/50"
          >
            <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Trade desk
            </div>
            {item.children.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  onPageChange(c.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition ${
                  page === c.key
                    ? "bg-cyan-500/10 text-cyan-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{c.label}</span>
                {c.key === "delivery" && (
                  <span className="text-[10px] text-cyan-400/80">Chart</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLinks({ mode, page, onPageChange }) {
  const links = mode === "nft" ? NFT_LINKS : TRADE_LINKS;

  return (
    <nav className="scrollbar-none flex items-center gap-1 overflow-x-auto">
      {links.map((item) => {
        if (item.children) {
          const active = item.children.some((c) => c.key === page);
          return (
            <TradeDropdown
              key={item.key}
              item={item}
              active={active}
              page={page}
              onPageChange={onPageChange}
            />
          );
        }
        const Icon = item.icon;
        const active = page === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onPageChange(item.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition lg:px-3.5 lg:text-sm ${
              active
                ? "bg-cyan-500/15 text-cyan-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function ModeToggle({ mode, onModeChange }) {
  return (
    <div className="relative grid shrink-0 grid-cols-2 gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
      {["trade", "nft"].map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onModeChange?.(m)}
          className={`relative rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
            mode === m ? "text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {mode === m && (
            <motion.span
              layoutId="platform-mode-pill"
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-300"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{m === "trade" ? "Trade" : "NFT"}</span>
        </button>
      ))}
    </div>
  );
}

export default function PlatformShell({
  user,
  page,
  onPageChange,
  mode = "trade",
  onModeChange,
  walletUsdt,
  onLogout,
  onOpenAccount,
  onOpenKyc,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const kycApproved = user?.kyc?.status === "approved";

  return (
    <div className="nx-bg-shell relative min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#06080f]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => onPageChange?.("home")}
            className="flex shrink-0 items-center gap-2"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-sm font-black text-slate-950 shadow-glow">
              N
            </div>
            <span className="hidden font-display text-base font-bold tracking-tight text-white sm:inline">
              Nexus
            </span>
          </button>

          <ModeToggle mode={mode} onModeChange={onModeChange} />

          <div className="hidden min-w-0 flex-1 md:block">
            <NavLinks mode={mode} page={page} onPageChange={onPageChange} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
            <NotificationBell userId={user?._id || user?.id} mode="user" />

            {walletUsdt != null && (
              <button
                type="button"
                onClick={() => onPageChange?.("assets")}
                className="hidden items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1.5 sm:inline-flex"
                title="Assets"
              >
                <Wallet className="h-3.5 w-3.5 text-cyan-300" />
                <span className="text-xs font-bold tabular-nums text-white">
                  $
                  {Number(walletUsdt || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenAccount?.()}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                page === "account"
                  ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
              }`}
            >
              <UserRound className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Account</span>
            </button>

            <button
              type="button"
              onClick={() => onLogout?.()}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav — horizontal scroll */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5 md:hidden"
            >
              <div className="px-4 py-2">
                <NavLinks mode={mode} page={page} onPageChange={onPageChange} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {!kycApproved && (
        <button
          type="button"
          onClick={() => onOpenKyc?.()}
          className="flex w-full items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-center text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/15"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {user?.kyc?.status === "pending"
            ? "Identity verification pending review"
            : "Complete identity verification to unlock full access"}
          <span className="underline underline-offset-2">Verify now</span>
        </button>
      )}

      <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
