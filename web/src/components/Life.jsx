// Small animals that wander through the page: a sea turtle, fish and bubbles
// in the water sections, a crab on the sand, gulls over the hero, plus the sun,
// shell and starfish that sit beside headings. The animals are hand-drawn
// pictures (art/creatures), cut apart by scripts/split-creatures.py so their
// flippers, claws, legs and tails can move. All decorative: hidden from screen
// readers and stilled for reduced motion (see Life.css).
import { useEffect, useRef } from "react";
import turtleBody from "../assets/life/turtle-body.webp";
import turtleFrontLeft from "../assets/life/turtle-front-left.webp";
import turtleFrontRight from "../assets/life/turtle-front-right.webp";
import turtleBackLeft from "../assets/life/turtle-back-left.webp";
import turtleBackRight from "../assets/life/turtle-back-right.webp";
import crabBody from "../assets/life/crab-body.webp";
import crabClawLeft from "../assets/life/crab-claw-left.webp";
import crabClawRight from "../assets/life/crab-claw-right.webp";
import crabLegsLeft from "../assets/life/crab-legs-left.webp";
import crabLegsRight from "../assets/life/crab-legs-right.webp";
import fishBlueBody from "../assets/life/fish-blue-body.webp";
import fishBlueTail from "../assets/life/fish-blue-tail.webp";
import fishPinkBody from "../assets/life/fish-pink-body.webp";
import fishPinkTail from "../assets/life/fish-pink-tail.webp";
import fishOrangeBody from "../assets/life/fish-orange-body.webp";
import fishOrangeTail from "../assets/life/fish-orange-tail.webp";
import sunDisc from "../assets/life/sun-disc.webp";
import sunRays from "../assets/life/sun-rays.webp";
import shellImg from "../assets/life/shell.webp";
import starfishImg from "../assets/life/starfish.webp";
import "./Life.css";

// Clicking an animal startles it: a swimmer turns and darts back the way it
// came in a puff of bubbles, the crab scuttles back, a gull hurries on; then
// each settles and carries on. The animals sit behind the section's text, so
// a click is matched to one by where it landed rather than what it hit. One
// swimming behind a card or panel can't be seen there, so isn't clicked.
function useStartle(selector, { rate = -6, turn = true, bubbles = true, pad = 0, behind = false } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const box = ref.current;
    const section = box?.parentElement;
    if (!section) return undefined;
    // Cards here often paint their face on ::before.
    const opaque = (style) => style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.backgroundImage !== "none";
    const hidden = (node) => {
      for (let n = node; n && n !== section; n = n.parentElement) {
        if (opaque(getComputedStyle(n)) || opaque(getComputedStyle(n, "::before"))) return true;
      }
      return false;
    };
    const under = (e) => {
      if (e.target.closest("a, button, input, select, textarea, label")) return null;
      if (behind && hidden(e.target)) return null;
      for (const el of box.querySelectorAll(selector)) {
        const r = el.firstElementChild.getBoundingClientRect();
        if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) {
          return el;
        }
      }
      return null;
    };
    const puff = (el) => {
      const r = el.firstElementChild.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      for (let i = 0; i < 5; i += 1) {
        const dot = document.createElement("span");
        const size = 4 + Math.random() * 7;
        dot.className = "startle-bubble";
        Object.assign(dot.style, {
          left: `${r.left - b.left + r.width * (0.3 + Math.random() * 0.4)}px`,
          top: `${r.top - b.top + r.height * (0.3 + Math.random() * 0.4)}px`,
          width: `${size}px`,
          height: `${size}px`,
        });
        box.append(dot);
        dot
          .animate(
            [
              { translate: "0 0", opacity: 0.9 },
              { translate: `${(Math.random() - 0.5) * 24}px ${-50 - Math.random() * 50}px`, opacity: 0 },
            ],
            { duration: 900 + i * 160, easing: "ease-out" },
          )
          .finished.then(() => dot.remove(), () => dot.remove());
      }
    };
    const startle = (el) => {
      const swim = el.getAnimations()[0];
      if (!swim || el.classList.contains("is-startled")) return;
      el.classList.add("is-startled");
      if (turn) el.classList.add("is-turned");
      if (bubbles) puff(el);
      swim.playbackRate = rate;
      setTimeout(() => {
        el.classList.remove("is-turned");
        swim.playbackRate = 1;
        swim.play();
        setTimeout(() => el.classList.remove("is-startled"), 300);
      }, 1300);
    };
    let frame = 0;
    const onMove = (e) => {
      if (e.pointerType !== "mouse" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        section.style.cursor = under(e) ? "pointer" : "";
      });
    };
    const onClick = (e) => {
      const el = under(e);
      if (el) startle(el);
    };
    section.addEventListener("pointermove", onMove);
    section.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("click", onClick);
    };
  }, [selector, rate, turn, bubbles, pad, behind]);
  return ref;
}

// One picture made of stacked layers on the same canvas. Each moving part
// turns about its pivot: where it joins the body, as % of the canvas.
function Layers({ className, ratio, layers }) {
  return (
    <span className={`layers ${className}`} style={{ aspectRatio: ratio }} aria-hidden="true">
      {layers.map(([src, part, pivot]) => (
        <img key={part} src={src} alt="" className={`part part-${part}`} style={pivot && { transformOrigin: pivot }} draggable="false" />
      ))}
    </span>
  );
}

// Drawn head up; Life.css turns it to swim head first across the section.
// The flippers sit under the shell so their roots never show.
function Turtle() {
  return (
    <Layers
      className="turtle"
      ratio="319 / 329"
      layers={[
        [turtleBackLeft, "back-left", "39% 83.3%"],
        [turtleBackRight, "back-right", "59.4% 81.8%"],
        [turtleFrontLeft, "front-left", "31.4% 37.4%"],
        [turtleFrontRight, "front-right", "67.9% 35.9%"],
        [turtleBody, "body"],
      ]}
    />
  );
}

const FISH = {
  blue: { ratio: "370 / 201", body: fishBlueBody, tail: fishBlueTail, pivot: "80.8% 49.8%" },
  pink: { ratio: "374 / 201", body: fishPinkBody, tail: fishPinkTail, pivot: "81.3% 49.3%" },
  orange: { ratio: "370 / 201", body: fishOrangeBody, tail: fishOrangeTail, pivot: "80.8% 49.8%" },
};

// A fish, drawn facing left; Life.css mirrors it when it swims right.
export function Fish({ colour = "blue", className = "" }) {
  const f = FISH[colour];
  return (
    <Layers
      className={`fish ${className}`}
      ratio={f.ratio}
      layers={[
        [f.tail, "tail", f.pivot],
        [f.body, "body"],
      ]}
    />
  );
}

const BUBBLES = [
  { left: "12%", size: 10, delay: 0, duration: 7 },
  { left: "18%", size: 6, delay: 2.4, duration: 6 },
  { left: "71%", size: 12, delay: 1.2, duration: 8 },
  { left: "78%", size: 7, delay: 4.1, duration: 6.5 },
  { left: "88%", size: 9, delay: 3, duration: 7.5 },
  { left: "40%", size: 5, delay: 5.2, duration: 5.5 },
];

// A turtle crossing the water, a fish or two and bubbles rising, behind a
// section's content. Place it as the section's first child, before .band-inner.
export function SeaLife({ fish = ["blue", "pink"], turtle = true }) {
  const ref = useStartle(".turtle-path, .fish-path", { behind: true });
  return (
    <div ref={ref} className="sea-life" aria-hidden="true">
      {turtle && (
        <div className="turtle-path">
          <Turtle />
        </div>
      )}
      {fish.map((colour, i) => (
        <div key={colour} className={`fish-path fish-path-${i + 1}`}>
          <Fish colour={colour} />
        </div>
      ))}
      {BUBBLES.map((b) => (
        <span
          key={b.left}
          className="bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// A crab that scuttles sideways along the bottom of a sand section now and then.
export function Crab() {
  const ref = useStartle(".crab-path", { rate: -5, turn: false, bubbles: false, pad: 8 });
  return (
    <div ref={ref} className="crab-lane" aria-hidden="true">
      <div className="crab-path">
        <Layers
          className="crab"
          ratio="393 / 335"
          layers={[
            [crabLegsLeft, "legs-left", "17.9% 79.1%"],
            [crabLegsRight, "legs-right", "79.7% 70.4%"],
            [crabClawLeft, "claw-left", "21.9% 46.3%"],
            [crabClawRight, "claw-right", "79.4% 46%"],
            [crabBody, "body"],
          ]}
        />
      </div>
    </div>
  );
}

// The sun beside a heading: its rays turn slowly around the disc.
export function Sun({ className = "" }) {
  return (
    <Layers
      className={`sun ${className}`}
      ratio="365 / 377"
      layers={[
        [sunRays, "rays", "52.8% 47.2%"],
        [sunDisc, "disc", "52.8% 47.2%"],
      ]}
    />
  );
}

export function Shell({ className = "" }) {
  return <img src={shellImg} alt="" aria-hidden="true" className={`life-still shell ${className}`} draggable="false" />;
}

export function Starfish({ className = "" }) {
  return <img src={starfishImg} alt="" aria-hidden="true" className={`life-still starfish ${className}`} draggable="false" />;
}

// Below the title, over the water.
const GULLS = [
  { top: "34%", delay: 1, duration: 16, size: 46 },
  { top: "41%", delay: 2.2, duration: 18, size: 30 },
  { top: "29%", delay: 9, duration: 21, size: 36 },
];

// Gulls flying over the beach, seen from above, flapping as they go.
export function Gulls() {
  const ref = useStartle(".gull-flight", { rate: 4, turn: false, bubbles: false, pad: 14 });
  return (
    <div ref={ref} className="gulls" aria-hidden="true">
      {GULLS.map((g) => (
        <span
          key={g.top}
          className="gull-flight"
          style={{ top: g.top, animationDelay: `${g.delay}s`, animationDuration: `${g.duration}s` }}
        >
          <svg className="gull" viewBox="0 0 60 24" style={{ width: g.size }} focusable="false">
            <path className="gull-wing is-left" d="M30 14 C 22 4, 12 4, 2 14" />
            <path className="gull-wing is-right" d="M30 14 C 38 4, 48 4, 58 14" />
          </svg>
        </span>
      ))}
    </div>
  );
}
