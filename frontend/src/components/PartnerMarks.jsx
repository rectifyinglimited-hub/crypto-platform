/** Original white wordmarks — layout like ForexVPS, not official brand files. */

const ink = "#fff";

function Mark({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-white ${className}`}>
      {children}
    </span>
  );
}

export function LogoMetaTrader({ n = 5 }) {
  return (
    <Mark>
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">
        MetaTrader <span className="text-3xl font-black sm:text-4xl">{n}</span>
      </span>
    </Mark>
  );
}

export function LogoNinjaTrader() {
  return (
    <Mark>
      <span className="text-xl font-black tracking-[0.08em] sm:text-2xl">NINJATRADER</span>
    </Mark>
  );
}

export function LogoThinkorswim() {
  return (
    <Mark>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={ink} aria-hidden>
        <path d="M12 2l1.4 6.2L20 8l-5.2 3.2L16.8 18 12 14.6 7.2 18l2-6.8L4 8l6.6-.8L12 2z" />
      </svg>
      <span className="text-xl font-semibold lowercase tracking-tight sm:text-2xl">
        thinkorswim
      </span>
    </Mark>
  );
}

export function LogoTradingView() {
  return (
    <Mark>
      <svg width="26" height="26" viewBox="0 0 24 24" fill={ink} aria-hidden>
        <circle cx="5" cy="16" r="2.2" />
        <path d="M8 15.2 13.2 6h3.4L11.2 18H8.2z" />
        <path d="M14.6 18 19 8.5h2.4L16.8 18z" />
      </svg>
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">TradingView</span>
    </Mark>
  );
}

export function LogoInteractiveBrokers() {
  return (
    <Mark>
      <svg width="18" height="22" viewBox="0 0 18 22" fill={ink} aria-hidden>
        <path d="M9 1 16 8.2h-4.2V21H6.2V8.2H2L9 1z" />
      </svg>
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">
        InteractiveBrokers
      </span>
    </Mark>
  );
}

export function LogoExness() {
  return (
    <Mark>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={ink} aria-hidden>
        <path d="M6 5h5.2l3.4 5.1L18.2 5H22l-6.4 9.2L22 23h-3.9l-3.6-5.3L11 23H6.2l6.2-8.8z" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight sm:text-2xl">exness</span>
    </Mark>
  );
}

export function LogoFpMarkets() {
  return (
    <Mark>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 16c4-9 12-9 16 0" stroke={ink} strokeWidth="2.2" />
        <path d="M6 19c3.2-6 8.8-6 12 0" stroke={ink} strokeWidth="2.2" />
      </svg>
      <span className="text-xl font-semibold lowercase sm:text-2xl">fpmarkets</span>
    </Mark>
  );
}

export function LogoGccBrokers() {
  return (
    <Mark>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={ink} strokeWidth="2" />
        <path d="M8 9h8M8 12h6M8 15h8" stroke={ink} strokeWidth="1.8" />
      </svg>
      <span className="text-lg font-black tracking-wider sm:text-xl">GCC BROKERS</span>
    </Mark>
  );
}

export function LogoEasyAlgos() {
  return (
    <Mark>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 4 4 14h16L12 4z" fill={ink} />
        <path d="M12 9 6 16h12L12 9z" fill="#000" />
        <path d="M12 12 8 17h8l-4-5z" fill={ink} />
      </svg>
      <span className="text-xl font-semibold lowercase sm:text-2xl">easyalgos</span>
    </Mark>
  );
}

export function LogoAdmirals() {
  return (
    <Mark>
      <svg width="18" height="18" viewBox="0 0 18 18" fill={ink} aria-hidden>
        <circle cx="3" cy="9" r="2" />
        <circle cx="9" cy="9" r="2" />
        <circle cx="15" cy="9" r="2" />
      </svg>
      <span className="text-xl font-semibold lowercase sm:text-2xl">admirals</span>
    </Mark>
  );
}

export function LogoAxiTrader() {
  return (
    <Mark>
      <svg width="22" height="22" viewBox="0 0 24 24" fill={ink} aria-hidden>
        <path d="M3 4h4.2L12 11.2 16.8 4H21L13.6 14.2V20h-3.2v-5.8z" />
      </svg>
      <span className="text-lg font-black tracking-[0.14em] sm:text-xl">AXITRADER</span>
    </Mark>
  );
}

export function LogoPepperstone() {
  return (
    <Mark>
      <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden>
        <path
          d="M11 1.5 20 7v10L11 22.5 2 17V7L11 1.5z"
          stroke={ink}
          strokeWidth="1.7"
        />
        <path d="M8 8h5.2a3.2 3.2 0 0 1 0 6.4H8V8zm0 8h3" stroke={ink} strokeWidth="1.7" />
      </svg>
      <span className="text-xl font-semibold sm:text-2xl">Pepperstone</span>
    </Mark>
  );
}

export const PLATFORM_MARKS = [
  { id: "mt4", node: <LogoMetaTrader n={4} /> },
  { id: "mt5", node: <LogoMetaTrader n={5} /> },
  { id: "ninja", node: <LogoNinjaTrader /> },
  { id: "tos", node: <LogoThinkorswim /> },
  { id: "tv", node: <LogoTradingView /> },
  { id: "ib", node: <LogoInteractiveBrokers /> },
];

export const BROKER_MARKS = [
  { id: "exness", node: <LogoExness /> },
  { id: "fp", node: <LogoFpMarkets /> },
  { id: "gcc", node: <LogoGccBrokers /> },
  { id: "easy", node: <LogoEasyAlgos /> },
  { id: "adm", node: <LogoAdmirals /> },
  { id: "axi", node: <LogoAxiTrader /> },
  { id: "pep", node: <LogoPepperstone /> },
];
