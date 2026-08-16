/**
 * Authenticated Home — cinematic desk (video + copy). Charts live on Trading.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CandlestickChart,
  Zap,
  ArrowRight,
  Globe2,
  Activity,
  BarChart3,
  Radio,
  Clock3,
  Lock,
  Sparkles,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";
import BrandLogo from "./BrandLogo.jsx";
import VideoBackdrop from "./VideoBackdrop.jsx";
import { CRYPTO_VIDEO, CRYPTO_POSTER, HERO_VIDEO, HERO_POSTER } from "../lib/brand.js";

const TICKER_ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
];

const CORP_PILLARS = [
  {
    icon: Zap,
    title: "Full exchange desk",
    body: "Delivery, Spot, Perpetual, Market, C2C, and NFT tools in a single dark terminal built for clarity.",
  },
  {
    icon: Activity,
    title: "AI Bot & earn products",
    body: "Contract-bound Copy AI Bot locks with admin-controlled daily commission — editable anytime.",
  },
  {
    icon: ShieldCheck,
    title: "Assets & verification",
    body: "Sub-accounts, convert/transfer, Live Chat deposits, and KYC with ID Card or Driving License.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Open any market",
    body: "Use the top nav to jump between Market, Delivery, Spot, or Copy AI Bot Trading.",
  },
  {
    step: "02",
    title: "Size & confirm",
    body: "Set stake or lock amount from your Trading Wallet — balances stay visible in Assets.",
  },
  {
    step: "03",
    title: "Execute with clarity",
    body: "Delivery settles on the timer; Copy AI Bot requires a signed risk disclosure before lock.",
  },
  {
    step: "04",
    title: "Track everything",
    body: "Notifications, Market Activity, and Assets logs keep wins, losses, and claims visible.",
  },
];

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Delivery trading",
    body: "Fixed-time long and short positions with live charts and countdown settlement.",
  },
  {
    icon: BarChart3,
    title: "Market overview",
    body: "Live crypto and forex-style pairs with one-click navigation into trade modes.",
  },
  {
    icon: Zap,
    title: "Copy AI Bot Trading",
    body: "Legal contract modal, lock periods, and admin-set daily commission percentages.",
  },
  {
    icon: Globe2,
    title: "Assets hub",
    body: "Spot, Delivery, NFT, and funding balances with transfer, convert, and bank cards.",
  },
];

const FLOOR_NOTES = [
  {
    icon: Clock3,
    title: "Seconds settlement",
    body: "Delivery clocks close in-session. No waiting for a T+1 batch.",
  },
  {
    icon: Lock,
    title: "Wallet already live",
    body: "Trading Wallet and Live Earnings sit on this desk — jump straight to orders.",
  },
  {
    icon: Sparkles,
    title: "Copy AI Bot floor",
    body: "Admin-assigned lock + daily commission. You cannot change days; yield is managed for you.",
  },
];

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
}

function formatUsd(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `-$${abs}` : `$${abs}`;
}

function LivePriceStrip() {
  const [markets, setMarkets] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await SecondsTradeAPI.markets();
      const next = {};
      for (const m of res.markets || []) {
        if (TICKER_ASSETS.some((a) => a.symbol === m.asset)) {
          next[m.asset] = Number(m.price) || 0;
        }
      }
      setMarkets((prev) => ({ ...prev, ...next }));
    } catch {
      /* ignore transient */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1424] px-4 py-3">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">
        <Radio className="h-3 w-3" />
        Live desk
      </span>
      {TICKER_ASSETS.map(({ symbol, name }) => (
        <div
          key={symbol}
          className="shrink-0 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {name}
          </div>
          <div className="font-mono text-sm font-semibold tabular-nums text-white">
            {symbol}{" "}
            <span className="text-[#ffc107]">
              {markets[symbol] ? `$${formatPrice(markets[symbol])}` : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomeLanding({ user, walletUsdt = 0, liveEarnings = 0, onStartTrading }) {
  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "";

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#ffc107]/25 shadow-[0_0_48px_rgba(255,193,7,0.12)]">
        <VideoBackdrop
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          overlayClassName="bg-gradient-to-r from-[#05070c] via-[#05070c]/82 to-[#05070c]/35"
        />
        <div className="relative z-10 px-5 py-10 sm:px-8 sm:py-12 md:px-10 md:py-14">
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-xl md:text-left">
            <BrandLogo className="mb-4 justify-center md:justify-start" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ffc107]">
              Private session · signed in
            </p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl"
            >
              {firstName ? `${firstName}, your floor is open` : "Your floor is open"}
            </motion.h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              This is your signed-in Binomo desk — cinematic market tape, not a
              public chart wall. Place live orders from Trading; Copy AI Bot
              commission stays under admin control.
            </p>
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onStartTrading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffc107] px-5 py-3 text-sm font-bold text-[#1a1400] shadow-[0_0_24px_rgba(255,193,7,0.4)] transition hover:bg-[#ffd54f]"
              >
                Open Trading Terminal
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-xl bg-black/45 p-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Trading Wallet
                </div>
                <div
                  className={`mt-1 text-lg font-bold tabular-nums ${
                    walletUsdt < 0 ? "text-rose-400" : "text-white"
                  }`}
                >
                  {formatUsd(walletUsdt)}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-500/15 p-3 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/90">
                  Live Earnings
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                  {formatUsd(liveEarnings)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LivePriceStrip />

      <section className="relative overflow-hidden rounded-2xl border border-cyan-400/20">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-gradient-to-t from-[#05070c] via-[#05070c]/75 to-[#05070c]/40"
        />
        <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-10">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              A quieter floor. Faster decisions.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Charts stay on the Trading tab. Here you get session context,
              wallet state, and a path into execution — without a candlestick
              stack under the hero.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {FLOOR_NOTES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-2xl border border-white/12 bg-black/45 p-4 backdrop-blur-sm"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ffc107]/15 text-[#ffc107]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Platform advantages
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Institutional execution, seconds settlement, and secured wallets.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {CORP_PILLARS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug text-white">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            How Exchange Trading Works
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            From market selection to automatic settlement in four steps.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map(({ step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="rounded-2xl border border-white/10 bg-[#0d1424] p-4 md:p-5"
            >
              <div className="text-lg font-bold text-cyan-400/80">{step}</div>
              <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 text-center md:text-left">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Why traders choose Binomo
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
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{body}</p>
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
          wallet, and password — or jump straight into the Trading workspace to
          place Buy / Sell orders.
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
