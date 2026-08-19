import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1600&q=70",
    pos: "center 18%",
    label: "Pro trader",
  },
  {
    src: "/bg/hero-exchange.jpg",
    pos: "center",
    label: "Bitcoin desk",
  },
  {
    src: "/bg/charts-desk.jpg",
    pos: "center",
    label: "Live candles",
  },
  {
    src: "/bg/crypto-glow.jpg",
    pos: "center",
    label: "Mobile trade",
  },
  {
    src: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=70",
    pos: "center",
    label: "Stock charts",
  },
  {
    src: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=70",
    pos: "center",
    label: "Crypto markets",
  },
];

export default function HeroMediaSlider({ intervalMs = 4200 }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI((n) => (n + 1) % SLIDES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const slide = SLIDES[i];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.img
          key={slide.src}
          src={slide.src}
          alt=""
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: slide.pos }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070c] via-[#05070c]/86 to-[#05070c]/30" />
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 pointer-events-auto">
        {SLIDES.map((s, idx) => (
          <button
            key={s.src}
            type="button"
            aria-label={s.label}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition ${
              idx === i ? "w-6 bg-[#00D4C4]" : "w-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
