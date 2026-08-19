/**
 * ForexVPS-style showcase: dotted map, scrolling platforms/partners/awards,
 * neon browser desk. Original copy for equiti — no pricing, no copied logos.
 */

import NeonLiveGraph from "./NeonLiveGraph.jsx";

const LIME = "#C8FF00";

const CITIES = [
  { id: "la", x: 18, y: 42, label: "Los Angeles" },
  { id: "chi", x: 24, y: 38, label: "Chicago" },
  { id: "ny", x: 29, y: 40, label: "New York" },
  { id: "dc", x: 28, y: 43, label: "Washington DC" },
  { id: "mia", x: 27, y: 48, label: "Miami" },
  { id: "tor", x: 27, y: 34, label: "Toronto" },
  { id: "sao", x: 34, y: 68, label: "Sao Paulo" },
  { id: "lon", x: 47, y: 34, label: "London" },
  { id: "par", x: 49, y: 37, label: "Paris" },
  { id: "ams", x: 50, y: 33, label: "Amsterdam" },
  { id: "zur", x: 51, y: 38, label: "Zurich" },
  { id: "fra", x: 52, y: 35, label: "Frankfurt" },
  { id: "jnb", x: 54, y: 72, label: "Johannesburg" },
  { id: "dxb", x: 62, y: 48, label: "Dubai" },
  { id: "mum", x: 68, y: 50, label: "Mumbai" },
  { id: "sg", x: 76, y: 58, label: "Singapore" },
  { id: "hk", x: 78, y: 48, label: "Hong Kong" },
  { id: "sel", x: 82, y: 42, label: "Seoul" },
  { id: "tyo", x: 86, y: 40, label: "Tokyo" },
  { id: "syd", x: 88, y: 72, label: "Sydney" },
];

const PLATFORMS = [
  "Seconds Trade",
  "Copy AI Bot",
  "Live Desk",
  "VIP Terminal",
  "Loan Desk",
  "Assets Wallet",
];

const PARTNERS = [
  "VISA",
  "Mastercard",
  "USDT",
  "TRC-20",
  "Ethereum",
  "Solana",
  "SWIFT",
  "SSL Secure",
];

function RadialBack({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden bg-black ${className}`}>
      <div className="eq-radial pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function Marquee({ items, reverse = false, render }) {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />
      <div className={`eq-marquee flex w-max items-center gap-10 py-4 ${reverse ? "eq-marquee-rev" : ""}`}>
        {row.map((item, i) => (
          <div key={`${item}-${i}`} className="shrink-0">
            {render(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function landDots() {
  const blobs = [
    { x: 22, y: 40, rx: 12, ry: 9 },
    { x: 33, y: 64, rx: 7, ry: 10 },
    { x: 48, y: 36, rx: 9, ry: 7 },
    { x: 53, y: 52, rx: 8, ry: 12 },
    { x: 72, y: 42, rx: 18, ry: 12 },
    { x: 86, y: 70, rx: 7, ry: 5 },
  ];
  const dots = [];
  for (let x = 6; x < 96; x += 1.55) {
    for (let y = 20; y < 80; y += 1.55) {
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
    <RadialBack className="py-16 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">
          Trade inside key{" "}
          <span className="text-[#C8FF00]">financial data centres</span>
        </h2>
        <p className="mt-3 text-sm text-white/70 sm:text-base">
          equiti routes live charts and settlement through 20 critical desks around the world.
        </p>
        <div className="mt-2 text-xs font-semibold text-white/80">~ 0 – 3 millisecond</div>
      </div>
      <div className="relative mx-auto mt-8 max-w-[1180px] px-2 sm:px-6">
        <svg viewBox="0 0 100 86" className="h-auto w-full">
          {DOTS.map(([x, y], i) => {
            const near = CITIES.some((c) => Math.hypot(c.x - x, c.y - y) < 3.2);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={near ? 0.55 : 0.38}
                fill={near ? LIME : "#3a3a3a"}
              />
            );
          })}
          {CITIES.map((c) => (
            <g key={c.id}>
              <circle cx={c.x} cy={c.y} r="0.7" fill={LIME}>
                <animate attributeName="r" values="0.55;1.4;0.55" dur="2.6s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </RadialBack>
  );
}

export function PlatformsStrip() {
  return (
    <RadialBack className="py-14 sm:py-16">
      <h2 className="px-4 text-center text-xl font-extrabold uppercase tracking-tight sm:text-3xl">
        Optimised for{" "}
        <span className="text-[#C8FF00]">all trading</span> platforms
      </h2>
      <div className="mt-8">
        <Marquee
          items={PLATFORMS}
          render={(name) => (
            <span className="text-lg font-extrabold tracking-wide text-white sm:text-2xl">
              {name}
            </span>
          )}
        />
      </div>
    </RadialBack>
  );
}

export function PartnersWorldwide() {
  return (
    <RadialBack className="py-14 sm:py-16">
      <h2 className="px-4 text-center text-xl font-extrabold uppercase tracking-tight sm:text-3xl">
        <span className="text-white">Supported by</span>
        <br />
        <span className="text-[#C8FF00]">brokers & partners worldwide</span>
      </h2>
      <div className="mt-8">
        <Marquee
          items={PARTNERS}
          reverse
          render={(name) => (
            <span className="text-base font-extrabold uppercase tracking-[0.18em] text-white sm:text-xl">
              {name}
            </span>
          )}
        />
      </div>
    </RadialBack>
  );
}

export function AwardsStrip() {
  const badges = [
    { tone: "bg-[#5b2d8a]", title: "WINNER", sub: "Best live trading desk" },
    { tone: "bg-[#1d6fd4]", title: "WINNER", sub: "Fastest payout review" },
    { tone: "bg-[#b87333]", title: "SEAL", sub: "Verified KYC custody" },
    { tone: "bg-[#e85d04]", title: "EXCELLENCE", sub: "24/7 support desk" },
  ];
  const row = [...badges, ...badges];
  return (
    <section className="bg-black py-14">
      <h2 className="px-4 text-center text-lg font-extrabold uppercase tracking-tight text-white sm:text-2xl">
        Trusted. Recognised. Award-winning.
      </h2>
      <div className="relative mt-8 overflow-hidden">
        <div className="eq-marquee flex w-max gap-5 px-4">
          {row.map((b, i) => (
            <div
              key={`${b.title}-${i}`}
              className={`flex h-[88px] min-w-[240px] items-center justify-between rounded-lg px-4 ${b.tone}`}
            >
              <div className="text-[10px] font-bold uppercase leading-tight text-white/80">
                equiti
                <br />
                desk awards
              </div>
              <div className="text-right">
                <div className="text-lg font-black uppercase text-white">{b.title}</div>
                <div className="text-[10px] font-semibold uppercase text-white/85">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrowserDeskSection({ symbol = "XRP" }) {
  return (
    <RadialBack className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#C8FF00] bg-black p-3 shadow-[0_0_40px_rgba(200,255,0,0.12)]">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-sm font-bold">
              Your desk <span className="text-[#C8FF00]">running 24/7</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">equiti</span>
          </div>
          <NeonLiveGraph symbol={symbol} height={260} transparent />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
            <span className="text-[#C8FF00]">Control your desk</span>
            <br />
            in your browser.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Open charts, lock Copy AI Bot, deposit and withdraw from any device.
            No extra terminal install — equiti stays live in the browser.
          </p>
        </div>
      </div>
    </RadialBack>
  );
}

/** Combined landing block used on public + home. */
export function ForexStyleShowcase({ includeDesk = true }) {
  return (
    <>
      <PlatformsStrip />
      <PartnersWorldwide />
      <DataCentresMap />
      {includeDesk ? <BrowserDeskSection /> : null}
      <AwardsStrip />
    </>
  );
}

export function TrustedPartnersMarquee() {
  return <PartnersWorldwide />;
}

export function LiveInfraStage() {
  return (
    <>
      <DataCentresMap />
      <BrowserDeskSection symbol="SOL" />
    </>
  );
}
