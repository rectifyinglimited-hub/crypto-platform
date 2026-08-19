/**
 * equiti logo — the provided wordmark artwork, not a reconstructed font.
 */

const LOGO_SRC = "/brand/equiti-logo.png";

export function EquitiWordmark({ className = "h-8 w-auto", onDark = true }) {
  return (
    <img
      src={LOGO_SRC}
      alt="equiti"
      className={`w-auto max-w-[168px] object-contain object-left sm:max-w-[196px] ${className} ${
        onDark ? "eq-logo-on-dark" : ""
      }`}
      draggable="false"
    />
  );
}

export function EquitiMark({ className = "h-8 w-8" }) {
  return (
    <span className={`relative inline-flex overflow-hidden rounded-md bg-black ${className}`}>
      <img
        src={LOGO_SRC}
        alt=""
        className="eq-logo-on-dark h-full w-full origin-left scale-[2.6] object-cover object-left"
        draggable="false"
      />
    </span>
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
      <span className="inline-flex flex-col items-center rounded-2xl border border-[#C8FF00]/30 bg-black px-8 py-6 shadow-[0_0_48px_rgba(200,255,0,0.2)]">
        <EquitiWordmark onDark className="h-12 w-auto max-w-[240px]" />
      </span>
    );
  } else if (variant === "mark") {
    el = <EquitiMark className={imgClassName || "h-9 w-9"} />;
  } else if (variant === "wordmark") {
    el = <EquitiWordmark onDark className="h-6 w-auto sm:h-7" />;
  } else if (variant === "on-light") {
    el = <EquitiWordmark onDark={false} className="h-8 w-auto max-w-[220px] sm:h-9" />;
  } else {
    el = <EquitiWordmark onDark className="h-7 w-auto sm:h-8" />;
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
