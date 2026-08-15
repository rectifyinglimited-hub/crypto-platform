/**
 * Live BTC / ETH / SOL desks — 3 on desktop, 2 on tablet, 1 on phone.
 */
import { useEffect, useState } from "react";
import NeonLiveGraph from "./NeonLiveGraph.jsx";

const DESKS = ["BTC", "ETH", "SOL"];

function desksForWidth(w) {
  if (w < 768) return 1;
  if (w < 1280) return 2;
  return 3;
}

function useDeskCount() {
  const [count, setCount] = useState(() =>
    typeof window === "undefined" ? 3 : desksForWidth(window.innerWidth)
  );

  useEffect(() => {
    const apply = () => {
      const next = desksForWidth(window.innerWidth);
      setCount((prev) => (prev === next ? prev : next));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return count;
}

export default function LiveMarketDesks({ height = 220 }) {
  const count = useDeskCount();
  const cols =
    count === 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={`grid gap-3 ${cols}`}>
      {DESKS.slice(0, count).map((symbol) => (
        <NeonLiveGraph
          key={symbol}
          symbol={symbol}
          height={height}
          compact
        />
      ))}
    </div>
  );
}
