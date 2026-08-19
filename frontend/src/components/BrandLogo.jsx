/**
 * equiti wordmark — bold rounded lowercase, stencil split on q and u.
 */

const TEAL = "#00D4C4";

export function EquitiWordmark({
  color = TEAL,
  className = "h-8 w-auto",
}) {
  return (
    <svg
      viewBox="0 0 320 72"
      className={className}
      aria-hidden="true"
      fill={color}
    >
      {/* e */}
      <path d="M37.2 8.2c16.8 0 29.4 10.6 29.4 27.8S54 63.8 37.2 63.8C20.2 63.8 7.4 53.4 7.4 36c0-17.2 12.8-27.8 29.8-27.8Zm0 12.2c-9.2 0-16 7-16 15.6s6.8 15.6 16 15.6c5.4 0 10-2.2 13.2-6.2l-8.6-6.2 8.6-6.4c-3.2-4.2-7.8-6.4-13.2-6.4Z" />
      <rect x="21" y="32.4" width="30" height="7.4" rx="3.7" />
      {/* q with vertical stencil gap */}
      <path
        fillRule="evenodd"
        d="M94.2 8.2c15.6 0 28.4 12.6 28.4 28 0 10.6-5.6 19.8-14 24.6V66c0 2.4-2 4.2-4.4 4.2h-7.6c-2.4 0-4.4-1.8-4.4-4.2v-5.6c-7.8-5-13-13.8-13-24.2 0-15.4 12.8-28 28.4-28h-13.4Zm0 12.4c-8.6 0-15.6 7-15.6 15.6s7 15.6 15.6 15.6 15.6-7 15.6-15.6-7-15.6-15.6-15.6ZM92.2 8.2h4.6v43.6h-4.6V8.2Z"
      />
      {/* u with stencil gap on left stem */}
      <path
        fillRule="evenodd"
        d="M128.2 10.2h12.6c2.2 0 4 1.8 4 4v24.2c0 7.2 5.4 12.2 12.2 12.2s12.2-5 12.2-12.2V14.2c0-2.2 1.8-4 4-4h12.6c2.2 0 4 1.8 4 4v24.8c0 15.6-12 27.2-28.8 27.2s-28.8-11.6-28.8-27.2V14.2c0-2.2 1.8-4 4-4Zm15.2 0h4.4v36.4h-4.4V10.2Z"
      />
      {/* i — bar, no dot */}
      <rect x="198.4" y="10.2" width="14.2" height="49.6" rx="7.1" />
      {/* t — crossbar only to the right */}
      <rect x="222.6" y="10.2" width="14.2" height="49.6" rx="7.1" />
      <rect x="228" y="10.2" width="30.4" height="12.2" rx="6.1" />
      {/* i — bar, no dot */}
      <rect x="268.4" y="10.2" width="14.2" height="49.6" rx="7.1" />
    </svg>
  );
}

export function EquitiMark({ className = "h-8 w-8", fill = TEAL, ink = "#05070c" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill={fill} />
      <path
        fill={ink}
        d="M24 11.2c7.4 0 13.2 4.8 13.2 12.6S31.4 36.4 24 36.4 10.8 31.6 10.8 23.8 16.6 11.2 24 11.2Zm0 6.2c-3.8 0-6.8 2.8-6.8 6.4s3 6.4 6.8 6.4c2.4 0 4.4-1 5.8-2.6l-3.8-2.6 3.8-2.6c-1.4-1.8-3.4-2.6-5.8-2.6Z"
      />
      <rect x="17.4" y="22.2" width="13.2" height="3.4" rx="1.7" fill={ink} />
    </svg>
  );
}

export default function BrandLogo({
  variant = "lockup",
  className = "",
  imgClassName = "",
  onClick,
  color,
}) {
  const fill = color || TEAL;
  let el;
  if (variant === "stack") {
    el = (
      <span className="inline-flex flex-col items-center rounded-2xl border border-[#00D4C4]/40 bg-black/75 px-8 py-6 shadow-[0_0_48px_rgba(0,212,196,0.32)]">
        <EquitiWordmark color={fill} className="h-11 w-auto" />
      </span>
    );
  } else if (variant === "mark") {
    el = (
      <span className={`inline-flex shrink-0 ${imgClassName || "h-9 w-9"}`}>
        <EquitiMark className="h-full w-full" fill={fill} />
      </span>
    );
  } else if (variant === "wordmark") {
    el = <EquitiWordmark color={fill} className="h-6 w-auto sm:h-7" />;
  } else if (variant === "on-light") {
    el = (
      <span className="inline-flex items-center gap-2">
        <EquitiMark className="h-8 w-8" fill={fill} />
        <EquitiWordmark color={fill} className="h-7 w-auto sm:h-8" />
      </span>
    );
  } else {
    el = (
      <span className="inline-flex items-center gap-2">
        <EquitiMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" fill={fill} />
        <EquitiWordmark color={fill} className="h-7 w-auto sm:h-8" />
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 ${className}`}
        aria-label="equiti"
      >
        {el}
      </button>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} aria-label="equiti">
      {el}
    </span>
  );
}
