import { HERO_VIDEO } from "../lib/brand.js";

export default function VideoBackdrop({
  src = HERO_VIDEO,
  className = "",
  overlayClassName = "bg-gradient-to-r from-black via-black/80 to-black/35",
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 ${overlayClassName}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_70%)]" />
    </div>
  );
}
