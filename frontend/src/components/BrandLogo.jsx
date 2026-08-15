/**
 * Binomo logo — two parallel rounded bars (//) + lowercase wordmark.
 * Clean SVG recreation of the official sample.
 */

const YELLOW = "#FFC107";

function BinomoBars({ fill, className = "h-8 w-8" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill={fill}
    >
      <g transform="translate(24 24) rotate(-40)">
        <rect x="-16" y="-11.2" width="32" height="8.4" rx="4.2" />
        <rect x="-16" y="2.8" width="32" height="8.4" rx="4.2" />
      </g>
    </svg>
  );
}

export default function BrandLogo({
  variant = "lockup",
  className = "",
  imgClassName = "",
  onClick,
}) {
  let el;
  if (variant === "stack") {
    el = (
      <span className="inline-flex flex-col items-center rounded-2xl bg-[#FFC107] px-6 py-5 shadow-[0_0_36px_rgba(255,193,7,0.5)]">
        <BinomoBars fill="#ffffff" className="h-14 w-14" />
        <span className="mt-2 font-display text-[1.65rem] font-extrabold lowercase leading-none tracking-tight text-black">
          binomo
        </span>
      </span>
    );
  } else if (variant === "mark") {
    el = (
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-[#FFC107] shadow-[0_0_18px_rgba(255,193,7,0.4)] ${
          imgClassName || "h-9 w-9"
        }`}
      >
        <BinomoBars fill="#111111" className="h-[70%] w-[70%]" />
      </span>
    );
  } else {
    el = (
      <span className="inline-flex items-center gap-2">
        <BinomoBars fill={YELLOW} className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
        <span className="font-display text-[1.35rem] font-extrabold lowercase leading-none tracking-tight text-white sm:text-[1.55rem]">
          binomo
        </span>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 ${className}`}
        aria-label="binomo"
      >
        {el}
      </button>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} aria-label="binomo">
      {el}
    </span>
  );
}
