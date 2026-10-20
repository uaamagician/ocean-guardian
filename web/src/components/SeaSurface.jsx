import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion";
import "./SeaSurface.css";

// Where the sun catches the water and twinkles, as % of the section.
const GLINTS = [
  [7, 18, 0],
  [22, 64, 1.7],
  [34, 30, 3.1],
  [47, 78, 0.6],
  [58, 14, 2.4],
  [66, 52, 4.2],
  [78, 26, 1.2],
  [86, 70, 3.6],
  [93, 40, 0.3],
  [14, 86, 2.9],
];

// The moving water behind a sea section's content. It goes first inside the
// section (or the .sea-run that paints two sections as one), and reacts to the
// pointer anywhere in it: a soft patch of light follows the mouse, and a click
// or tap sends out rings. Two kinds:
//   - lit: sunlight netting the bottom, drifting and shimmering, with glints
//   - calm: pale open water with a few slow swells passing through
export default function SeaSurface({ calm = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const surface = ref.current;
    const sea = surface?.parentElement;
    if (!sea || prefersReducedMotion() || getComputedStyle(surface).display === "none") return undefined;
    const glow = surface.querySelector(".sea-glow");
    const rings = surface.querySelector(".sea-ripples");
    let frame = 0;
    let x = 0;
    let y = 0;

    const place = () => {
      frame = 0;
      glow.style.translate = `${x}px ${y}px`;
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const box = sea.getBoundingClientRect();
      x = e.clientX - box.left;
      y = e.clientY - box.top;
      surface.classList.add("is-lit");
      if (!frame) frame = requestAnimationFrame(place);
    };
    const onLeave = () => surface.classList.remove("is-lit");
    // Not when pressing a link or a button: that click is about something else.
    const onDown = (e) => {
      if (e.target.closest("a, button, input, select, textarea, label, .leaflet-container")) return;
      const box = sea.getBoundingClientRect();
      for (let i = 0; i < 3; i += 1) {
        const ring = document.createElement("span");
        ring.className = "sea-ring";
        ring.style.left = `${e.clientX - box.left}px`;
        ring.style.top = `${e.clientY - box.top}px`;
        ring.style.animationDelay = `${i * 0.16}s`;
        rings.append(ring);
        ring.addEventListener("animationend", () => ring.remove());
      }
    };

    sea.addEventListener("pointermove", onMove);
    sea.addEventListener("pointerleave", onLeave);
    sea.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      sea.removeEventListener("pointermove", onMove);
      sea.removeEventListener("pointerleave", onLeave);
      sea.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div ref={ref} className={`sea-surface ${calm ? "is-calm" : "is-sunlit"}`} aria-hidden="true">
      {calm ? (
        <div className="sea-swell" />
      ) : (
        <>
          <div className="sea-net sea-net-a" />
          <div className="sea-net sea-net-b" />
          {GLINTS.map(([left, top, delay]) => (
            <span key={`${left}-${top}`} className="sea-glint" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} />
          ))}
        </>
      )}
      <div className="sea-glow" />
      <div className="sea-ripples" />
    </div>
  );
}
