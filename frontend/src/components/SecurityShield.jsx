/** ForexVPS-style security radar: metallic shield, orbiting nodes, threats badge. */

export default function SecurityShield({ className = "" }) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[380px] ${className}`}>
      <div className="absolute inset-[6%] rounded-full border border-[#39FF14]/25" />
      <div className="absolute inset-[16%] rounded-full border border-[#39FF14]/40" />

      <div className="eq-spin-slow absolute inset-[6%]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 45}deg)` }}>
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39FF14] shadow-[0_0_12px_#39FF14]" />
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 200 220"
        className="eq-pulse relative z-10 mx-auto mt-[12%] h-[62%] w-[62%] drop-shadow-[0_0_28px_rgba(57,255,20,0.55)]"
        aria-hidden
      >
        <defs>
          <linearGradient id="eq-shield-metal" x1="20%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="35%" stopColor="#8d8d8d" />
            <stop offset="55%" stopColor="#1c1c1c" />
            <stop offset="100%" stopColor="#4a4a4a" />
          </linearGradient>
          <linearGradient id="eq-shield-edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b6ff7a" />
            <stop offset="50%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1f8a00" />
          </linearGradient>
          <linearGradient id="eq-crest" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#d8ff8a" />
            <stop offset="100%" stopColor="#39FF14" />
          </linearGradient>
          <filter id="eq-shield-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M100 14 C100 14 172 32 172 32 L172 96 C172 148 136 186 100 206 C64 186 28 148 28 96 L28 32 C28 32 100 14 100 14Z"
          fill="url(#eq-shield-metal)"
          stroke="url(#eq-shield-edge)"
          strokeWidth="5"
          filter="url(#eq-shield-glow)"
        />
        <path
          d="M100 28 C100 28 156 42 156 42 L156 96 C156 138 128 170 100 186 C72 170 44 138 44 96 L44 42 C44 42 100 28 100 28Z"
          fill="#0a0a0a"
          stroke="#39FF14"
          strokeWidth="1.4"
          opacity="0.9"
        />
        <path
          d="M100 58 C100 58 128 66 128 66 L128 104 C128 128 114 146 100 156 C86 146 72 128 72 104 L72 66 C72 66 100 58 100 58Z"
          fill="url(#eq-crest)"
        />
        <path
          d="M88 92 L100 78 L112 92 L106 92 L106 118 L94 118 L94 92Z"
          fill="#061400"
        />
      </svg>

      <div className="absolute right-[4%] top-[16%] z-20 grid h-[78px] w-[78px] place-items-center rounded-full bg-[#6b1212]/90 text-center shadow-[0_0_24px_rgba(180,20,20,0.45)] ring-1 ring-red-500/40">
        <div>
          <svg viewBox="0 0 64 40" className="mx-auto h-7 w-11" fill="#fff" aria-hidden>
            <path d="M8 18c0-8 10-16 24-16s24 8 24 16c0 4-3 7-7 8l-5 8H20l-5-8c-4-1-7-4-7-8z" />
            <path d="M20 18h8v4h-8zm16 0h8v4h-8z" fill="#6b1212" />
            <path d="M28 26h8l-4 6z" fill="#6b1212" />
          </svg>
          <div className="mt-0.5 text-[10px] font-semibold lowercase tracking-wide text-white">
            threats
          </div>
        </div>
      </div>
    </div>
  );
}
