import { HERO_VIDEO, HERO_POSTER } from "../lib/brand.js";

export default function VideoBackdrop({
  src = HERO_VIDEO,
  poster = HERO_POSTER,
  className = "",
  overlayClassName = "bg-gradient-to-r from-black via-black/78 to-black/40",
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {poster ? (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
