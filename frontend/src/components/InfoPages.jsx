import { useEffect, useState } from "react";
import {
  Headphones,
  ShieldCheck,
  Crown,
  MessageCircle,
  MapPin,
  Mail,
  TrendingUp,
  Users,
  Globe2,
  Percent,
  RefreshCw,
  Network,
  ChevronDown,
  Award,
  Zap,
  BarChart3,
  GraduationCap,
  Gift,
  UserRound,
} from "lucide-react";
import VideoBackdrop from "./VideoBackdrop.jsx";
import NeonLiveGraph from "./NeonLiveGraph.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { SOCIAL_LINKS, CRYPTO_VIDEO, CRYPTO_POSTER, COMPANY } from "../lib/brand.js";
import { CertificatePreview, openCertificate } from "./TradingCertificate.jsx";
import { PlatformAPI } from "../lib/api.js";

const LIME_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#39FF14] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1a1400] shadow-[0_0_28px_rgba(57,255,20,0.45)] transition hover:bg-[#9dff6a]";

const ABOUT_IMGS = {
  desk: "/bg/trader-desk.png",
  charts: "/bg/charts-desk.jpg",
  exchange: "/bg/hero-exchange.jpg",
  city: "/bg/auth-city.jpg",
  network: "/bg/data-network.jpg",
  glow: "/bg/crypto-glow.jpg",
  servers: "/bg/servers-neon.png",
  circuit: "/bg/circuit-neon.png",
  geometry: "/bg/hero-geometry.png",
};

const ABOUT_FAQ = [
  {
    q: "What is equiti?",
    a: "equiti is a professional seconds trading terminal with live charts, invite-gated accounts, verified deposits and withdrawals, Copy AI Bot locks, and 24/7 Live Chat support.",
  },
  {
    q: "How do I open an account?",
    a: "You need a valid invite code to register. Create your profile, complete any required verification, fund via Deposit, then trade from the desk.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Deposits use merchant rails with screenshot proof in Live Chat. Withdrawals are reviewed by the admin desk after identity checks — so payouts stay protected.",
  },
  {
    q: "Is support available 24/7?",
    a: "Yes. Open Live Chat anytime for Information, VIP, loans, or withdrawals. Send receipts in the same thread after a transfer.",
  },
  {
    q: "Where is equiti based?",
    a: `${COMPANY.legalName} operates from ${COMPANY.jurisdiction}. See the Certificate page for the official business authorization.`,
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white sm:text-base">{item.q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#39FF14] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 pr-8 text-sm leading-relaxed text-white/60">{item.a}</p>
      )}
    </div>
  );
}

export function AboutPage({ onCta, onSupport, ctaLabel = "Open an account" }) {
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
            About equiti
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
            equiti is built for your{" "}
            <span className="text-[#39FF14]">financial goals</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
            A professional seconds trading desk — live markets, invite-only access,
            verified funds, Copy AI Bot, and human support in one secure terminal.
            We keep execution fast and payouts accountable.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onCta} className={LIME_BTN}>
              {ctaLabel}
            </button>
            {onSupport && (
              <button
                type="button"
                onClick={onSupport}
                className="inline-flex items-center gap-2 rounded-md border border-white/20 px-6 py-3 text-sm font-bold text-white hover:border-[#39FF14]/50 hover:text-[#39FF14]"
              >
                Learn more
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-6 grid-rows-3 gap-2.5 sm:gap-3">
          <img
            src={ABOUT_IMGS.desk}
            alt=""
            className="col-span-3 row-span-2 h-full min-h-[140px] w-full rounded-2xl object-cover"
          />
          <img
            src={ABOUT_IMGS.charts}
            alt=""
            className="col-span-3 row-span-1 h-28 w-full rounded-2xl object-cover sm:h-32"
          />
          <img
            src={ABOUT_IMGS.exchange}
            alt=""
            className="col-span-3 row-span-1 h-28 w-full rounded-2xl object-cover sm:h-32"
          />
          <img
            src={ABOUT_IMGS.city}
            alt=""
            className="col-span-2 row-span-1 h-24 w-full rounded-2xl object-cover"
          />
          <img
            src={ABOUT_IMGS.network}
            alt=""
            className="col-span-2 row-span-1 h-24 w-full rounded-2xl object-cover"
          />
          <img
            src={ABOUT_IMGS.glow}
            alt=""
            className="col-span-2 row-span-1 h-24 w-full rounded-2xl object-cover"
          />
        </div>
      </section>

      {/* Why choose */}
      <section>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Why choose equiti?
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Built for serious traders
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Globe2,
              title: "Global reach",
              body: "Trade BTC, ETH, SOL and 500+ pairs from any browser — desktop or mobile — with streaming prices.",
            },
            {
              icon: Percent,
              title: "Clear costs",
              body: "Transparent desk rules, invite-gated access, and admin-reviewed deposits so you know how funds move.",
            },
            {
              icon: RefreshCw,
              title: "Reliable service",
              body: "24/7 Live Chat, verified payouts, and a desk that stays online around the clock.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#39FF14]/30 bg-[#39FF14]/10">
                <c.icon className="h-6 w-6 text-[#39FF14]" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partnerships banner */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#121212]">
        <div className="grid items-stretch lg:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
              Partnerships
            </p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Grow with the equiti desk
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/60">
              Referral and VIP partners earn from verified trading volume.
              Invite traders, unlock tiers, and work with a desk that reviews
              every payout.
            </p>
            <button type="button" onClick={onCta} className={`${LIME_BTN} mt-6 w-fit`}>
              Find out more
            </button>
          </div>
          <div className="relative min-h-[220px]">
            <img
              src={ABOUT_IMGS.exchange}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-transparent to-transparent lg:from-[#121212]/80" />
          </div>
        </div>
      </section>

      {/* Trust / recognition */}
      <section>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Trust & recognition
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Built on verified operations
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: Award, label: "Business authorization" },
            { icon: ShieldCheck, label: "KYC desk checks" },
            { icon: Zap, label: "Live market feeds" },
            { icon: Users, label: "Invite-only network" },
            { icon: MessageCircle, label: "24/7 Live Chat" },
          ].map((a) => (
            <div
              key={a.label}
              className="flex flex-col items-center rounded-2xl border border-[#39FF14]/20 bg-black/40 px-3 py-6 text-center"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#39FF14]/50 bg-[#39FF14]/10">
                <a.icon className="h-7 w-7 text-[#39FF14]" />
              </div>
              <p className="mt-3 text-xs font-semibold text-white/80">{a.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <CertificatePreview onOpen={openCertificate} />
        </div>
      </section>

      {/* Mission / team */}
      <section>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Who we are
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Meet the equiti mission
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Globe2,
              title: "Our mission",
              body: "Give traders a browser-first desk with honest fills, clear verification, and support that answers.",
            },
            {
              icon: Headphones,
              title: "Top-level service",
              body: "Live Chat covers Information, VIP, loans, and withdrawals — receipts stay in one secure thread.",
            },
            {
              icon: Network,
              title: "Building a network",
              body: "Invite codes, referral tiers, and VIP volume keep the community exclusive and accountable.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <c.icon className="h-8 w-8 text-[#39FF14]" />
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Careers / people */}
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
              Careers
            </p>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Grow with a people-first trading desk
            </h2>
            <p className="mt-3 text-sm text-white/60">
              From support to risk review, equiti runs on operators who care
              about clean deposits, fair reviews, and traders who stay.
            </p>
            <button type="button" onClick={onSupport} className={`${LIME_BTN} mt-6`}>
              Talk to the desk
            </button>
          </div>
          <div className="relative mx-auto h-56 w-full max-w-md">
            {[
              { src: ABOUT_IMGS.desk, className: "left-[8%] top-[10%] h-28 w-28" },
              { src: ABOUT_IMGS.charts, className: "right-[12%] top-0 h-24 w-24" },
              { src: ABOUT_IMGS.city, className: "bottom-[8%] left-[22%] h-26 w-26 h-28 w-28" },
              { src: ABOUT_IMGS.glow, className: "bottom-[4%] right-[18%] h-32 w-32" },
            ].map((p) => (
              <img
                key={p.className}
                src={p.src}
                alt=""
                className={`absolute rounded-full border-2 border-[#39FF14]/40 object-cover shadow-lg ${p.className}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Social */}
      <section>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Social channels
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Find us on social
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-white transition hover:border-[#39FF14]/40 hover:text-[#39FF14]"
            >
              <span className="text-[#39FF14]">{s.label.slice(0, 1)}</span>
              {s.label}
            </a>
          ))}
        </div>
      </section>

      {/* Mid CTA */}
      <section className="rounded-3xl bg-[#0e0e0e] px-6 py-12 text-center sm:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Join the desk
        </p>
        <h2 className="mt-3 text-2xl font-extrabold sm:text-4xl">
          Start trading online with equiti
        </h2>
        <button type="button" onClick={onCta} className={`${LIME_BTN} mt-7`}>
          {ctaLabel}
        </button>
      </section>

      {/* Presence cards */}
      <section>
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          Our presence
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Where the desk operates
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { img: ABOUT_IMGS.city, title: "Kingstown", sub: COMPANY.jurisdiction },
            { img: ABOUT_IMGS.network, title: "Live markets", sub: "Global crypto pairs" },
            { img: ABOUT_IMGS.servers, title: "Secure rails", sub: "Deposit & withdraw" },
            { img: ABOUT_IMGS.circuit, title: "Copy AI Bot", sub: "Automated locks" },
            { img: ABOUT_IMGS.geometry, title: "Support desk", sub: "Live Chat 24/7" },
          ].map((c) => (
            <div
              key={c.title}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
            >
              <img src={c.img} alt="" className="h-28 w-full object-cover" />
              <div className="p-4">
                <div className="font-bold">{c.title}</div>
                <div className="mt-1 text-xs text-white/50">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#39FF14]">
          FAQ
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-extrabold sm:text-4xl">
          Questions about equiti
        </h2>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] px-5 sm:px-6">
          {ABOUT_FAQ.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={faqOpen === i}
              onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)}
            />
          ))}
        </div>
      </section>

      {/* Explore more */}
      <section>
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-4xl">
          There&apos;s more to explore
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: BarChart3,
              title: "Trading desk",
              body: "Seconds trades, live candles, and Copy AI Bot from one terminal.",
              action: onCta,
              label: "Open desk",
            },
            {
              icon: ShieldCheck,
              title: "Certificate",
              body: "Review the official business authorization for equiti operations.",
              action: () => openCertificate(),
              label: "View certificate",
            },
            {
              icon: GraduationCap,
              title: "Support & VIP",
              body: "Ask Live Chat or explore VIP tiers for higher desk priority.",
              action: onSupport,
              label: "Contact support",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#39FF14]/15">
                <c.icon className="h-6 w-6 text-[#39FF14]" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm text-white/55">{c.body}</p>
              {c.action && (
                <button
                  type="button"
                  onClick={c.action}
                  className="mt-4 text-left text-sm font-bold text-[#39FF14] hover:underline"
                >
                  {c.label} →
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-3xl border border-[#39FF14]/25 bg-gradient-to-br from-[#39FF14]/10 via-black to-black px-6 py-12 text-center sm:px-10">
        <BrandLogo className="mx-auto justify-center [&_svg]:h-9" />
        <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
          Start trading online with equiti
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
          {COMPANY.legalName} · {COMPANY.email}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onCta} className={LIME_BTN}>
            {ctaLabel}
          </button>
          {onSupport && (
            <button
              type="button"
              onClick={onSupport}
              className="inline-flex items-center gap-2 rounded-md border border-[#39FF14]/40 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#39FF14] hover:bg-[#39FF14]/10"
            >
              <MessageCircle className="h-4 w-4" />
              Ask Live Chat
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function ContactPage({ onSupport, ctaLabel = "Contact support" }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#39FF14]/20 px-5 py-12 sm:px-10">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-black/78"
        />
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <Headphones className="mx-auto h-10 w-10 text-[#39FF14]" />
          <h1 className="mt-3 text-3xl font-extrabold">Contact support</h1>
          <p className="mt-3 text-sm text-white/70">
            Questions, deposits, or VIP — open Live Chat and pick Information
            to ask the desk. After a transfer, send the receipt screenshot in
            the same thread.
          </p>
          <button type="button" onClick={onSupport} className={`${LIME_BTN} mt-6`}>
            <MessageCircle className="h-4 w-4" />
            {ctaLabel}
          </button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Office
          </div>
          <div className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#39FF14]" />
            <p>
              <span className="font-semibold text-white">{COMPANY.legalName}</span>
              <br />
              {COMPANY.addressLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>
          <a
            href={`mailto:${COMPANY.email}`}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#39FF14] hover:underline"
          >
            <Mail className="h-4 w-4" />
            {COMPANY.email}
          </a>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Social
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#39FF14]/25 px-4 py-2 text-sm font-semibold text-[#39FF14] hover:bg-[#39FF14]/10"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_VIP_TIERS = [
  { level: 1, name: "VIP 1", minVolume30d: 1000, commissionRate: 10, perk: "Priority Live Chat queue" },
  { level: 2, name: "VIP 2", minVolume30d: 10000, commissionRate: 15, perk: "Faster deposit screenshot review" },
  { level: 3, name: "VIP 3", minVolume30d: 50000, commissionRate: 20, perk: "Personal manager routing" },
  { level: 4, name: "VIP 4", minVolume30d: 100000, commissionRate: 22, perk: "Faster withdrawal review window" },
  { level: 5, name: "VIP 5", minVolume30d: 200000, commissionRate: 24, perk: "Dedicated VIP desk hours" },
  { level: 6, name: "VIP 6", minVolume30d: 350000, commissionRate: 26, perk: "Elevated Copy AI Bot allocation" },
  { level: 7, name: "VIP 7", minVolume30d: 500000, commissionRate: 28, perk: "Concierge KYC and payout help" },
  { level: 8, name: "VIP 8", minVolume30d: 750000, commissionRate: 30, perk: "Higher desk limits on verified rails" },
  { level: 9, name: "VIP 9", minVolume30d: 1200000, commissionRate: 32, perk: "Senior relationship manager" },
  { level: 10, name: "VIP 10", minVolume30d: 2000000, commissionRate: 35, perk: "Top-desk status and max referral cut" },
];

function fmtVipUsd(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function VipPage({ user, onCta, onSupport, onReferral }) {
  const isVip = Boolean(user?.vipStatus);
  const signedIn = Boolean(user);
  const [pack, setPack] = useState(null);

  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    PlatformAPI.referralMe()
      .then((d) => {
        if (alive) setPack(d);
      })
      .catch(() => {
        if (alive) setPack(null);
      });
    return () => {
      alive = false;
    };
  }, [signedIn]);

  const settings = pack?.settings || {};
  const me = pack?.referral || {};
  const defaultRate = Number(settings.defaultReferralCommissionRate ?? 15);
  const unlockDays = Number(
    me.unlockTradingDays || settings.referralUnlockTradingDays || 30
  );
  const liveRate = Number(me.commissionRate ?? defaultRate);
  const level = Number(me.vipLevel ?? user?.vipLevel ?? 0);
  const volume30d = Number(me.volume30d || 0);
  const progress = me.progress || { progress: 0, remaining: 0, nextTier: null };
  const tiers = Array.isArray(settings.vipTierSettings) && settings.vipTierSettings.length
    ? [...settings.vipTierSettings].sort((a, b) => a.level - b.level)
    : DEFAULT_VIP_TIERS;
  const tableRows = [
    { level: 0, name: "Standard", minVolume30d: 0, commissionRate: defaultRate },
    ...tiers,
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#39FF14]/35 px-5 py-12 shadow-[0_0_50px_rgba(57, 255, 20,0.12)] sm:px-10">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-gradient-to-r from-black via-black/82 to-black/50"
        />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#39FF14]">
              <Crown className="h-3.5 w-3.5" />
              {isVip ? "Lounge VIP active" : "VIP desk"}
              {level > 0 ? ` · Trading VIP ${level}` : ""}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              VIP lounge + trading VIP
            </h1>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Two layers: lounge VIP (desk priority from your admin) and trading
              VIP (auto from 30-day volume). Trading VIP raises the referral
              commission you earn when friends trade after unlock.
            </p>
            {signedIn ? (
              <div className="mt-5 grid max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/45">
                    Trading VIP
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-[#39FF14]">
                    {level > 0 ? `VIP ${level}` : "Standard"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/45">
                    Commission
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-cyan-300">
                    {liveRate}%
                  </div>
                </div>
                <div className="col-span-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 sm:col-span-1">
                  <div className="text-[10px] uppercase tracking-wider text-white/45">
                    30d volume
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-white">
                    {fmtVipUsd(volume30d)}
                  </div>
                </div>
              </div>
            ) : null}
            {signedIn && progress.nextTier ? (
              <div className="mt-4 max-w-md">
                <div className="mb-1 flex justify-between text-[11px] text-white/50">
                  <span>
                    Next {progress.nextTier.name || `VIP ${progress.nextTier.level}`}
                  </span>
                  <span>{fmtVipUsd(progress.remaining)} to go</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#39FF14] to-cyan-400"
                    style={{
                      width: `${Math.round((Number(progress.progress) || 0) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {isVip ? (
                <button type="button" onClick={onCta} className={LIME_BTN}>
                  Open Trade desk
                </button>
              ) : (
                <button type="button" onClick={onSupport} className={LIME_BTN}>
                  Request lounge VIP
                </button>
              )}
              {onReferral ? (
                <button
                  type="button"
                  onClick={onReferral}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#39FF14]/40 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#39FF14] hover:bg-[#39FF14]/10"
                >
                  Referral & bonus
                </button>
              ) : null}
            </div>
          </div>
          <NeonLiveGraph symbol="XRP" height={300} transparent />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#39FF14]/20 bg-black/45 p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#39FF14]">
            <Crown className="h-4 w-4" />
            Lounge VIP
          </h3>
          <p className="mt-2 text-sm text-white/55">
            Granted by your administrator in Control Room. Unlocks this lounge,
            personal manager routing, and faster review on verified payouts.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Status: {isVip ? "Active on this account" : "Ask Live Chat to request it"}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-black/45 p-5">
          <h3 className="flex items-center gap-2 font-bold text-cyan-300">
            <TrendingUp className="h-4 w-4" />
            Trading VIP
          </h3>
          <p className="mt-2 text-sm text-white/55">
            Auto-upgrades from your rolling 30-day trade volume. Higher tiers
            pay a higher % when invited users trade after {unlockDays} active
            days.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Your live cut: {liveRate}% of each unlocked referral’s stake
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-extrabold">Trading VIP 1–10</h2>
        <p className="mt-1 mb-3 text-sm text-white/50">
          Ten volume tiers. More 30-day volume moves you up and can raise the
          referral commission you keep. Lounge VIP is still granted by your admin.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {tiers.map((t) => {
            const active = signedIn && Number(t.level || 0) === level;
            return (
              <div
                key={t.level}
                className={`rounded-2xl border p-3 ${
                  active
                    ? "border-[#39FF14]/45 bg-[#39FF14]/12"
                    : "border-white/10 bg-black/35"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-[#39FF14]">
                    {t.name || `VIP ${t.level}`}
                  </div>
                  {active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-lg font-extrabold text-cyan-300">
                  {Number(t.commissionRate)}%
                </div>
                <div className="text-[11px] text-white/45">
                  {fmtVipUsd(t.minVolume30d)}+ / 30 days
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                  {t.perk || "Higher referral commission on unlocked invites."}
                </p>
              </div>
            );
          })}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">30-day volume</th>
                <th className="px-4 py-3 font-semibold">Referral %</th>
                <th className="px-4 py-3 font-semibold">On $100 trade</th>
                <th className="px-4 py-3 font-semibold">Perk</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((t) => {
                const active = signedIn && Number(t.level || 0) === level;
                const rate = Number(t.commissionRate);
                return (
                  <tr
                    key={t.level ?? "std"}
                    className={
                      active
                        ? "bg-[#39FF14]/12 text-white"
                        : "border-t border-white/5 text-white/75"
                    }
                  >
                    <td className="px-4 py-3 font-semibold">
                      {t.name || `VIP ${t.level}`}
                      {active ? (
                        <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{fmtVipUsd(t.minVolume30d)}+</td>
                    <td className="px-4 py-3 font-bold text-cyan-300">{rate}%</td>
                    <td className="px-4 py-3 text-emerald-300">
                      ${rate.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/55">
                      {t.perk || (Number(t.level) === 0 ? "Default referral rate" : "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: UserRound, title: "Personal manager", body: "Priority Live Chat with your assigned admin." },
          { icon: Gift, title: "Copy AI Bot yield", body: "Lock funds into admin-assigned contracts with target yield." },
          { icon: ShieldCheck, title: "Priority withdrawal", body: "Verified bank cards and wallets move faster through review." },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-[#39FF14]/20 bg-black/45 p-6 text-center"
          >
            <Icon className="mx-auto h-8 w-8 text-[#39FF14]" />
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-2 text-sm text-white/55">{body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
        <h3 className="flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 text-[#39FF14]" />
          Referral scene in one line
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Invite friends with your code. After they trade on {unlockDays}{" "}
          separate days, you earn your live {liveRate}% on each of their
          settled stakes. More unlocked users and a higher VIP tier both
          increase the bonus.
        </p>
      </div>
    </div>
  );
}
