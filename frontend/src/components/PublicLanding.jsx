/**
 * Public landing — equiti-style layout + our product features.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Headphones,
  Gift,
  UserRound,
  BarChart3,
  Radio,
} from "lucide-react";
import { SecondsTradeAPI } from "../lib/api.js";
import BrandLogo from "./BrandLogo.jsx";
import SiteFooter from "./SiteFooter.jsx";
import NeonLiveGraph from "./NeonLiveGraph.jsx";
import LiveChatWidget from "./LiveChatWidget.jsx";
import { CertificatePage } from "./TradingCertificate.jsx";
import { AboutPage, ContactPage, VipPage } from "./InfoPages.jsx";
import { ForexStyleShowcase, EquitiFaq } from "./TrustInfra.jsx";

const PAIRS = [
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "SHIB", name: "Shiba Inu" },
];

const LIME_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#C8FF00] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_10px_28px_-8px_rgba(200,255,0,0.45)] transition hover:bg-[#e8ff8a]";

const LIME_BTN_SM =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#C8FF00] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-black transition hover:bg-[#e8ff8a]";

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

const BENEFITS = [
  {
    icon: BarChart3,
    title: "Live execution",
    body: "Seconds trades settle on a live candle desk — ETH, XRP, SOL, SHIB and more.",
  },
  {
    icon: ShieldCheck,
    title: "Verified payouts",
    body: "Deposits and withdrawals stay pending until the admin desk signs them off.",
  },
  {
    icon: Headphones,
    title: "24/7 live chat",
    body: "VIP, loan, and withdraw threads open with instructions before you type.",
  },
];

const FAQ = [
  { q: "How do I open an account?", a: "Sign up with a valid invite code, complete your profile, then wait for any admin checks that apply." },
  { q: "Which markets can I trade?", a: "Live seconds desks on ETH, XRP, SOL, SHIB and more pairs streamed from the public market feed." },
  { q: "How do deposits work?", a: "Submit the deposit with proof in Live Chat. Funds stay pending until the admin desk verifies." },
  { q: "How do withdrawals work?", a: "Request a withdrawal from Assets. Staff review the wallet or bank card before any payout." },
  { q: "What is Copy AI Bot?", a: "You lock capital into an admin-assigned contract with a disclosed target yield. Nothing runs until you confirm." },
  { q: "What devices can I use?", a: "equiti runs in the browser on desktop and mobile. No extra terminal install." },
  { q: "How does Live Chat support work?", a: "Open the thread for deposit, withdraw, VIP, or loan. Instructions appear first, then a manager replies." },
  { q: "Is there public pricing?", a: "No VPS-style pricing table. Trading, VIP, and loans follow the conditions shown inside your account." },
];

const STEPS = [
  {
    n: "1",
    title: "Sign up",
    body: "Create your equiti account with a valid invite code.",
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
  const [chatHint, setChatHint] = useState("info");
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const heroRef = useRef(null);

  const openChat = (hint = "info") => {
    setChatHint(hint);
    setChatOpenSignal((n) => n + 1);
  };

  const go = (id) => {
    setNavOpen(false);
    if (id === "about" || id === "contact" || id === "vip" || id === "certificate") {
      setView(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView("home");
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 40);
  };

  useEffect(() => {
    const onCert = () => {
      setView("certificate");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("nexus:open-certificate", onCert);
    return () => window.removeEventListener("nexus:open-certificate", onCert);
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#000000]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-6">
          <BrandLogo
            onClick={() => {
              setView("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
          <nav className="hidden items-center gap-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white/80 md:flex">
            <button type="button" onClick={() => go("trading")} className="hover:text-[#C8FF00]">
              Trading
            </button>
            <button type="button" onClick={() => go("about")} className="hover:text-[#C8FF00]">
              About us
            </button>
            <button type="button" onClick={() => go("vip")} className="hover:text-[#C8FF00]">
              VIP
            </button>
            <button type="button" onClick={() => go("contact")} className="hover:text-[#C8FF00]">
              Contact
            </button>
            <button type="button" onClick={() => go("certificate")} className="hover:text-[#C8FF00]">
              Certificate
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
            <button type="button" onClick={onRegister} className={LIME_BTN_SM}>
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
            {["trading", "about", "vip", "contact", "certificate"].map((id) => (
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
            <AboutPage
              onCta={onRegister}
              onSupport={() => openChat("info")}
              ctaLabel="Sign up"
            />
          )}
          {view === "contact" && (
            <ContactPage onSupport={() => openChat("info")} ctaLabel="Open Live Chat" />
          )}
          {view === "vip" && (
            <VipPage onCta={onRegister} onSupport={() => openChat("vip")} />
          )}
          {view === "certificate" && (
            <CertificatePage
              onBack={() => go("home")}
              onContact={() => go("contact")}
            />
          )}
        </div>
      )}

      {view === "home" && (
      <>
      <div className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-[1180px] items-center gap-5 overflow-x-auto px-4 py-2.5 text-[11px] sm:px-6">
          <span className="inline-flex shrink-0 items-center gap-1.5 font-bold uppercase tracking-[0.16em] text-[#C8FF00]">
            <Radio className={`h-3 w-3 ${connected ? "text-[#C8FF00]" : "text-slate-500"}`} />
            Live
          </span>
          {PAIRS.map((p) => (
            <span key={p.symbol} className="shrink-0 font-semibold text-white/70">
              {p.symbol}/USDT{" "}
              <span className="tabular-nums text-white">
                {markets[p.symbol] ? formatPrice(markets[p.symbol]) : "—"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <section id="trading" ref={heroRef} className="relative overflow-hidden bg-black">
        <svg className="pointer-events-none absolute -right-8 top-8 hidden h-[520px] w-[46%] lg:block" viewBox="0 0 400 520" fill="none">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <path
              key={n}
              d={`M${40 + n * 18} 500 L${200 + n * 8} 40 L${360 - n * 18} 500`}
              stroke={n % 2 ? "#C8FF00" : "#3a3a3a"}
              strokeOpacity={n % 2 ? 0.35 : 0.5}
              strokeWidth="1.2"
            />
          ))}
        </svg>
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl text-4xl font-extrabold uppercase leading-[1.08] tracking-tight sm:text-[2.7rem]"
            >
              The equiti desk behind{" "}
              <span className="text-[#C8FF00]">live markets</span> every day
            </motion.h1>
            <p className="mt-4 max-w-lg text-sm text-white/70 sm:text-base">
              Faster charts, smarter locks, and safer payouts — in the browser, 24/7.
            </p>
            <ul className="mt-6 grid gap-x-8 gap-y-2 text-sm text-white/85 sm:grid-cols-2">
              {[
                "Live prices on ETH, XRP, SOL, SHIB",
                "Technical support available 24/7",
                "Invite-only trader network",
                "Desk stays online around the clock",
                "Admin-verified deposits & withdrawals",
                "Compatible with Copy AI Bot locks",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8FF00]" />
                  {line}
                </li>
              ))}
            </ul>
            <button type="button" onClick={onRegister} className={`${LIME_BTN} mt-8`}>
              Launch now →
            </button>
          </div>
          <div className="relative">
            <NeonLiveGraph symbol="ETH" height={340} transparent />
          </div>
        </div>
        <div className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#C8FF00]/40 bg-black px-5 py-4">
            <p className="text-sm text-white/80">
              <span className="text-[#C8FF00]">“</span> Switched to equiti and the desk stays live.
              <span className="text-[#C8FF00]">”</span>
            </p>
            <div className="text-xs font-bold uppercase tracking-wider text-white/70">
              <span className="text-[#C8FF00]">★★★★★</span> Live desk reviews
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black py-16">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 sm:grid-cols-3 sm:px-6">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-center sm:text-left">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[#C8FF00]/30 bg-[#C8FF00]/10 sm:mx-0">
                <Icon className="h-6 w-6 text-[#C8FF00]" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold uppercase tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <ForexStyleShowcase />

      <section className="bg-black py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            Three steps to the <span className="text-[#C8FF00]">desk</span>
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border border-white/10 bg-[#0a0a0a] p-6">
                <div className="text-sm font-black text-[#C8FF00]">0{s.n}</div>
                <h3 className="mt-3 text-lg font-bold uppercase">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
            VIP <span className="text-[#C8FF00]">status</span>, VIP service
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: UserRound, title: "Personal manager", body: "Priority Live Chat with your assigned admin." },
              { icon: Gift, title: "Copy AI Bot yield", body: "Lock funds into admin-assigned contracts." },
              { icon: Headphones, title: "Priority withdrawal", body: "Verified cards and wallets move faster through review." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="border border-white/10 p-6">
                <Icon className="h-7 w-7 text-[#C8FF00]" />
                <h3 className="mt-4 font-bold uppercase">{title}</h3>
                <p className="mt-2 text-sm text-white/55">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button type="button" onClick={() => go("vip")} className={LIME_BTN_SM}>
              View VIP
            </button>
          </div>
        </div>
      </section>

      <div id="help">
        <EquitiFaq items={FAQ} openFaq={openFaq} setOpenFaq={setOpenFaq} />
      </div>
      <div className="bg-black pb-16 text-center">
        <button type="button" onClick={onRegister} className={LIME_BTN}>
          Open an account
        </button>
      </div>
      </>
      )}

      <SiteFooter onNavigate={go} onOpenChat={openChat} />
      <LiveChatWidget
        user={null}
        contextHint={chatHint}
        openSignal={chatOpenSignal}
        onNeedAuth={onSignIn}
        dockClass="max-sm:bottom-4"
      />
    </div>
  );
}
