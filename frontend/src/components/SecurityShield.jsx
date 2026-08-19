/** Metallic radar shield — chrome rim, lime core, rings, swinging threats badge. */

import { useId } from "react";

export default function SecurityShield({ className = "" }) {
  const uid = useId().replace(/:/g, "");
  const metal = `eq-metal-${uid}`;
  const edge = `eq-edge-${uid}`;
  const glow = `eq-glow-${uid}`;
  const crest = `eq-crest-${uid}`;
  const shine = `eq-shine-${uid}`;

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[400px] ${className}`}>
      <div className="pointer-events-none absolute inset-[6%] rounded-full border border-[#39FF14]/30" />
      <div className="pointer-events-none absolute inset-[16%] rounded-full border border-[#39FF14]/50" />
      <div className="pointer-events-none absolute inset-[26%] rounded-full border border-[#39FF14]/22" />

      <div className="pointer-events-none absolute inset-[16%]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 45}deg)` }}>
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39FF14] shadow-[0_0_12px_#39FF14]" />
          </div>
        ))}
      </div>

      <div className="eq-threat-orbit pointer-events-none absolute inset-[6%] z-20">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="eq-threat-keep">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#5a1010]/92 text-center shadow-[0_0_24px_rgba(220,30,30,0.5)] ring-1 ring-red-500/70">
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
        className="pointer-events-none absolute left-1/2 top-[48%] z-10 h-[46%] w-[38%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <defs>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={metal} x1="8%" y1="0%" x2="95%" y2="100%">
            <stop offset="0%" stopColor="#f2f2f2" />
            <stop offset="22%" stopColor="#8d8d8d" />
            <stop offset="48%" stopColor="#2c2c2c" />
            <stop offset="68%" stopColor="#cfcfcf" />
            <stop offset="100%" stopColor="#3a3a3a" />
          </linearGradient>
          <linearGradient id={shine} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={edge} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#eaff9a" />
            <stop offset="50%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#146600" />
          </linearGradient>
          <linearGradient id={crest} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#c8ff4a" />
            <stop offset="55%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1a7a00" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="228" rx="38" ry="5" fill="#39FF14" opacity="0.28" />
        <path
          d="M100 14 C100 14 176 36 176 36 L176 108 C176 160 138 200 100 222 C62 200 24 160 24 108 L24 36 C24 36 100 14 100 14Z"
          fill="none"
          stroke={`url(#${edge})`}
          strokeWidth="8"
          filter={`url(#${glow})`}
        />
        <path
          d="M100 20 C100 20 168 40 168 40 L168 108 C168 156 134 194 100 214 C66 194 32 156 32 108 L32 40 C32 40 100 20 100 20Z"
          fill={`url(#${metal})`}
        />
        <path
          d="M70 48 L130 48"
          stroke={`url(#${shine})`}
          strokeWidth="6"
          opacity="0.35"
        />
        <path
          d="M100 38 C100 38 150 54 150 54 L150 108 C150 146 124 178 100 194 C76 178 50 146 50 108 L50 54 C50 54 100 38 100 38Z"
          fill="#050505"
        />
        <path
          d="M100 50 C100 50 138 64 138 64 L138 108 C138 138 118 164 100 176 C82 164 62 138 62 108 L62 64 C62 64 100 50 100 50Z"
          fill={`url(#${crest})`}
        />
        <path d="M100 78 L122 128 H108.5 L100 112 L91.5 128 H78 Z" fill="#141414" />
      </svg>
    </div>
  );
}
