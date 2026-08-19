import { MapPin, Mail, MessageCircle } from "lucide-react";
import { SOCIAL_LINKS, BRAND, COMPANY } from "../lib/brand.js";
import BrandLogo from "./BrandLogo.jsx";
import { openCertificate } from "./TradingCertificate.jsx";

function FacebookIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.2h2.4l.36-2.76h-2.76V9.24c0-.8.22-1.34 1.37-1.34H16.5V5.43A18.9 18.9 0 0 0 14.2 5.2c-2.3 0-3.87 1.4-3.87 4v1.84H8.1v2.76h2.23V21h3.17Z" />
    </svg>
  );
}
function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YoutubeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2.1 12a28 28 0 0 0 .3 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 21.9 12a28 28 0 0 0-.3-4.8ZM10 15.2V8.8L15.2 12 10 15.2Z" />
    </svg>
  );
}

const ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
};

export default function SiteFooter({ onNavigate, onOpenChat }) {
  const go = (id) => onNavigate?.(id);
  const openSupport = () => {
    if (onOpenChat) onOpenChat("info");
    else go("contact");
  };

  return (
    <footer className="mt-8 border-t border-[#00D4C4]/15 bg-[#05070c] py-12">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 sm:grid-cols-4 sm:px-6">
        <div>
          <BrandLogo />
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Digital trading terminal. Invite-gated accounts. Trade · Deposit ·
            Withdraw · Copy AI Bot.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {SOCIAL_LINKS.map((s) => {
              const Icon = ICONS[s.id];
              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  title={s.label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[#00D4C4]/25 bg-white/5 text-[#00D4C4] transition hover:bg-[#00D4C4] hover:text-black hover:shadow-[0_0_18px_rgba(0, 212, 196,0.55)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Company
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            <li>
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("about")}>
                About us
              </button>
            </li>
            <li>
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("referral")}>
                Referral
              </button>
            </li>
            <li>
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("vip")}>
                VIP
              </button>
            </li>
            <li>
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("certificate")}>
                Certificate
              </button>
            </li>
            <li>
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("contact")}>
                Contact support
              </button>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Contacts
          </div>
          <a
            href={`mailto:${COMPANY.email}`}
            className="mt-3 flex items-center gap-2 text-sm text-white/80 hover:text-[#00D4C4]"
          >
            <Mail className="h-3.5 w-3.5 text-[#00D4C4]" />
            {COMPANY.email}
          </a>
          <div className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/70">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00D4C4]" />
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
          <button
            type="button"
            onClick={openSupport}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#00D4C4] underline underline-offset-2"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Open Live Chat
          </button>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            Legal
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Trading involves substantial risk of loss. Past performance is not a
            guarantee of future results. Register only with a valid invitation
            code.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) go("certificate");
              else openCertificate();
            }}
            className="mt-4 w-full overflow-hidden rounded-lg border border-[#00D4C4]/30 text-left hover:border-[#00D4C4]"
          >
            <div className="bg-white px-2 py-2">
              <div className="text-[10px] font-extrabold tracking-tight text-black">
                EQUITI
              </div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-600">
                Business Authorization Certificate
              </div>
              <div className="mt-1 text-[8px] text-neutral-500">
                {COMPANY.legalName} · {COMPANY.companyNo}
              </div>
            </div>
            <div className="bg-[#0b0e11] px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#00D4C4]">
              Click to verify
            </div>
          </button>
        </div>
      </div>
      <p className="mt-8 text-center text-[11px] text-white/30">
        © {COMPANY.copyrightFrom} - {COMPANY.copyrightTo} {BRAND.name}. All rights
        reserved
      </p>
    </footer>
  );
}
