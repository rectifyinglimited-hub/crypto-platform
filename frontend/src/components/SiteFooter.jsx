import { SOCIAL_LINKS, BRAND } from "../lib/brand.js";
import BrandLogo from "./BrandLogo.jsx";

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

export default function SiteFooter({ onNavigate }) {
  const year = new Date().getFullYear();
  const go = (id) => onNavigate?.(id);

  return (
    <footer className="mt-8 border-t border-[#ffc107]/15 bg-[#05070c] py-12">
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
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[#ffc107]/25 bg-white/5 text-[#ffc107] transition hover:bg-[#ffc107] hover:text-black hover:shadow-[0_0_18px_rgba(255,193,7,0.55)]"
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
              <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => go("vip")}>
                VIP
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
          <p className="mt-3 text-sm text-white/70">
            Live Chat is the fastest way to reach us with deposit receipts.
          </p>
          <button
            type="button"
            onClick={() => go("contact")}
            className="mt-3 text-sm font-semibold text-[#ffc107] underline underline-offset-2"
          >
            Open support
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
        </div>
      </div>
      <p className="mt-8 text-center text-[11px] text-white/30">
        © {year} {BRAND.name}. All rights reserved.
      </p>
    </footer>
  );
}
