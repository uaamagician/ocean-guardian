import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";
import { dropRipple } from "../lib/ripple";
import "./SeaSurface.css";

// The moving water behind a sea section's content. It goes first inside the
// section (or the .sea-run that paints two sections as one), and a click or
// tap anywhere in it sends out rings. Two kinds:
//   - sunlit: sunlight netting the bottom, drifting and shimmering
//   - calm: pale open water with a few long, low swells passing through
export default function SeaSurface({ calm = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const surface = ref.current;
    const sea = surface?.parentElement;
    if (!sea || prefersReducedMotion() || getComputedStyle(surface).display === "none") return undefined;
    const rings = surface.querySelector(".sea-ripples");
    // Not when pressing a link or a button: that click is about something else.
    const onDown = (e) => {
      if (e.target.closest("a, button, input, select, textarea, label, .leaflet-container")) return;
      const box = sea.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      dropRipple(rings, x, y);
    };

    sea.addEventListener("pointerdown", onDown);
    return () => sea.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div ref={ref} className={`sea-surface ${calm ? "is-calm" : "is-sunlit"}`} aria-hidden="true">
      <div className="sea-water">
        {calm ? (
          <div className="sea-swell" />
        ) : (
          <>
            <div className="sea-net sea-net-a" />
            <div className="sea-net sea-net-b" />
          </>
        )}
      </div>
      <div className="sea-ripples" />
    </div>
  );
}
