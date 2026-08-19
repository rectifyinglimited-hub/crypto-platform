/** Metallic radar shield — neon edge, inner crest, orbiting nodes, threats badge. */

export default function SecurityShield({ className = "" }) {
  return (
    <div className={`relative mx-auto h-[360px] w-full max-w-[400px] sm:h-[420px] ${className}`}>
      <div className="absolute inset-[4%] rounded-full border border-[#39FF14]/30" />
      <div className="absolute inset-[16%] rounded-full border border-[#39FF14]/55" />

      <div className="eq-spin-slow absolute inset-[16%]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 45}deg)` }}>
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39FF14] shadow-[0_0_12px_#39FF14]" />
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 200 220"
        className="relative z-10 mx-auto mt-[10%] h-[68%] w-[68%]"
        aria-hidden
      >
        <defs>
          <linearGradient id="eq-shield-metal" x1="18%" y1="0%" x2="88%" y2="100%">
            <stop offset="0%" stopColor="#6a6a6a" />
            <stop offset="28%" stopColor="#cfcfcf" />
            <stop offset="52%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#4e4e4e" />
          </linearGradient>
          <linearGradient id="eq-shield-edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8ff7a" />
            <stop offset="55%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1c7a00" />
          </linearGradient>
          <linearGradient id="eq-crest" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#eaff9a" />
            <stop offset="100%" stopColor="#39FF14" />
          </linearGradient>
        </defs>
        <path
          d="M100 12 C100 12 174 32 174 32 L174 98 C174 150 138 188 100 208 C62 188 26 150 26 98 L26 32 C26 32 100 12 100 12Z"
          fill="url(#eq-shield-metal)"
          stroke="url(#eq-shield-edge)"
          strokeWidth="6"
        />
        <path
          d="M100 36 C100 36 148 50 148 50 L148 98 C148 134 124 162 100 176 C76 162 52 134 52 98 L52 50 C52 50 100 36 100 36Z"
          fill="#0b0b0b"
        />
        <path
          d="M100 58 C100 58 132 68 132 68 L132 104 C132 128 116 146 100 156 C84 146 68 128 68 104 L68 68 C68 68 100 58 100 58Z"
          fill="url(#eq-crest)"
          stroke="#39FF14"
          strokeWidth="1.2"
        />
      </svg>

      <div className="absolute bottom-[18%] right-[8%] z-20 grid h-[76px] w-[76px] place-items-center rounded-full bg-[#6b1212] text-center shadow-[0_0_22px_rgba(180,20,20,0.5)] ring-1 ring-red-500/50">
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
