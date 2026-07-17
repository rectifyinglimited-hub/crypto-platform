/**
 * Authenticated Home — corporate / marketing landing.
 * Sign In / Register are intentionally omitted (session already active).
 */

import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  CandlestickChart,
  Zap,
  ArrowRight,
  Globe2,
} from "lucide-react";

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Seconds Trading",
    body: "Fixed-time long and short positions with live market feeds and precise countdown settlement.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Workspace",
    body: "Identity verification, wallet controls, and session-protected access for every trader.",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    body: "Trades resolve the moment the timer hits zero — with clear WIN / LOSS outcomes in Market Activity.",
  },
  {
    icon: Globe2,
    title: "Global Markets",
    body: "Trade major crypto pairs and select equities from a single responsive terminal.",
  },
];

export default function HomeLanding({ user, walletUsdt = 0, liveEarnings = 0, onStartTrading }) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero — brand-first, no auth CTAs */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1424] via-[#0a1220] to-[#071018] px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300 ring-1 ring-cyan-400/25"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Nexus
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Professional seconds
            <span className="block bg-gradient-to-r from-cyan-200 to-emerald-300 bg-clip-text text-transparent">
              exchange platform
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400 md:mx-0 md:text-base"
          >
            Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
            . Explore the platform overview here — open the Trading tab when you
            are ready to place live positions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:justify-start"
          >
            <button
              type="button"
              onClick={onStartTrading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              Open Trading Terminal
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Trading Wallet
              </div>
              <div
                className={`mt-1 text-lg font-bold tabular-nums ${
                  walletUsdt < 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {walletUsdt < 0 ? "-" : ""}$
                {Math.abs(walletUsdt).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/25">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/90">
                Live Earnings
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                $
                {Number(liveEarnings || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Why traders choose Nexus
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Built for clarity, speed, and secure account management.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0d1424] px-5 py-6 text-center md:px-8">
        <h2 className="text-base font-semibold text-white md:text-lg">
          Ready when you are
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
          Your session is active. Use Profile / Settings for avatar, TRC-20
          wallet, and password — or jump straight into the Trading workspace.
        </p>
        <button
          type="button"
          onClick={onStartTrading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
        >
          Go to Trading
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
