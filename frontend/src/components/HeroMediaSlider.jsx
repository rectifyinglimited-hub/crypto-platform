import { useEffect, useRef, useState } from "react";

const DESKTOP_SLIDES = [
  { type: "video", src: "/bg/hero-crypto.mp4" },
  { type: "img", src: "/bg/trader-desk.png" },
  { type: "img", src: "/bg/charts-desk.jpg" },
  { type: "img", src: "/bg/hero-exchange.jpg" },
  { type: "img", src: "/bg/crypto-glow.jpg" },
  { type: "img", src: "/bg/data-network.jpg" },
];

const MOBILE_SLIDES = [
  { type: "img", src: "/bg/crypto-glow.jpg" },
  { type: "img", src: "/bg/charts-desk.jpg" },
  { type: "img", src: "/bg/hero-exchange.jpg" },
];

const HOLD_MS = 6500;

function isMobileViewport() {
  try {
    return window.matchMedia("(max-width: 768px)").matches;
  } catch {
    return false;
  }
}

export default function HeroMediaSlider() {
  const slides = isMobileViewport() ? MOBILE_SLIDES : DESKTOP_SLIDES;
  const [i, setI] = useState(0);
  const videoRef = useRef(null);
  const dir = useRef(1);

  useEffect(() => {
    const id = setInterval(() => {
      setI((n) => {
        let next = n + dir.current;
        if (next >= slides.length) {
          dir.current = -1;
          next = Math.max(0, slides.length - 2);
        } else if (next < 0) {
          dir.current = 1;
          next = Math.min(1, slides.length - 1);
        }
        return next;
      });
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[i] || slides[0];

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }, [slide]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {slide?.type === "video" ? (
        <video
          ref={videoRef}
          key={slide.src}
          src={slide.src}
          className="eq-hero-slide absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster="/bg/crypto-glow.jpg"
        />
      ) : (
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          className="eq-hero-slide eq-hero-ken absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
    </div>
  );
}
