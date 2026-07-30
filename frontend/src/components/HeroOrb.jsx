// The small, crisp "breathing blob" shown above the greeting on an empty
// chat. Distinct from AmbientOrb (which is a soft full-page background
// wash) — this one is a discrete, glossy focal point.
export default function HeroOrb() {
  return (
    <div className="hero-orb-wrap" aria-hidden="true">
      <div className="hero-orb-glow" />
      <div className="hero-orb-ring" />
      <div className="hero-orb" />
    </div>
  );
}
