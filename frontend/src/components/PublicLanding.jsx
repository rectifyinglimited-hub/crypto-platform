/**
 * Public landing — Binomo-style layout + our product features.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Headphones,
  Wallet,
  Zap,
  Timer,
  Lock,
  UserRound,
  Gift,
  Landmark,
  PiggyBank,
  BarChart3,
  CreditCard,
  Radio,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";
import BrandLogo from "./BrandLogo.jsx";
import SiteFooter from "./SiteFooter.jsx";
import NeonLiveGraph from "./NeonLiveGraph.jsx";
import HeroMediaSlider from "./HeroMediaSlider.jsx";
import { AboutPage, ContactPage, VipPage } from "./InfoPages.jsx";

const PAIRS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
];

const YELLOW_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#ffc107] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1a1400] shadow-[0_10px_28px_-8px_rgba(255,193,7,0.55)] transition hover:bg-[#ffd54f]";

const YELLOW_BTN_SM =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#ffc107] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-[#1a1400] transition hover:bg-[#ffd54f]";

function formatPrice(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  if (v >= 0.01) return v.toFixed(6);
  return v.toFixed(8);
}

function useLivePrices() {
  const [markets, setMarkets] = useState({});
  const [connected, setConnected] = useState(false);

  const ingest = useCallback((symbol, price) => {
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return;
    setMarkets((prev) => ({ ...prev, [symbol]: p }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await SecondsTradeAPI.publicMarkets();
        if (cancelled) return;
        for (const m of res.markets || []) {
          if (PAIRS.some((p) => p.symbol === m.asset)) ingest(m.asset, m.price);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const poll = setInterval(load, 6000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [ingest]);

  useEffect(() => {
    const streams = "btcusdt@ticker/ethusdt@ticker/solusdt@ticker";
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    let ws;
    let closed = false;
    let retry;
    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        retry = setTimeout(connect, 2500);
        return;
      }
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const d = msg?.data || msg;
          const pair = String(d?.s || "").toUpperCase();
          const price = Number(d?.c ?? d?.p);
          if (!pair.endsWith("USDT") || !Number.isFinite(price)) return;
          ingest(pair.slice(0, -4), price);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 2500);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [ingest]);

  return { markets, connected };
}

const STATS = [
  { value: "90k+", label: "Active traders" },
  { value: "133", label: "Countries" },
  { value: "24/7", label: "Live support" },
  { value: "$10", label: "Min. trade" },
  { value: "100+", label: "Markets" },
  { value: "Fast", label: "Withdrawals" },
];

const STEPS = [
  {
    n: "1",
    title: "Sign up",
    body: "Create your Binomo account with a valid invite code.",
  },
  {
    n: "2",
    title: "Trade",
    body: "Open timed trades on BTC, ETH, SOL — or start Copy AI Bot.",
  },
  {
    n: "3",
    title: "Deposit",
    body: "Fund via Deposit, then withdraw profits after admin verify.",
  },
];

export default function PublicLanding({ onSignIn, onRegister }) {
  const { markets, connected } = useLivePrices();
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState("home");
  const heroRef = useRef(null);

  const go = (id) => {
    setNavOpen(false);
    if (id === "about" || id === "contact" || id === "vip") {
      setView(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView("home");
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 40);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#05070c] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
          <BrandLogo
            onClick={() => {
              setView("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          <nav className="hidden items-center gap-6 text-[13px] font-semibold text-white/80 md:flex">
            <button type="button" onClick={() => go("trading")} className="hover:text-white">
              Trading
            </button>
            <button type="button" onClick={() => go("about")} className="hover:text-white">
              About us
            </button>
            <button type="button" onClick={() => go("vip")} className="hover:text-white">
              VIP
            </button>
            <button type="button" onClick={() => go("contact")} className="hover:text-white">
              Contact
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="hidden rounded-md px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white sm:inline"
            >
              Sign in
            </button>
            <button type="button" onClick={onRegister} className={YELLOW_BTN_SM}>
              Sign up
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md border border-white/15 md:hidden"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Menu"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-white/10 px-4 py-3 md:hidden">
            {["trading", "about", "vip", "contact"].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className="block w-full py-2 text-left text-sm font-semibold capitalize text-white/80"
              >
                {id.replace("-", " ")}
              </button>
            ))}
            <button type="button" onClick={onSignIn} className="mt-1 block w-full py-2 text-left text-sm font-semibold">
              Sign in
            </button>
          </div>
        )}
      </header>

      {view !== "home" && (
        <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
          {view === "about" && (
            <AboutPage onCta={onRegister} ctaLabel="Sign up" />
          )}
          {view === "contact" && (
            <ContactPage onSupport={onSignIn} ctaLabel="Sign in for Live Chat" />
          )}
          {view === "vip" && (
            <VipPage onCta={onRegister} onSupport={onSignIn} />
          )}
        </div>
      )}

      {view === "home" && (
      <>
      {/* Live strip */}
      <div className="border-b border-white/5 bg-[#0a1829]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 overflow-x-auto px-4 py-2 text-[11px] sm:px-6">
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-400">
            <Radio className={`h-3 w-3 ${connected ? "text-emerald-400" : "text-slate-500"}`} />
            Live
          </span>
          {PAIRS.map((p) => (
            <span key={p.symbol} className="shrink-0 font-semibold text-white/80">
              {p.symbol}/USDT{" "}
              <span className="tabular-nums text-[#ffc107]">
                {markets[p.symbol] ? formatPrice(markets[p.symbol]) : "—"}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero — person + 5 more slides, live looping candles */}
      <section
        ref={heroRef}
        className="relative min-h-[560px] overflow-hidden bg-[#081526] sm:min-h-[640px]"
      >
        <HeroMediaSlider />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffc107]/35 bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffc107]">
              BTC · ETH · SOL
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl"
            >
              Reliable trading partner
            </motion.h1>
            <p className="mt-3 text-base font-medium text-white/75 sm:text-lg">
              Your success is in your hands — live crypto markets, 24/7.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-[13px] font-semibold text-white/90">
              <span className="inline-flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-[#ffc107]" /> $10 min trade
              </span>
              <span className="inline-flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#ffc107]" /> up to 90% profit
              </span>
              <span className="inline-flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#ffc107]" /> 24/7 withdrawals
              </span>
            </div>
            <div className="mt-8">
              <button type="button" onClick={onRegister} className={YELLOW_BTN}>
                Try it
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <NeonLiveGraph symbol="BTC" />
            <div className="grid grid-cols-3 gap-2">
              {PAIRS.map((p) => (
                <div
                  key={p.symbol}
                  className="rounded-xl border border-[#ffc107]/20 bg-black/50 px-3 py-2.5 text-center"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffc107]">
                    {p.symbol}/USDT
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                    {markets[p.symbol] ? formatPrice(markets[p.symbol]) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 99% profit */}
      <section id="trading" className="bg-[#07111f] py-16 text-center sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="text-xl font-bold sm:text-2xl">The highest profitability on the market</h2>
          <div
            className="mt-4 font-extrabold leading-none tracking-tight text-transparent"
            style={{
              fontSize: "clamp(3.2rem, 12vw, 7.5rem)",
              backgroundImage: "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 40%, #0369a1 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 28px rgba(56,189,248,0.35))",
            }}
          >
            99% PROFIT
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
            for the most popular assets — BTC, ETH, SOL on the Binomo Trade desk
          </p>
          <button type="button" onClick={onRegister} className={`${YELLOW_BTN_SM} mt-6`}>
            Trade
          </button>
        </div>
      </section>

      {/* Specials */}
      <section className="bg-[#082032] py-12 sm:py-16">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-5 text-center text-xl font-bold sm:text-2xl">Binomo Specials</h2>
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#148a3c] to-[#1db954] px-6 py-8 sm:flex sm:items-center sm:justify-between sm:px-10">
            <div>
              <div className="text-lg font-extrabold sm:text-2xl">
                Get profitability up to 90% on your first deposit
              </div>
              <p className="mt-1 text-sm text-white/85">
                Fund via Deposit, wait for admin verify, then start trading.
              </p>
            </div>
            <button type="button" onClick={onRegister} className={`${YELLOW_BTN_SM} mt-5 shrink-0 sm:mt-0`}>
              Join
            </button>
          </div>
        </div>
      </section>

      {/* Why traders */}
      <section id="traders" className="bg-[#07111f] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">Why do traders choose Binomo?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-[#0c1a2e] px-3 py-5 text-center">
                <div className="text-2xl font-extrabold text-[#ffc107] sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-[11px] font-medium text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="bg-[#082032] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">Go top with a trusted desk</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Timer, title: "Trade", body: "Buy Long / Sell Short with live chart and countdown settlement." },
              { icon: Zap, title: "Copy AI Bot", body: "Lock funds into admin-assigned yield contracts." },
              { icon: Landmark, title: "Loan", body: "Borrower verification and admin-controlled loan plans." },
              { icon: Wallet, title: "Assets", body: "Deposit, withdraw, bank cards, wallet address and security." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0c1a2e] p-5">
                <Icon className="h-6 w-6 text-[#ffc107]" />
                <h3 className="mt-3 text-sm font-bold">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-[#07111f] py-12 sm:py-16">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6">
          <h2 className="mb-8 text-xl font-bold sm:text-2xl">Go top with a trusted leader</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["Invite-only", "Admin KYC", "Live Chat", "Verified payouts"].map((label) => (
              <div
                key={label}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/15 bg-[#0c1a2e] shadow-[inset_0_0_24px_rgba(255,193,7,0.08)]"
              >
                <ShieldCheck className="h-6 w-6 text-[#ffc107]" />
                <span className="mt-1 px-1 text-[10px] font-bold leading-tight text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="relative overflow-hidden bg-[#082032] py-16 sm:py-20">
        <img
          src="/bg/charts-desk.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[#07111f]/70" />
        <div className="relative mx-auto max-w-[1180px] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Dream bigger, act faster</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
            Join traders using Binomo for timed markets, Copy AI Bot locks, and verified withdrawals.
          </p>
          <button type="button" onClick={onRegister} className={`${YELLOW_BTN} mt-6`}>
            Sign up
          </button>
        </div>
      </section>

      {/* 3 minutes */}
      <section className="bg-[#07111f] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">
            Just 3 minutes to become a trader
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-white/10 bg-[#0c1a2e] p-6 text-center">
                <div className="text-3xl font-black text-[#ffc107]">{s.n}</div>
                <h3 className="mt-3 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button type="button" onClick={onRegister} className={YELLOW_BTN}>
              Open an account
            </button>
          </div>
        </div>
      </section>

      {/* VIP */}
      <section className="bg-[#082032] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-8 text-center text-xl font-bold sm:text-2xl">VIP status, VIP services</h2>
          <div className="mb-8 flex justify-center">
            <img
              src="/bg/hero-exchange.jpg"
              alt="Bitcoin"
              className="h-28 w-28 rounded-full object-cover ring-4 ring-[#ffc107]/50"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: UserRound, title: "Personal manager", body: "Priority Live Chat with your assigned admin." },
              { icon: Gift, title: "Copy AI Bot yield", body: "Lock funds into admin-assigned contracts with target yield." },
              { icon: Headphones, title: "Priority withdrawal", body: "Verified bank cards and wallets move faster through review." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0c1a2e] p-6 text-center">
                <Icon className="mx-auto h-8 w-8 text-[#ffc107]" />
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-2 text-sm text-white/55">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button type="button" onClick={onRegister} className={YELLOW_BTN_SM}>
              Go for VIP
            </button>
          </div>
        </div>
      </section>

      {/* Live looping desks */}
      <section className="bg-[#07111f] py-12 sm:py-16">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="mb-6 text-center text-xl font-bold sm:text-2xl">
            Live crypto · stocks-style candles
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <NeonLiveGraph symbol="BTC" height={180} compact />
            <NeonLiveGraph symbol="ETH" height={180} compact />
            <NeonLiveGraph symbol="SOL" height={180} compact />
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="help" className="bg-[#082032] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Put your trading helmet on</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/55">
            Invite-only signup, KYC, admin-verified deposits and withdrawals.
          </p>
          <div className="mx-auto my-8 grid h-28 w-28 place-items-center rounded-full border-4 border-[#ffc107]/40 bg-[#0c1a2e]">
            <ShieldCheck className="h-14 w-14 text-[#ffc107]" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: Lock, title: "Account security", body: "Password change and profile updates from Assets → Security." },
              { icon: ShieldCheck, title: "SSL encryption", body: "Encrypted sessions. Every deposit and withdraw is staff-reviewed." },
              { icon: Wallet, title: "Fund custody", body: "Wallet addresses and bank cards stay pending until admin approval." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0c1a2e] p-5 text-left">
                <Icon className="h-5 w-5 text-[#ffc107]" />
                <h3 className="mt-2 text-sm font-bold">{title}</h3>
                <p className="mt-1 text-xs text-white/55">{body}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={onRegister} className={`${YELLOW_BTN} mt-8`}>
            Start trading
          </button>
        </div>
      </section>

      </>
      )}

      <SiteFooter onNavigate={go} />
    </div>
  );
}
