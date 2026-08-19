/**
 * equiti wordmark — teal rounded lowercase with stencil cuts on q and u.
 */

const TEAL = "#00B5AD";

export function EquitiWordmark({
  className = "h-8 w-auto",
  onDark = true,
}) {
  const gap = onDark ? "#000000" : "#ffffff";
  return (
    <svg
      viewBox="0 0 430 92"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <text
        x="6"
        y="70"
        style={{ fontFamily: "Nunito, Outfit, Sora, sans-serif" }}
        fontSize="72"
        fontWeight="800"
        letterSpacing="-2.2"
      >
        <tspan fill={onDark ? "#ffffff" : TEAL}>equi</tspan>
        <tspan fill="#C8FF00">ti</tspan>
      </text>
      <rect x="112" y="20" width="5.5" height="50" fill={gap} />
      <rect x="176" y="24" width="5" height="46" fill={gap} />
    </svg>
  );
}

export function EquitiMark({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#000" />
      <rect x="1.2" y="1.2" width="45.6" height="45.6" rx="9" fill="none" stroke={TEAL} strokeWidth="1.6" />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fill={TEAL}
        fontFamily="Nunito, Outfit, sans-serif"
        fontSize="26"
        fontWeight="800"
      >
        e
      </text>
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
      <span className="inline-flex flex-col items-center rounded-2xl border border-[#C8FF00]/25 bg-black px-8 py-6">
        <EquitiWordmark onDark className="h-12 w-auto" />
      </span>
    );
  } else if (variant === "mark") {
    el = <EquitiMark className={imgClassName || "h-9 w-9"} />;
  } else if (variant === "wordmark") {
    el = <EquitiWordmark onDark className="h-6 w-auto sm:h-7" />;
  } else if (variant === "on-light") {
    el = <EquitiWordmark onDark={false} className="h-8 w-auto sm:h-9" />;
  } else {
    el = <EquitiWordmark onDark className="h-7 w-auto sm:h-8" />;
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`shrink-0 ${className}`} aria-label="equiti">
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
