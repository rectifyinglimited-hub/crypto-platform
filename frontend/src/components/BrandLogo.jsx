/**
 * equiti logo — signup, sign-in, shell, footer, splash, chat.
 * Tight-cropped PNG; height is always set so the native 700px asset never blows up layout.
 */

import { BRAND } from "../lib/brand.js";

const TEAL = "#00C2B3";
const WORDMARK_SRC = "/brand/equiti-wordmark.png";

/** Official teal wordmark. Pass Tailwind height (e.g. h-8); never leave height auto. */
export function EquitiWordmark({ className = "h-8" }) {
  return (
    <img
      src={WORDMARK_SRC}
      alt={BRAND.name}
      draggable={false}
      width={200}
      height={58}
      className={`block w-auto max-w-[min(100%,11rem)] object-contain object-center ${className}`}
    />
  );
}

export function EquitiMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 48" className={`block shrink-0 ${className}`} aria-hidden>
      <rect width="48" height="48" rx="12" fill={TEAL} />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fill="#04120f"
        style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
        fontSize="26"
        fontWeight="800"
      >
        e
      </text>
    </svg>
  );
}

/**
 * @param {"lockup"|"wordmark"|"mark"|"stack"|"on-light"} variant
 */
export default function BrandLogo({
  variant = "lockup",
  className = "",
  imgClassName = "",
  onClick,
}) {
  let el;
  if (variant === "stack") {
    el = (
      <span className="inline-flex flex-col items-center rounded-2xl border border-[#00C2B3]/35 bg-black px-8 py-6">
        <EquitiWordmark className="h-10 sm:h-12" />
      </span>
    );
  } else if (variant === "mark") {
    el = <EquitiMark className={imgClassName || "h-9 w-9"} />;
  } else if (variant === "wordmark") {
    el = <EquitiWordmark className={imgClassName || "h-6 sm:h-7"} />;
  } else if (variant === "on-light") {
    el = <EquitiWordmark className={imgClassName || "h-8 sm:h-9"} />;
  } else {
    el = <EquitiWordmark className={imgClassName || "h-8 sm:h-9"} />;
  }

  const wrapClass = `inline-flex shrink-0 items-center justify-center ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={wrapClass} aria-label={BRAND.name}>
        {el}
      </button>
    );
  }
  return (
    <span className={wrapClass} aria-label={BRAND.name}>
      {el}
    </span>
  );
}
