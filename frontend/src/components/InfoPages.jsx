import { Headphones, ShieldCheck, Gift, UserRound, Crown, MessageCircle } from "lucide-react";
import VideoBackdrop from "./VideoBackdrop.jsx";
import NeonLiveGraph from "./NeonLiveGraph.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { SOCIAL_LINKS, CRYPTO_VIDEO, CRYPTO_POSTER } from "../lib/brand.js";

const YELLOW_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#ffc107] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-[#1a1400] shadow-[0_0_28px_rgba(255,193,7,0.45)] transition hover:bg-[#ffd54f]";

export function AboutPage({ onCta, ctaLabel = "Open an account" }) {
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

      <div className="text-center">
        <button type="button" onClick={onCta} className={YELLOW_BTN}>
          {ctaLabel}
        </button>
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
            After you transfer funds, send the receipt screenshot in Live Chat.
            Support replies land on the notification bell as well.
          </p>
          <button type="button" onClick={onSupport} className={`${YELLOW_BTN} mt-6`}>
            <MessageCircle className="h-4 w-4" />
            {ctaLabel}
          </button>
        </div>
      </section>

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
  );
}

export function VipPage({ user, onCta, onSupport }) {
  const isVip = Boolean(user?.vipStatus);
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
              {isVip ? "VIP active" : "VIP desk"}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              VIP status, VIP services
            </h1>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              {isVip
                ? "Your account is VIP. Priority Live Chat, personal manager routing, and faster review on verified payouts."
                : "Ask support for VIP. Your administrator grants VIP from Control Room — then this lounge unlocks on your side."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isVip ? (
                <button type="button" onClick={onCta} className={YELLOW_BTN}>
                  Open Trade desk
                </button>
              ) : (
                <button type="button" onClick={onSupport} className={YELLOW_BTN}>
                  Request VIP
                </button>
              )}
            </div>
          </div>
          <NeonLiveGraph symbol="BTC" />
        </div>
      </section>

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
    </div>
  );
}
