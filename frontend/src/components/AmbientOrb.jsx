import { useEffect, useRef } from "react";

// A soft, glowing "presence" that lives behind the page.
//
// It idles with a slow, gentle drift so the app never feels static, leans
// gently toward the cursor for a bit of interactivity, then speeds up and
// grows pulse-rings whenever `active` is true (i.e. while the assistant is
// actually working on a reply) — a quiet visual cue that something is
// happening, without a chunky spinner stealing the layout.
export default function AmbientOrb({ active = false }) {
  const containerRef = useRef(null);
  const parallaxRef = useRef(null);
  const raf = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reduced-motion users get the static/idle look only — no pointer chase.
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const handleMove = (e) => {
      const rect = container.getBoundingClientRect();
      // -1..1 range from the center of the orb's container
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      target.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    };

    const tick = () => {
      // ease toward the target so it drifts rather than snaps
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      if (parallaxRef.current) {
        const { x, y } = current.current;
        parallaxRef.current.style.transform = `translate3d(${x * 18}px, ${y * 14}px, 0)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMove);
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="ambient-orb" ref={containerRef} aria-hidden="true">
      <div className="ambient-orb__parallax" ref={parallaxRef}>
        <div className="ambient-orb__rotor">
          {/* three softly blurred, off-palette blobs that layer into a
             glassy, glowing sphere reminiscent of the reference mock —
             reworked into the app's existing terracotta/lilac/sage light
             palette instead of a dark shell */}
          <div
            className={`ambient-orb__blob ${active ? "ambient-orb__blob--active" : ""}`}
            style={{
              top: "-12%",
              left: "18%",
              width: "38vw",
              maxWidth: 560,
              height: "38vw",
              maxHeight: 560,
              background:
                "radial-gradient(circle at 35% 30%, rgba(175,127,115,0.55), rgba(175,127,115,0) 70%)",
            }}
          />
          <div
            className={`ambient-orb__blob ${active ? "ambient-orb__blob--active" : ""}`}
            style={{
              top: "6%",
              left: "42%",
              width: "30vw",
              maxWidth: 440,
              height: "30vw",
              maxHeight: 440,
              animationDelay: "-4s",
              background:
                "radial-gradient(circle at 60% 40%, rgba(124,148,115,0.4), rgba(124,148,115,0) 70%)",
            }}
          />
          <div
            className={`ambient-orb__blob ${active ? "ambient-orb__blob--active" : ""}`}
            style={{
              top: "-4%",
              left: "30%",
              width: "24vw",
              maxWidth: 340,
              height: "24vw",
              maxHeight: 340,
              animationDelay: "-9s",
              background:
                "radial-gradient(circle at 45% 55%, rgba(220,199,219,0.65), rgba(220,199,219,0) 70%)",
            }}
          />
        </div>

        {/* a small, sharper core + pulse rings — this is the bit that reads
           as "the AI is responding" while `active` is true */}
        <div className="absolute" style={{ top: "10%", left: "50%", transform: "translateX(-50%)" }}>
          <div className="relative w-3 h-3">
            {active && (
              <>
                <span className="ambient-orb__ring inset-0 absolute" style={{ animationDelay: "0s" }} />
                <span className="ambient-orb__ring inset-0 absolute" style={{ animationDelay: "0.9s" }} />
                <span className="ambient-orb__ring inset-0 absolute" style={{ animationDelay: "1.8s" }} />
              </>
            )}
            <span
              className={`ambient-orb__core absolute inset-0 rounded-full ${
                active ? "bg-accent" : "bg-accent/50"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
