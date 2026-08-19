import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HERO_VIDEO, HERO_POSTER } from "../lib/brand.js";

const SLIDES = [
  { src: "/bg/hero-geometry.png", pos: "center", label: "Geometry" },
  { src: "/bg/servers-neon.png", pos: "center", label: "Servers" },
  { src: "/bg/chart-neon.png", pos: "center", label: "Charts" },
  { src: "/bg/network-dots.png", pos: "center", label: "Network" },
  { src: "/bg/circuit-neon.png", pos: "center", label: "Circuit" },
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
        className="eq-kenburns absolute inset-0 h-full w-full object-cover"
        style={{ filter: "hue-rotate(72deg) saturate(1.35) brightness(0.55) contrast(1.15)" }}
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
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.72, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: slide.pos,
            filter: "saturate(1.15) contrast(1.12) brightness(0.78)",
          }}
        />
      </AnimatePresence>
      <div className="eq-grid eq-grid-move absolute inset-0 opacity-40" />
      <div className="eq-scan pointer-events-none absolute inset-0" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 pointer-events-auto">
        {SLIDES.map((s, idx) => (
          <button
            key={s.src}
            type="button"
            aria-label={s.label}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition ${
              idx === i ? "w-6 bg-[#39FF14]" : "w-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
