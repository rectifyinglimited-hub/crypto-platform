import { BRAND } from "../lib/brand.js";

/**
 * Official Binomo mark everywhere a logo slot exists.
 * variant: "lockup" (dark wordmark) | "mark" (yellow badge)
 */
export default function BrandLogo({
  variant = "lockup",
  className = "",
  imgClassName = "",
  onClick,
}) {
  const src = variant === "mark" ? BRAND.logoMark : BRAND.logoDark;
  const el = (
    <img
      src={src}
      alt={BRAND.name}
      className={
        imgClassName ||
        (variant === "mark"
          ? "h-9 w-9 rounded-lg object-cover shadow-[0_0_18px_rgba(255,193,7,0.45)]"
          : "h-8 w-auto max-w-[140px] object-contain object-left")
      }
    />
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`shrink-0 ${className}`}>
        {el}
      </button>
    );
  }
  return <span className={`inline-flex shrink-0 ${className}`}>{el}</span>;
}
