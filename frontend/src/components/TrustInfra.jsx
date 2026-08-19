/**
 * Live infra visuals inspired by premium dark-desk sites:
 * scrolling partners, world-map pings, orbit rings, and server racks.
 * Original artwork — not copied photography or pricing.
 */

import { TRUSTED_PARTNERS } from "../lib/brand.js";

const NODES = [
  { id: "ny", x: 26, y: 42, label: "New York" },
  { id: "lon", x: 48, y: 34, label: "London" },
  { id: "dxb", x: 60, y: 48, label: "Dubai" },
  { id: "sg", x: 76, y: 58, label: "Singapore" },
  { id: "tyo", x: 84, y: 40, label: "Tokyo" },
  { id: "syd", x: 88, y: 72, label: "Sydney" },
  { id: "sao", x: 34, y: 70, label: "São Paulo" },
];

export function TrustedPartnersMarquee() {
  const row = [...TRUSTED_PARTNERS, ...TRUSTED_PARTNERS];
  return (
    <section className="overflow-hidden border-y border-[#00D4C4]/15 bg-black/40 py-8">
      <div className="mb-5 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9AFF3C]">
          Supported worldwide
        </div>
        <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Trusted partners</h2>
        <p className="mt-1 text-sm text-white/50">
          Settlement rails and market desks that keep equiti online 24/7.
        </p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#05070c] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#05070c] to-transparent" />
        <div className="eq-marquee flex w-max gap-3">
          {row.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="grid h-16 min-w-[148px] place-items-center rounded-xl border border-white/10 bg-[#0a1210] px-5"
            >
              <span className="text-sm font-extrabold tracking-wide text-white/80">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LiveOrbit() {
  return (
    <div className="relative mx-auto grid h-[280px] w-[280px] place-items-center sm:h-[340px] sm:w-[340px]">
      <div className="eq-spin-slow absolute inset-4 rounded-full border border-dashed border-[#9AFF3C]/35">
        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#9AFF3C] shadow-[0_0_12px_#9AFF3C]" />
        <span className="absolute bottom-2 right-6 h-2 w-2 rounded-full bg-[#00D4C4] shadow-[0_0_10px_#00D4C4]" />
      </div>
      <div className="eq-spin-rev absolute inset-10 rounded-full border border-[#00D4C4]/25">
        <span className="absolute right-4 top-8 h-2 w-2 rounded-full bg-[#9AFF3C]" />
      </div>
      <div className="eq-pulse absolute inset-[72px] rounded-full bg-[#9AFF3C]/10 sm:inset-[88px]" />
      <div className="relative z-10 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9AFF3C]">
          Live mesh
        </div>
        <div className="mt-1 font-display text-2xl font-extrabold text-white">equiti</div>
        <div className="mt-1 text-xs text-white/50">global order flow</div>
      </div>
    </div>
  );
}

export function WorldLatencyMap() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#00D4C4]/20 bg-[#06100c] p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#9AFF3C]">
            Live desks
          </div>
          <h3 className="text-lg font-extrabold">Market nodes worldwide</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9AFF3C]/30 bg-[#9AFF3C]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9AFF3C]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9AFF3C]" />
          live
        </span>
      </div>
      <svg viewBox="0 0 100 86" className="h-auto w-full text-[#9AFF3C]">
        <defs>
          <radialGradient id="eq-sea" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#0b1c14" />
            <stop offset="100%" stopColor="#05070c" />
          </radialGradient>
        </defs>
        <rect width="100" height="86" fill="url(#eq-sea)" rx="4" />
        <g fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.4">
          <path d="M8 28 C18 22, 28 30, 34 24 C42 16, 48 22, 56 20 C66 18, 74 28, 86 24" />
          <path d="M10 48 C22 42, 30 52, 42 46 C54 40, 62 50, 78 44 C86 42, 92 50, 96 48" />
          <path d="M14 62 C26 58, 34 68, 48 62 C60 56, 70 66, 88 60" />
        </g>
        <g fill="#123322" stroke="#9AFF3C" strokeOpacity="0.25" strokeWidth="0.3">
          <ellipse cx="24" cy="40" rx="10" ry="8" />
          <ellipse cx="48" cy="34" rx="9" ry="6" />
          <ellipse cx="62" cy="46" rx="7" ry="5" />
          <ellipse cx="78" cy="42" rx="10" ry="7" />
          <ellipse cx="86" cy="68" rx="6" ry="4" />
          <ellipse cx="34" cy="68" rx="7" ry="5" />
        </g>
        {NODES.map((n, i) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="3.4" fill="#9AFF3C" opacity="0.18">
              <animate
                attributeName="r"
                values="2.2;7;2.2"
                dur={`${2.4 + i * 0.25}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.35;0;0.35"
                dur={`${2.4 + i * 0.25}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx={n.x} cy={n.y} r="1.15" fill="#9AFF3C" />
          </g>
        ))}
        <line x1="26" y1="42" x2="48" y2="34" stroke="#00D4C4" strokeWidth="0.25" strokeDasharray="1 1">
          <animate attributeName="stroke-opacity" values="0.2;0.9;0.2" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="48" y1="34" x2="60" y2="48" stroke="#00D4C4" strokeWidth="0.25" strokeDasharray="1 1">
          <animate attributeName="stroke-opacity" values="0.2;0.9;0.2" dur="3.4s" repeatCount="indefinite" />
        </line>
        <line x1="60" y1="48" x2="76" y2="58" stroke="#00D4C4" strokeWidth="0.25" strokeDasharray="1 1">
          <animate attributeName="stroke-opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />
        </line>
        <line x1="76" y1="58" x2="84" y2="40" stroke="#00D4C4" strokeWidth="0.25" strokeDasharray="1 1">
          <animate attributeName="stroke-opacity" values="0.2;0.9;0.2" dur="3.2s" repeatCount="indefinite" />
        </line>
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {NODES.map((n) => (
          <span
            key={n.id}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/70"
          >
            {n.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ServerRack({ delay = 0 }) {
  return (
    <div className="relative w-[92px] rounded-xl border border-[#00D4C4]/25 bg-[#07140f] p-2 shadow-[0_0_28px_rgba(154,255,60,0.12)] sm:w-[110px]">
      <div className="mb-2 h-1.5 rounded-full bg-[#9AFF3C]/70" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="mb-1.5 flex items-center gap-1.5 rounded-md bg-black/50 px-1.5 py-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#9AFF3C]"
            style={{ animation: `eq-blink 1.4s ease-in-out ${delay + i * 0.18}s infinite` }}
          />
          <span className="h-1 flex-1 rounded-full bg-white/10" />
        </div>
      ))}
      <div className="mt-1 text-center text-[9px] font-bold uppercase tracking-wider text-[#00D4C4]">
        core node
      </div>
    </div>
  );
}

function DeskMonitor() {
  return (
    <div className="w-[160px] sm:w-[200px]">
      <div className="rounded-t-xl border border-[#00D4C4]/30 bg-[#05070c] p-2">
        <svg viewBox="0 0 160 90" className="h-auto w-full">
          <rect width="160" height="90" rx="4" fill="#06140f" />
          <polyline
            fill="none"
            stroke="#9AFF3C"
            strokeWidth="2.2"
            points="8,68 28,54 46,60 68,28 90,40 112,18 132,32 152,12"
          >
            <animate
              attributeName="stroke-opacity"
              values="0.55;1;0.55"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </polyline>
          <polyline
            fill="none"
            stroke="#00D4C4"
            strokeWidth="1.4"
            strokeDasharray="4 3"
            points="8,74 36,70 62,58 88,62 118,44 152,48"
          />
        </svg>
      </div>
      <div className="mx-auto h-3 w-16 rounded-b-md bg-[#123322]" />
      <div className="mx-auto mt-0.5 h-1.5 w-24 rounded-full bg-black/60" />
      <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/50">
        live equity desk
      </div>
    </div>
  );
}

export function LiveInfraStage() {
  return (
    <section className="bg-[#05070c] py-14 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9AFF3C]">
            Always-on infrastructure
          </div>
          <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">
            Desks, servers, and a live world mesh
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/50">
            equiti keeps charts, matching, and support running on dedicated nodes —
            not a home PC. Watch the mesh, racks, and desk pulse in real time.
          </p>
        </div>
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <WorldLatencyMap />
          <div className="flex flex-col items-center gap-8">
            <LiveOrbit />
            <div className="flex flex-wrap items-end justify-center gap-5">
              <ServerRack delay={0} />
              <DeskMonitor />
              <ServerRack delay={0.4} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
