import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SLIDES = [
  { src: "/bg/hero-exchange.jpg", pos: "center", label: "Exchange floor" },
  { src: "/bg/data-network.jpg", pos: "center", label: "Global network" },
  { src: "/bg/crypto-glow.jpg", pos: "center 30%", label: "Neon desk" },
  { src: "/bg/charts-desk.jpg", pos: "center", label: "Live candles" },
  { src: "/bg/auth-city.jpg", pos: "center 20%", label: "City night" },
];

export default function HeroMediaSlider({ intervalMs = 4800 }) {
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
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.05, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: slide.pos, filter: "saturate(0.75) contrast(1.08)" }}
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/78" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/35" />
      <div className="eq-radial absolute inset-0 opacity-40" />
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 pointer-events-auto">
        {SLIDES.map((s, idx) => (
          <button
            key={s.src}
            type="button"
            aria-label={s.label}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition ${
              idx === i ? "w-6 bg-[#C8FF00]" : "w-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
