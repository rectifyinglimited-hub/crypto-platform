import { Check } from "lucide-react";

const PRICES = [0.917, 0.9165, 0.916, 0.9155, 0.915, 0.9145, 0.914, 0.9135, 0.913];

function fmt(n) {
  return n.toFixed(4);
}

function PriceRow({ p, kind }) {
  const styles = {
    dim: "text-white/40",
    filled: "bg-[#39FF14] font-bold text-black",
    target: "border border-[#39FF14] text-white",
    expected: "rounded-md bg-[#2f6bff] px-3 py-1 font-semibold text-white",
    slipped: "border border-red-500 text-red-400",
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
        <span className="absolute left-full ml-2 text-[11px] font-bold text-[#4d8dff]">
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

function kindFor(mode, p) {
  if (mode === "fast") {
    if (p === 0.9145) return "filled";
    if (p === 0.915) return "target";
    return "dim";
  }
  if (p === 0.9145) return "expected";
  if (p === 0.915) return "slipped";
  return "dim";
}

export default function FillExpectSection() {
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

        <div className="overflow-x-auto px-2 py-4 sm:px-6">
          <div className="flex min-w-[520px] items-start justify-center gap-16 sm:gap-24">
            <div>
              <div className="font-mono text-sm">
                {PRICES.map((p) => (
                  <PriceRow key={`f-${p}`} p={p} kind={kindFor("fast", p)} />
                ))}
              </div>
              <div className="mt-5 text-center text-sm font-extrabold text-[#39FF14]">
                Fast Trades
              </div>
            </div>
            <div>
              <div className="font-mono text-sm">
                {PRICES.map((p) => (
                  <PriceRow key={`s-${p}`} p={p} kind={kindFor("slow", p)} />
                ))}
              </div>
              <div className="mt-5 text-center text-sm font-extrabold text-red-400">
                Slow Trades
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
