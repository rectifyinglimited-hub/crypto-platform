/**
 * Authenticated shell — desktop top nav + mobile left drawer (app-like).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  LineChart,
  CandlestickChart,
  Bot,
  Landmark,
  Wallet,
  ChevronDown,
  LogOut,
  ShieldCheck,
  UserRound,
  Menu,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  Crown,
  Headphones,
  Info,
} from "lucide-react";
import NotificationBell from "./NotificationBell.jsx";
import BrandLogo from "./BrandLogo.jsx";
import SiteFooter from "./SiteFooter.jsx";

const TRADE_LINKS = [
  { key: "home", label: "Home", icon: Home },
  { key: "market", label: "Market", icon: LineChart },
  { key: "trade", label: "Trade", icon: CandlestickChart },
  { key: "aibot", label: "Copy AI Bot Trading", icon: Bot },
  { key: "loan", label: "Loan", icon: Landmark },
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
  { key: "withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { key: "assets", label: "Assets", icon: Wallet },
  { key: "vip", label: "VIP", icon: Crown },
];

const MORE_LINKS = [
  { key: "about", label: "About us", icon: Info },
  { key: "contact", label: "Contact support", icon: Headphones },
];

function NavLinks({ page, onPageChange }) {
  const links = TRADE_LINKS;

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
                ? item.key === "vip"
                  ? "bg-[#ffc107]/15 text-[#ffc107]"
                  : "bg-cyan-500/15 text-cyan-300"
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

/** Mobile left drawer — app-style side menu */
function MobileDrawer({
  open,
  onClose,
  page,
  onPageChange,
  user,
  walletUsdt,
  onOpenAccount,
  onLogout,
  onOpenDeposit,
}) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const links = TRADE_LINKS;
  const displayName =
    user?.fullName || user?.username || user?.email?.split("@")[0] || "Trader";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open && links.some((l) => l.children?.some((c) => c.key === page))) {
      setTradeOpen(true);
    }
  }, [open, page, links]);

  const go = (key) => {
    onPageChange?.(key);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: "-105%" }}
            animate={{ x: 0 }}
            exit={{ x: "-105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,20.5rem)] flex-col overflow-hidden border-r border-white/10 shadow-2xl shadow-black/60 md:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Atmospheric panel background (no video — cleaner & faster) */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[#070b14]" />
              <div
                className="absolute inset-0 opacity-90"
                style={{
                  backgroundImage:
                    "radial-gradient(ellipse 80% 50% at 0% 0%, rgba(45,212,191,0.22), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(14,165,233,0.14), transparent 50%), linear-gradient(165deg, rgba(15,23,42,0.2), rgba(6,8,15,0.95))",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              <div className="absolute -left-10 top-24 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute -right-8 bottom-32 h-36 w-36 rounded-full bg-teal-400/10 blur-3xl" />
            </div>

            <div className="relative flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <BrandLogo variant="mark" imgClassName="h-9 w-9" />
                  <div className="min-w-0">
                    <div className="truncate text-[10px] text-slate-500">
                      {displayName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Wallet strip */}
              <div className="mx-4 mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                  Trading Wallet
                </div>
                <div className="mt-0.5 flex items-end justify-between gap-2">
                  <div className="font-display text-xl font-bold tabular-nums text-white">
                    $
                    {Number(walletUsdt || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDeposit?.();
                      onClose?.();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-950"
                  >
                    <ArrowDownToLine className="h-3 w-3" /> Deposit
                  </button>
                </div>
              </div>

              {/* Nav list */}
              <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Menu
                </div>
                {links.map((item) => {
                  if (item.children) {
                    const active = item.children.some((c) => c.key === page);
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setTradeOpen((v) => !v)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                            active
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "text-slate-200 active:bg-white/5"
                          }`}
                        >
                          <span
                            className={`grid h-9 w-9 place-items-center rounded-xl ${
                              active
                                ? "bg-cyan-400/20 text-cyan-300"
                                : "bg-white/[0.04] text-slate-400"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          <ChevronDown
                            className={`h-4 w-4 text-slate-500 transition ${
                              tradeOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {tradeOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pl-4"
                            >
                              {item.children.map((c) => (
                                <button
                                  key={c.key}
                                  type="button"
                                  onClick={() => go(c.key)}
                                  className={`mb-0.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium ${
                                    page === c.key
                                      ? "bg-cyan-500/10 text-cyan-300"
                                      : "text-slate-400 active:bg-white/5"
                                  }`}
                                >
                                  <span>{c.label}</span>
                                  {c.key === "delivery" && (
                                    <span className="text-[10px] text-cyan-400/70">
                                      Chart
                                    </span>
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  const Icon = item.icon;
                  const active = page === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => go(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-cyan-500/15 text-cyan-300"
                          : "text-slate-200 active:bg-white/5"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          active
                            ? "bg-cyan-400/20 text-cyan-300"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      )}
                    </button>
                  );
                })}
                <div className="mb-1.5 mt-3 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company
                </div>
                {MORE_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active = page === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => go(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-[#ffc107]/15 text-[#ffc107]"
                          : "text-slate-200 active:bg-white/5"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          active
                            ? "bg-[#ffc107]/20 text-[#ffc107]"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Footer actions */}
              <div
                className="border-t border-white/8 bg-black/20 px-3 py-3"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpenAccount?.();
                    onClose?.();
                  }}
                  className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 active:bg-white/5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-slate-400">
                    <UserRound className="h-4 w-4" />
                  </span>
                  Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout?.();
                    onClose?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300/90 active:bg-rose-500/10"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
                    <LogOut className="h-4 w-4" />
                  </span>
                  Sign out
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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
  onOpenChat,
  onNotificationSelect,
  onOpenDeposit,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const kycApproved = user?.kyc?.status === "approved";

  const handlePageChange = (key) => {
    onPageChange?.(key);
    setMobileNavOpen(false);
  };

  return (
    <div className="nx-bg-shell relative min-h-screen w-full text-slate-100">
      <header
        className="sticky top-0 z-40 border-b border-white/5 bg-[#06080f]/88 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 active:bg-white/10 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <BrandLogo onClick={() => handlePageChange("home")} />

          <div className="hidden min-w-0 flex-1 md:block">
            <NavLinks page={page} onPageChange={handlePageChange} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <NotificationBell
              userId={user?._id || user?.id}
              mode="user"
              onSelect={(n) => {
                onNotificationSelect?.(n);
                if (n?.type === "chat") onOpenChat?.("info");
              }}
            />

            {walletUsdt != null && (
              <button
                type="button"
                onClick={() => handlePageChange("assets")}
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
              className="hidden h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 md:grid"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        page={page}
        onPageChange={handlePageChange}
        user={user}
        walletUsdt={walletUsdt}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
        onOpenDeposit={onOpenDeposit}
      />

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

      <main className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        {children}
      </main>
      <SiteFooter onNavigate={handlePageChange} onOpenChat={onOpenChat} />
    </div>
  );
}
