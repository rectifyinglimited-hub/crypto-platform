/** Light hero backdrop — no video/filters (those were painting the page black). */

export default function HeroMediaSlider() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="eq-grid absolute inset-0 opacity-30" />
      <div className="absolute -right-24 top-0 h-full w-1/2 bg-gradient-to-l from-[#39FF14]/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
    </div>
  );
}
