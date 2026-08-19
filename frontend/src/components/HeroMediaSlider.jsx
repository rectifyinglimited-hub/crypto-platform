import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HERO_VIDEO, HERO_POSTER } from "../lib/brand.js";

const SLIDES = [
  { src: "/bg/hero-exchange.jpg", pos: "center", label: "Exchange floor" },
  { src: "/bg/data-network.jpg", pos: "center", label: "Global network" },
  { src: "/bg/crypto-glow.jpg", pos: "center 30%", label: "Neon desk" },
  { src: "/bg/charts-desk.jpg", pos: "center", label: "Live candles" },
  { src: "/bg/auth-city.jpg", pos: "center 20%", label: "City night" },
];

export default function HeroMediaSlider({ intervalMs = 5200 }) {
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
      <video
        className="eq-kenburns absolute inset-0 h-full w-full object-cover opacity-80"
        autoPlay
        muted
        loop
        playsInline
        poster={HERO_POSTER}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>
      <AnimatePresence mode="sync">
        <motion.img
          key={slide.src}
          src={slide.src}
          alt=""
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 0.42, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover mix-blend-lighten"
          style={{ objectPosition: slide.pos, filter: "saturate(0.85) contrast(1.12)" }}
        />
      </AnimatePresence>
      <div className="eq-grid eq-grid-move absolute inset-0 opacity-50" />
      <div className="eq-scan pointer-events-none absolute inset-0" />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/25" />
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
