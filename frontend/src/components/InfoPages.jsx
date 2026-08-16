import { useEffect, useState } from "react";
import { Headphones, ShieldCheck, Gift, UserRound, Crown, MessageCircle, MapPin, Mail, TrendingUp, Users } from "lucide-react";
import VideoBackdrop from "./VideoBackdrop.jsx";
import NeonLiveGraph from "./NeonLiveGraph.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { SOCIAL_LINKS, CRYPTO_VIDEO, CRYPTO_POSTER, COMPANY } from "../lib/brand.js";
import { CertificatePreview, openCertificate } from "./TradingCertificate.jsx";
import { PlatformAPI } from "../lib/api.js";

const YELLOW_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#ffc107] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1a1400] shadow-[0_0_28px_rgba(255,193,7,0.45)] transition hover:bg-[#ffd54f]";

export function AboutPage({ onCta, onSupport, ctaLabel = "Open an account" }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#ffc107]/20 px-5 py-12 sm:px-10">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-black/75"
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <BrandLogo className="mb-4 justify-center" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About us</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Binomo is a professional seconds trading terminal — live charts,
            invite-gated accounts, verified deposits, Copy AI Bot locks, and
            24/7 Live Chat support. We built a desk that feels like an app on
            every screen, with admin-backed payouts and identity checks.
          </p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: "Live markets", body: "BTC, ETH, SOL and 500+ pairs with streaming prices and a real chart desk." },
          { title: "Verified funds", body: "Merchant deposit rails, screenshot proofs in Live Chat, admin-reviewed withdrawals." },
          { title: "Human support", body: "Talk to your desk in Live Chat — receipts, KYC, and VIP requests in one thread." },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-[#ffc107]/15 bg-black/40 p-5">
            <h3 className="font-bold text-[#ffc107]">{c.title}</h3>
            <p className="mt-2 text-sm text-white/55">{c.body}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="text-center">
          <h2 className="text-xl font-extrabold">Official certificate</h2>
          <p className="mt-1 text-sm text-white/55">
            Click the document to open and verify the full authorization.
          </p>
        </div>
        <CertificatePreview onOpen={openCertificate} />
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onCta} className={YELLOW_BTN}>
          {ctaLabel}
        </button>
        {onSupport && (
          <button
            type="button"
            onClick={onSupport}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#ffc107]/40 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#ffc107] hover:bg-[#ffc107]/10"
          >
            <MessageCircle className="h-4 w-4" />
            Ask Live Chat
          </button>
        )}
      </div>
    </div>
  );
}

export function ContactPage({ onSupport, ctaLabel = "Contact support" }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#ffc107]/20 px-5 py-12 sm:px-10">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-black/78"
        />
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <Headphones className="mx-auto h-10 w-10 text-[#ffc107]" />
          <h1 className="mt-3 text-3xl font-extrabold">Contact support</h1>
          <p className="mt-3 text-sm text-white/70">
            Questions, deposits, or VIP — open Live Chat and pick Information
            to ask the desk. After a transfer, send the receipt screenshot in
            the same thread.
          </p>
          <button type="button" onClick={onSupport} className={`${YELLOW_BTN} mt-6`}>
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
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ffc107]" />
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
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#ffc107] hover:underline"
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
                className="rounded-xl border border-[#ffc107]/25 px-4 py-2 text-sm font-semibold text-[#ffc107] hover:bg-[#ffc107]/10"
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
      <section className="relative overflow-hidden rounded-3xl border border-[#ffc107]/35 px-5 py-12 shadow-[0_0_50px_rgba(255,193,7,0.12)] sm:px-10">
        <VideoBackdrop
          src={CRYPTO_VIDEO}
          poster={CRYPTO_POSTER}
          overlayClassName="bg-gradient-to-r from-black via-black/82 to-black/50"
        />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc107]/40 bg-[#ffc107]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffc107]">
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
                  <div className="mt-1 text-lg font-extrabold text-[#ffc107]">
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
                    className="h-full rounded-full bg-gradient-to-r from-[#ffc107] to-cyan-400"
                    style={{
                      width: `${Math.round((Number(progress.progress) || 0) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {isVip ? (
                <button type="button" onClick={onCta} className={YELLOW_BTN}>
                  Open Trade desk
                </button>
              ) : (
                <button type="button" onClick={onSupport} className={YELLOW_BTN}>
                  Request lounge VIP
                </button>
              )}
              {onReferral ? (
                <button
                  type="button"
                  onClick={onReferral}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#ffc107]/40 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#ffc107] hover:bg-[#ffc107]/10"
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
        <div className="rounded-2xl border border-[#ffc107]/20 bg-black/45 p-5">
          <h3 className="flex items-center gap-2 font-bold text-[#ffc107]">
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
                    ? "border-[#ffc107]/45 bg-[#ffc107]/12"
                    : "border-white/10 bg-black/35"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-[#ffc107]">
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
                        ? "bg-[#ffc107]/12 text-white"
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
            className="rounded-2xl border border-[#ffc107]/20 bg-black/45 p-6 text-center"
          >
            <Icon className="mx-auto h-8 w-8 text-[#ffc107]" />
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-2 text-sm text-white/55">{body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
        <h3 className="flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 text-[#ffc107]" />
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
