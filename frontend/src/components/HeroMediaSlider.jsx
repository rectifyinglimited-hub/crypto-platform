import { useEffect, useRef, useState } from "react";

const SLIDES = [
  { type: "video", src: "/bg/hero-crypto.mp4" },
  { type: "img", src: "/bg/trader-desk.png" },
  { type: "img", src: "/bg/charts-desk.jpg" },
  { type: "img", src: "/bg/hero-exchange.jpg" },
  { type: "img", src: "/bg/crypto-glow.jpg" },
  { type: "img", src: "/bg/data-network.jpg" },
];

const HOLD_MS = 6500;

export default function HeroMediaSlider() {
  const [i, setI] = useState(0);
  const videoRefs = useRef([]);

  const dir = useRef(1);

  useEffect(() => {
    const id = setInterval(() => {
      setI((n) => {
        let next = n + dir.current;
        if (next >= SLIDES.length) {
          dir.current = -1;
          next = SLIDES.length - 2;
        } else if (next < 0) {
          dir.current = 1;
          next = 1;
        }
        return next;
      });
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((el, idx) => {
      if (!el) return;
      if (idx === i) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [i]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {SLIDES.map((slide, idx) => {
        const on = idx === i;
        return (
          <div
            key={slide.src}
            className="eq-hero-slide absolute inset-0"
            style={{ opacity: on ? 1 : 0 }}
          >
            {slide.type === "video" ? (
              <video
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                src={slide.src}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={slide.src}
                alt=""
                className={`h-full w-full object-cover ${on ? "eq-hero-ken" : ""}`}
              />
            )}
          </div>
        );
      })}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
    </div>
  );
}
