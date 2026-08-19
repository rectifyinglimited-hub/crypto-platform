/**
 * Landing infra: platform logos, live desks, broker wordmarks, shield, browser desk.
 */

import NeonLiveGraph from "./NeonLiveGraph.jsx";
import LiveMarketDesks from "./LiveMarketDesks.jsx";
import FillExpectSection from "./FillExpectSection.jsx";
import SecurityShield from "./SecurityShield.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const LIME = "#39FF14";

const CITIES = [
  { x: 16, y: 44, label: "Los Angeles" },
  { x: 23, y: 38, label: "Chicago" },
  { x: 28, y: 40, label: "New York" },
  { x: 27, y: 44, label: "Washington DC" },
  { x: 26, y: 50, label: "Miami" },
  { x: 26, y: 34, label: "Toronto" },
  { x: 33, y: 70, label: "Sao Paulo" },
  { x: 47, y: 34, label: "London" },
  { x: 49, y: 38, label: "Paris" },
  { x: 50, y: 32, label: "Amsterdam" },
  { x: 51, y: 37, label: "Zurich" },
  { x: 52, y: 35, label: "Frankfurt" },
  { x: 54, y: 72, label: "Johannesburg" },
  { x: 61, y: 48, label: "Dubai" },
  { x: 68, y: 50, label: "Mumbai" },
  { x: 76, y: 58, label: "Singapore" },
  { x: 78, y: 47, label: "Hong Kong" },
  { x: 82, y: 41, label: "Seoul" },
  { x: 86, y: 40, label: "Tokyo" },
  { x: 88, y: 72, label: "Sydney" },
];


function RadialBack({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden bg-black ${className}`}>
      <div className="eq-fan pointer-events-none absolute inset-0" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function Marquee({ items, reverse = false, gap = "gap-16", children }) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-black to-transparent" />
      <div className={`eq-marquee flex w-max items-center ${gap} py-6 ${reverse ? "eq-marquee-rev" : ""}`}>
        {row.map((item, i) => (
          <div key={`${item.id || i}-${i}`} className="shrink-0">
            {children(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function landDots() {
  const blobs = [
    { x: 21, y: 40, rx: 13, ry: 10 },
    { x: 32, y: 66, rx: 8, ry: 11 },
    { x: 48, y: 35, rx: 10, ry: 8 },
    { x: 53, y: 54, rx: 9, ry: 13 },
    { x: 72, y: 42, rx: 20, ry: 13 },
    { x: 86, y: 70, rx: 8, ry: 5.5 },
  ];
  const dots = [];
  for (let x = 5; x < 97; x += 1.15) {
    for (let y = 18; y < 82; y += 1.15) {
      const hit = blobs.some((b) => {
        const nx = (x - b.x) / b.rx;
        const ny = (y - b.y) / b.ry;
        return nx * nx + ny * ny < 1;
      });
      if (hit) dots.push([x, y]);
    }
  }
  return dots;
}

const DOTS = landDots();

export function DataCentresMap() {
  return (
    <RadialBack className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight sm:text-[2.4rem]">
          Trade inside key <span className="text-[#39FF14]">financial data centres</span>
        </h2>
        <p className="mt-3 text-sm text-white/70">
          We’re situated in 20 critical financial desks around the world.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-[#39FF14] text-[10px] uppercase">
            You
          </span>
          <span className="h-px w-24 bg-[#39FF14] eq-ping-line" />
          <span className="text-white/80">~ 0 – 3 millisecond</span>
          <span className="h-px w-24 bg-[#39FF14] eq-ping-line" />
          <span className="font-extrabold tracking-widest text-[#39FF14]">equiti</span>
        </div>
      </div>
      <div className="relative mx-auto mt-8 max-w-[1180px] px-1 sm:px-6">
        <svg viewBox="0 0 100 86" className="h-auto w-full">
          {DOTS.map(([x, y], i) => {
            const near = CITIES.some((c) => Math.hypot(c.x - x, c.y - y) < 4.2);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={near ? 0.48 : 0.32}
                fill={near ? LIME : "#2a2a2a"}
              />
            );
          })}
          {CITIES.map((c) => (
            <circle key={c.label} cx={c.x} cy={c.y} r="0.55" fill={LIME}>
              <animate attributeName="opacity" values="1;0.25;1" dur="2.2s" repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
        {CITIES.map((c) => (
          <div
            key={c.label}
            className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-full rounded-[2px] border border-[#39FF14] bg-black px-1.5 py-0.5 text-[8px] font-semibold leading-none text-white sm:block"
            style={{ left: `${c.x}%`, top: `${(c.y / 86) * 100}%` }}
          >
            {c.label}
          </div>
        ))}
      </div>
    </RadialBack>
  );
}

export function PlatformsStrip() {
  return (
    <RadialBack className="py-16 sm:py-20">
      <h2 className="px-4 text-center text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">
        <span className="text-white">Optimised for </span>
        <span className="text-[#39FF14]">all trading platforms</span>
      </h2>
      <div className="mt-10">
        <Marquee items={PLATFORM_MARKS} gap="gap-16">
          {(p) => p.node}
        </Marquee>
      </div>
    </RadialBack>
  );
}

export function PartnersWorldwide() {
  return (
    <RadialBack className="py-16 sm:py-20">
      <h2 className="px-4 text-center text-xl font-extrabold uppercase tracking-tight sm:text-3xl">
        Supported by
        <br />
        <span className="text-[#39FF14]">brokers & partners worldwide</span>
      </h2>
      <div className="mt-10">
        <Marquee items={BROKER_MARKS} reverse gap="gap-16">
          {(p) => p.node}
        </Marquee>
      </div>
    </RadialBack>
  );
}

export function TripleDeskSection() {
  return (
    <section className="bg-black py-16 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
          Live desks <span className="text-[#39FF14]">on every screen</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/60">
          Three live books on desktop. One focused chart on mobile. Same candles, same feed.
        </p>
        <div className="mt-8">
          <ErrorBoundary fallback={<div className="h-48 rounded-xl border border-white/10 bg-black" />}>
            <LiveMarketDesks height={240} transparent />
          </ErrorBoundary>
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/65">
          Charts stay in the browser so you can read ETH, XRP, and SOL without a second
          terminal. After the desks, the rails traders already know — platforms and
          partners — sit in the same black-and-lime frame.
        </p>
      </div>
    </section>
  );
}

export function CyberSecuritySection() {
  return (
    <RadialBack className="py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <SecurityShield />
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase leading-[1.08] tracking-tight sm:text-5xl">
            Cutting-edge
            <br />
            <span className="text-[#39FF14]">cyber security</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
            Real-time monitoring and anti-DDoS solution Shield protects your service
            from volumetric and L4 protocol-based attacks.
          </p>
        </div>
      </div>
    </RadialBack>
  );
}

export function BrowserDeskSection({ symbol = "XRP" }) {
  return (
    <RadialBack className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#39FF14] bg-black p-3 shadow-[0_0_40px_rgba(57,255,20,0.12)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-sm font-bold">
              Your desk <span className="text-[#39FF14]">running 24/7</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">equiti</span>
          </div>
          <ErrorBoundary fallback={<div className="h-64 rounded-xl border border-[#39FF14]/30 bg-black" />}>
            <NeonLiveGraph symbol={symbol} height={260} transparent />
          </ErrorBoundary>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
            <span className="text-[#39FF14]">Control your desk</span>
            <br />
            in your browser.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Open charts, lock Copy AI Bot, deposit and withdraw from any device.
            No extra terminal — equiti stays live in the browser.
          </p>
        </div>
      </div>
    </RadialBack>
  );
}

export function EquitiFaq({ items, openFaq, setOpenFaq }) {
  return (
    <section className="bg-black py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">
          Have some <span className="text-[#39FF14]">questions?</span>
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => {
            const open = openFaq === i;
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => setOpenFaq(open ? -1 : i)}
                className="rounded-lg border border-[#39FF14] px-4 py-4 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{item.q}</span>
                  <span className={`text-[#39FF14] transition ${open ? "rotate-180" : ""}`}>▾</span>
                </div>
                {open && <p className="mt-3 text-sm leading-relaxed text-white/60">{item.a}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ForexStyleShowcase({ includeDesk = true }) {
  return (
    <>
      <PlatformsStrip />
      <TripleDeskSection />
      <FillExpectSection />
      <PartnersWorldwide />
      {includeDesk ? <BrowserDeskSection /> : null}
      <CyberSecuritySection />
    </>
  );
}

export default ForexStyleShowcase;

export function TrustedPartnersMarquee() {
  return <PartnersWorldwide />;
}

export function LiveInfraStage() {
  return (
    <>
      <TripleDeskSection />
      <BrowserDeskSection symbol="SOL" />
    </>
  );
}
