import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

const PRICES = [0.917, 0.9165, 0.916, 0.9155, 0.915, 0.9145, 0.914, 0.9135, 0.913];
const EXPECTED = 0.9145;
const SLIPPED = 0.915;

function fmt(n) {
  return n.toFixed(4);
}

function usePingPong(active, speed = 0.0018) {
  const [t, setT] = useState(0.18);
  const dir = useRef(1);
  useEffect(() => {
    if (active) return undefined;
    let id;
    const tick = () => {
      setT((prev) => {
        let next = prev + dir.current * 0.012;
        if (next >= 1) {
          next = 1;
          dir.current = -1;
        } else if (next <= 0) {
          next = 0;
          dir.current = 1;
        }
        return next;
      });
    };
    id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [active, speed]);
  return [t, setT];
}

function Ladder({
  prices,
  label,
  labelClass,
  mode,
  t,
}) {
  const slipAmt = Math.round(t * 5);
  return (
    <div className="relative min-w-[148px] flex-1">
      <div className="space-y-1.5 font-mono text-[13px] sm:text-sm">
        {prices.map((p) => {
          const isExpected = p === EXPECTED;
          const isSlipped = p === SLIPPED;
          const fastFill = mode === "fast" && isExpected;
          const fastTarget = mode === "fast" && isSlipped;
          const slowExpected = mode === "slow" && isExpected;
          const slowSlip = mode === "slow" && isSlipped && t > 0.28;
          return (
            <div key={p} className="relative flex h-8 items-center justify-center">
              {fastFill && (
                <div
                  className="absolute right-full mr-2 flex items-center gap-1.5 whitespace-nowrap"
                  style={{ opacity: 1 - t * 0.35 }}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#39FF14] text-black">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="rounded-full bg-[#39FF14] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                    Filled
                  </span>
                  <span className="text-[#39FF14]">→</span>
                </div>
              )}
              <span
                className={`rounded-md px-3 py-1 tabular-nums ${
                  fastFill
                    ? "bg-[#39FF14] font-bold text-black"
                    : fastTarget
                      ? "border border-[#39FF14] text-white"
                      : slowExpected
                        ? "border border-sky-500/80 bg-sky-950/40 text-sky-300"
                        : slowSlip
                          ? "border border-red-500 bg-red-950/50 font-bold text-red-400"
                          : "text-white/45"
                }`}
              >
                {fmt(p)}
              </span>
              {slowExpected && (
                <span className="absolute left-full ml-2 text-[10px] font-bold uppercase tracking-wide text-sky-400">
                  Expected
                </span>
              )}
              {slowSlip && (
                <span
                  className="absolute left-full ml-2 whitespace-nowrap text-[11px] font-bold text-red-400"
                  style={{ opacity: Math.min(1, (t - 0.28) / 0.4) }}
                >
                  ← +{Math.max(1, slipAmt)} slipped
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className={`mt-5 text-center text-sm font-extrabold ${labelClass}`}>{label}</div>
    </div>
  );
}

export default function FillExpectSection() {
  const boxRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [cursor, setCursor] = useState({ x: 180, y: 140 });
  const [t, setT] = usePingPong(!hover);

  const onMove = (e) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setCursor({ x, y });
    setT(Math.min(1, Math.max(0, x / r.width)));
  };

  const fastShift = (0.5 - t) * 18;
  const slowShift = (t - 0.5) * 18;

  return (
    <section className="bg-black py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase leading-[1.08] tracking-tight sm:text-5xl">
            Get filled on the
            <br />
            <span className="text-[#39FF14]">price you expect.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            Latency slippage can turn a winning strategy into a losing one. Put an end to
            this with rapid execution times only with equiti.
          </p>
        </div>

        <div
          ref={boxRef}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseMove={onMove}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (!touch) return;
            onMove(touch);
          }}
          className="relative cursor-none overflow-visible rounded-xl border border-white/10 bg-black/40 px-4 py-8 sm:px-10"
        >
          <div className="flex items-start justify-center gap-8 overflow-x-auto pb-2 pl-24 pr-28 sm:gap-16">
            <div
              className="transition-transform duration-150"
              style={{
                transform: `translateX(${fastShift}px) scale(${1.02 - t * 0.06})`,
                opacity: 1 - t * 0.18,
              }}
            >
              <Ladder prices={PRICES} label="Fast Trades" labelClass="text-[#39FF14]" mode="fast" t={t} />
            </div>
            <div
              className="transition-transform duration-150"
              style={{
                transform: `translateX(${slowShift}px) scale(${0.96 + t * 0.06})`,
                opacity: 0.72 + t * 0.28,
              }}
            >
              <Ladder prices={PRICES} label="Slow Trades" labelClass="text-white" mode="slow" t={t} />
            </div>
          </div>

          <div
            className="pointer-events-none absolute z-20 hidden sm:block"
            style={{ left: cursor.x, top: cursor.y, transform: "translate(-2px, -2px)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#39FF14" aria-hidden>
              <path d="M4 3.2 20 12.2 12.6 14.1 10.4 21.5 4 3.2z" />
            </svg>
            <span className="ml-4 mt-1 inline-block rounded bg-[#39FF14] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
              {t < 0.5 ? "Fill" : "Slip"}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(t * 100)}
            onChange={(e) => {
              setHover(true);
              setT(Number(e.target.value) / 100);
            }}
            className="mt-8 w-full accent-[#39FF14] sm:hidden"
            aria-label="Move between fast and slow fills"
          />
        </div>
      </div>
    </section>
  );
}
