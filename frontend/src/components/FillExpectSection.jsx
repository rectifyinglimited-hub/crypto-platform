import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

const STEP = 0.0005;
const ROW = 40;
const VISIBLE = 9;
const TAPE = 90;
const MID = 4;
const BASE = 0.9145;
const TICK_MS = 420;
const STEPS_PER_HOVER = 5;

function fmt(n) {
  return n.toFixed(4);
}

const TAPE_PRICES = Array.from({ length: TAPE }, (_, i) => BASE + (TAPE / 2 - i) * STEP);

function Column({ variant, offset }) {
  return (
    <div className="relative w-[168px]" style={{ height: VISIBLE * ROW }}>
      <div className="relative z-[1] overflow-hidden" style={{ height: VISIBLE * ROW }}>
        <div className="eq-price-tape" style={{ transform: `translateY(${-offset * ROW}px)` }}>
          {TAPE_PRICES.map((raw, i) => {
            const p = variant === "slow" ? raw + STEP : raw;
            const vis = i - offset;
            let color = "text-white/40";
            if (variant === "fast" && vis === MID) color = "font-bold text-[#00C2B3]";
            if (variant === "slow" && vis === MID - 1) color = "font-semibold text-white";
            if (variant === "slow" && vis === MID) color = "font-semibold text-red-400";
            return (
              <div
                key={i}
                className={`flex items-center justify-center text-[15px] tabular-nums ${color}`}
                style={{ height: ROW }}
              >
                {fmt(p)}
              </div>
            );
          })}
        </div>
      </div>

      {variant === "fast" ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-[5px] border border-[#00C2B3]"
            style={{ top: MID * ROW + 5, height: ROW - 10, width: 92 }}
          />
          <div
            className="pointer-events-none absolute right-full z-10 mr-2 flex items-center gap-1.5 whitespace-nowrap"
            style={{ top: MID * ROW, height: ROW }}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#00C2B3] text-black">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide text-[#00C2B3]">
              Filled
            </span>
            <span className="text-[#00C2B3]">→</span>
          </div>
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 rounded-md bg-[#1e40af]"
            style={{ top: (MID - 1) * ROW + 6, height: ROW - 12, width: 92 }}
          />
          <span
            className="pointer-events-none absolute left-full z-10 ml-2 text-[11px] font-bold text-[#60a5fa]"
            style={{ top: (MID - 1) * ROW, height: ROW, lineHeight: `${ROW}px` }}
          >
            Expected
          </span>
          <div
            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-[5px] border border-red-500"
            style={{ top: MID * ROW + 5, height: ROW - 10, width: 92 }}
          />
          <span
            className="pointer-events-none absolute left-full z-10 ml-2 whitespace-nowrap text-[11px] font-bold text-red-400"
            style={{ top: MID * ROW, height: ROW, lineHeight: `${ROW}px` }}
          >
            ← +5 Slipped
          </span>
        </>
      )}
    </div>
  );
}

export default function FillExpectSection() {
  const [offset, setOffset] = useState(Math.floor((TAPE - VISIBLE) / 2));
  const stageRef = useRef(null);
  const zoneRef = useRef("mid");
  const busyRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const play = (dir) => {
    if (busyRef.current) return;
    busyRef.current = true;
    let n = 0;
    timerRef.current = setInterval(() => {
      setOffset((o) => Math.max(0, Math.min(TAPE - VISIBLE, o + dir)));
      n += 1;
      if (n >= STEPS_PER_HOVER) {
        clearInterval(timerRef.current);
        busyRef.current = false;
      }
    }, TICK_MS);
  };

  const onMove = (e) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const zone = y < 0.36 ? "top" : y > 0.64 ? "bot" : "mid";
    if (zone === zoneRef.current) return;
    zoneRef.current = zone;
    if (zone === "top") play(1);
    if (zone === "bot") play(-1);
  };

  return (
    <section className="bg-black py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase leading-[1.08] tracking-tight sm:text-5xl">
            Get filled on the
            <br />
            <span className="text-[#00C2B3]">price you expect.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            Latency slippage can turn a winning strategy into a losing one. Put an end to
            this with rapid execution times only with equiti.
          </p>
        </div>

        <div
          ref={stageRef}
          className="select-none px-2 py-4 sm:px-8"
          onMouseMove={onMove}
          onMouseLeave={() => {
            zoneRef.current = "mid";
          }}
        >
          <div className="flex min-w-[560px] items-start justify-center gap-24">
            <div>
              <Column variant="fast" offset={offset} />
              <div className="mt-5 text-center text-sm font-extrabold">
                <span className="text-[#00C2B3]">Fast</span> <span className="text-white">Trades</span>
              </div>
            </div>
            <div>
              <Column variant="slow" offset={offset} />
              <div className="mt-5 text-center text-sm font-extrabold">
                <span className="text-red-400">Slow</span> <span className="text-white">Trades</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
