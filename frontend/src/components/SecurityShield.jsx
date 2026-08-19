/** Metallic radar shield — chrome rim, lime core, rings, swinging threats badge. */

import { useId } from "react";

export default function SecurityShield({ className = "" }) {
  const uid = useId().replace(/:/g, "");
  const metal = `eq-metal-${uid}`;
  const edge = `eq-edge-${uid}`;
  const glow = `eq-glow-${uid}`;
  const crest = `eq-crest-${uid}`;

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[440px] ${className}`}>
      <div className="eq-fan pointer-events-none absolute inset-[-8%] opacity-80" />

      <div className="pointer-events-none absolute inset-[2%] rounded-full border border-[#39FF14]/35" />
      <div className="pointer-events-none absolute inset-[12%] rounded-full border border-[#39FF14]/55" />
      <div className="pointer-events-none absolute inset-[22%] rounded-full border border-[#39FF14]/25" />

      <div className="pointer-events-none absolute inset-[12%]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 45}deg)` }}>
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39FF14] shadow-[0_0_14px_#39FF14]" />
          </div>
        ))}
      </div>

      <div className="eq-threat-orbit pointer-events-none absolute inset-[2%] z-20">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="eq-threat-keep">
          <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-[#5a1010]/90 text-center shadow-[0_0_28px_rgba(220,30,30,0.55)] ring-1 ring-red-500/70">
            <div>
              <svg viewBox="0 0 64 36" className="mx-auto h-6 w-11" aria-hidden>
                <path
                  fill="#fff"
                  d="M8 16c2-10 14-16 24-16s22 6 24 16c0 4-3 7-8 8l-4 10H20l-4-10c-5-1-8-4-8-8z"
                />
                <ellipse cx="22" cy="16" rx="5" ry="3.2" fill="#5a1010" />
                <ellipse cx="42" cy="16" rx="5" ry="3.2" fill="#5a1010" />
                <path d="M28 24h8l-4 7z" fill="#5a1010" />
              </svg>
              <div className="mt-0.5 text-[10px] font-medium lowercase tracking-wide text-white">
                threats
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <svg
        viewBox="0 0 200 240"
        className="relative z-10 mx-auto mt-[8%] h-[72%] w-[62%] drop-shadow-[0_0_28px_rgba(57,255,20,0.45)]"
        aria-hidden
      >
        <defs>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={metal} x1="12%" y1="0%" x2="92%" y2="100%">
            <stop offset="0%" stopColor="#f4f4f4" />
            <stop offset="18%" stopColor="#9a9a9a" />
            <stop offset="42%" stopColor="#2a2a2a" />
            <stop offset="62%" stopColor="#d8d8d8" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
          <linearGradient id={edge} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#eaff9a" />
            <stop offset="45%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1a6b00" />
          </linearGradient>
          <linearGradient id={crest} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#d8ff6a" />
            <stop offset="55%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1f8a00" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="226" rx="42" ry="6" fill="#39FF14" opacity="0.35" />
        <path
          d="M100 10 C100 10 178 32 178 32 L178 104 C178 158 140 198 100 222 C60 198 22 158 22 104 L22 32 C22 32 100 10 100 10Z"
          fill="none"
          stroke={`url(#${edge})`}
          strokeWidth="7"
          filter={`url(#${glow})`}
        />
        <path
          d="M100 16 C100 16 170 36 170 36 L170 104 C170 154 136 192 100 214 C64 192 30 154 30 104 L30 36 C30 36 100 16 100 16Z"
          fill={`url(#${metal})`}
        />
        <path
          d="M100 34 C100 34 152 50 152 50 L152 104 C152 142 126 174 100 192 C74 174 48 142 48 104 L48 50 C48 50 100 34 100 34Z"
          fill="#0a0a0a"
        />
        <path
          d="M100 48 C100 48 140 62 140 62 L140 106 C140 136 120 162 100 176 C80 162 60 136 60 106 L60 62 C60 62 100 48 100 48Z"
          fill={`url(#${crest})`}
        />
        <path
          d="M100 78 L118 118 H107 L100 104 L93 118 H82 Z"
          fill="#0b0b0b"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
