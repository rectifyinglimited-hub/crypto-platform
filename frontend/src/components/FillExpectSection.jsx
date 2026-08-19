import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

const STEP = 0.0005;
const VISIBLE = 9;
const TAPE = 80;
const MID = Math.floor(VISIBLE / 2);
const BASE = 0.9145;

function fmt(n) {
  return n.toFixed(4);
}

function tapePrice(i) {
  return BASE + (TAPE / 2 - i) * STEP;
}

const TAPE_PRICES = Array.from({ length: TAPE }, (_, i) => tapePrice(i));

function PriceRow({ p, kind }) {
  const styles = {
    dim: "text-white/45",
    filled: "border border-[#39FF14] font-bold text-[#39FF14]",
    target: "text-white/70",
    expected: "rounded-md bg-[#1d4ed8] px-3 py-1 font-semibold text-[#93c5fd]",
    slipped: "border border-red-500 font-semibold text-red-400",
  };
  return (
    <div className="relative flex h-9 items-center justify-center">
      {kind === "filled" && (
        <div className="absolute right-full mr-2 flex items-center gap-1.5 whitespace-nowrap">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#39FF14] text-black">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wide text-[#39FF14]">
            Filled
          </span>
          <span className="text-[#39FF14]">→</span>
        </div>
      )}
      <span className={`rounded-md px-3 py-1 tabular-nums ${styles[kind] || styles.dim}`}>
        {fmt(p)}
      </span>
      {kind === "expected" && (
        <span className="absolute left-full ml-2 text-[11px] font-bold text-[#60a5fa]">
          Expected
        </span>
      )}
      {kind === "slipped" && (
        <span className="absolute left-full ml-2 whitespace-nowrap text-[11px] font-bold text-red-400">
          ← +5 Slipped
        </span>
      )}
    </div>
  );
}

function kindFor(mode, visIndex) {
  if (mode === "fast") {
    if (visIndex === MID) return "filled";
    if (visIndex === MID - 1) return "target";
    return "dim";
  }
  if (visIndex === MID) return "expected";
  if (visIndex === MID + 1) return "slipped";
  return "dim";
}

function Ladder({ mode, offset }) {
  const start = Math.max(0, Math.min(TAPE - VISIBLE, offset));
  const slice = TAPE_PRICES.slice(start, start + VISIBLE);
  return (
    <div className="relative h-[324px] overflow-hidden">
      {slice.map((p, visIndex) => (
        <PriceRow key={`${mode}-${p.toFixed(4)}`} p={p} kind={kindFor(mode, visIndex)} />
      ))}
    </div>
  );
}

export default function FillExpectSection() {
  const [offset, setOffset] = useState(Math.floor((TAPE - VISIBLE) / 2));
  const lastY = useRef(null);
  const acc = useRef(0);
  const stageRef = useRef(null);

  const nudge = useCallback((dir, steps) => {
    setOffset((o) => Math.max(0, Math.min(TAPE - VISIBLE, o + dir * steps)));
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const steps = Math.abs(e.deltaY) > 40 ? 3 : 2;
      nudge(e.deltaY > 0 ? 1 : -1, steps);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [nudge]);

  const onMove = (e) => {
    if (lastY.current == null) {
      lastY.current = e.clientY;
      return;
    }
    const dy = e.clientY - lastY.current;
    lastY.current = e.clientY;
    acc.current += dy;
    if (Math.abs(acc.current) < 10) return;
    const steps = Math.abs(acc.current) > 22 ? 3 : 2;
    nudge(acc.current > 0 ? 1 : -1, steps);
    acc.current = 0;
  };

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
          ref={stageRef}
          className="cursor-ns-resize select-none overflow-x-auto px-2 py-4 sm:px-6"
          onMouseMove={onMove}
          onMouseLeave={() => {
            lastY.current = null;
            acc.current = 0;
          }}
        >
          <div className="flex min-w-[540px] items-start justify-center gap-16 sm:gap-24">
            <div>
              <Ladder mode="fast" offset={offset} />
              <div className="mt-5 text-center text-sm font-extrabold">
                <span className="text-[#39FF14]">Fast</span> <span className="text-white">Trades</span>
              </div>
            </div>
            <div className="pt-4">
              <Ladder mode="slow" offset={offset} />
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
