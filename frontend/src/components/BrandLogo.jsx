/**
 * equiti logo — signup, sign-in, shell, footer, splash, chat.
 */

import { BRAND } from "../lib/brand.js";

const TEAL = "#00C2B3";

/** Official-style teal wordmark. */
export function EquitiWordmark({ className = "h-8 w-auto", fill = TEAL, cut = "#000" }) {
  return (
    <svg
      viewBox="0 0 460 100"
      className={className}
      role="img"
      aria-label={BRAND.name}
    >
      <title>{BRAND.name}</title>
      <text
        x="10"
        y="74"
        fill={fill}
        style={{ fontFamily: "Montserrat, Nunito, Inter, sans-serif" }}
        fontSize="78"
        fontWeight="800"
        letterSpacing="-2"
      >
        equiti
      </text>
      {/* q / u stencil slits */}
      <rect x="148" y="28" width="7" height="52" fill={cut} />
      <rect x="218" y="32" width="6.5" height="48" fill={cut} />
    </svg>
  );
}

export function EquitiMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
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
        <EquitiWordmark className="h-12 w-auto" cut="#000" />
      </span>
    );
  } else if (variant === "mark") {
    el = <EquitiMark className={imgClassName || "h-9 w-9"} />;
  } else if (variant === "wordmark") {
    el = <EquitiWordmark className={imgClassName || "h-6 w-auto sm:h-7"} cut="#000" />;
  } else if (variant === "on-light") {
    el = <EquitiWordmark className={imgClassName || "h-8 w-auto sm:h-9"} cut="#fff" />;
  } else {
    el = <EquitiWordmark className={imgClassName || "h-8 w-auto sm:h-9"} cut="#000" />;
  }

  const wrapClass = `inline-flex shrink-0 items-center ${className}`;

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
