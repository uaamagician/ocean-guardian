import { prefersReducedMotion, useInView } from "../lib/motion";

// SVG filters that make straight CSS lines look drawn by hand. "rough" also
// "boils" (the noise seed changes a few times a second, like hand-drawn
// animation); keep it to small doodles, since every frame repaints them.
export function SketchDefs() {
  const still = prefersReducedMotion();
  return (
    <svg className="sketch-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="2" result="noise">
            {!still && (
              <animate attributeName="seed" values="2;6;9" dur="0.55s" calcMode="discrete" repeatCount="indefinite" />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="rough-still" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// Line drawings on a 64×64 grid. Each path draws itself in turn.
const DOODLES = {
  fish: [
    "M8 32 C 18 18, 40 16, 50 32 C 40 48, 18 46, 8 32 Z",
    "M50 32 L60 22 L58 32 L60 42 Z",
    "M28 24 C 31 29, 31 35, 28 40",
    "M18 29 l0.5 0.5",
  ],
  bottle: [
    "M27 5 H37 V11 H27 Z",
    "M28 11 C 28 18, 20 19, 20 27 V54 C 20 59, 44 59, 44 54 V27 C 44 19, 36 18, 36 11",
    "M20 33 H44",
    "M20 45 H44",
    "M25 38 H33",
  ],
  bag: [
    "M16 22 C 14 34, 15 48, 21 57 H43 C 49 48, 50 34, 48 22 Z",
    "M23 22 C 23 11, 30 11, 30 22",
    "M34 22 C 34 11, 41 11, 41 22",
    "M24 32 C 27 40, 26 46, 29 52",
  ],
  shell: [
    "M32 55 C 18 47, 8 35, 10 25 C 14 10, 50 10, 54 25 C 56 35, 46 47, 32 55 Z",
    "M32 55 L21 16",
    "M32 55 L32 12",
    "M32 55 L43 16",
    "M32 55 L12 29",
    "M32 55 L52 29",
  ],
  starfish: [
    "M32 6 C 34 14, 36 20, 40 24 C 46 25, 52 25, 58 26 C 52 31, 47 35, 44 38 C 46 44, 48 50, 49 57 C 43 53, 37 49, 32 46 C 27 49, 21 53, 15 57 C 16 50, 18 44, 20 38 C 17 35, 12 31, 6 26 C 12 25, 18 25, 24 24 C 28 20, 30 14, 32 6 Z",
    "M32 22 l0.5 0.5 M38 32 l0.5 0.5 M26 32 l0.5 0.5 M32 38 l0.5 0.5",
  ],
  wave: [
    "M4 44 C 12 44, 14 22, 30 18 C 44 14, 56 24, 54 34 C 52 42, 42 42, 40 36 C 38 30, 46 28, 48 32",
    "M4 54 C 16 49, 26 58, 38 53 C 48 49, 54 52, 62 54",
  ],
  sun: [
    "M32 21 C 40 21, 44 27, 43 33 C 42 40, 36 44, 30 43 C 23 42, 20 36, 21 30 C 22 25, 26 21, 32 21",
    "M32 6 V13 M32 51 V58 M6 32 H13 M51 32 H58 M14 14 L19 19 M45 45 L50 50 M50 14 L45 19 M19 45 L14 50",
  ],
  gull: ["M4 34 C 12 24, 22 23, 32 34 C 42 23, 52 24, 60 34"],
  arrow: ["M6 46 C 14 22, 34 14, 54 22", "M44 14 L55 22 L45 30"],
  arrowDown: ["M30 4 C 22 18, 40 30, 30 54", "M21 45 L30 56 L39 44"],
  sparkle: ["M32 8 C 33 24, 40 31, 56 32 C 40 33, 33 40, 32 56 C 31 40, 24 33, 8 32 C 24 31, 31 24, 32 8 Z"],
};

export function Doodle({ name, className = "", boil = true, delay = 0, style }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  return (
    <svg
      ref={ref}
      viewBox="0 0 64 64"
      className={`doodle ${inView ? "is-drawn" : ""} ${className}`}
      data-boil={boil}
      style={{ ...style, "--delay": `${delay}ms` }}
      aria-hidden="true"
      focusable="false"
    >
      {DOODLES[name].map((d, i) => (
        <path key={i} d={d} pathLength="1" style={{ "--i": i }} />
      ))}
    </svg>
  );
}

const SCRIBBLES = {
  underline: { viewBox: "0 0 200 20", d: "M4 13 C 40 6, 84 15, 122 9 C 152 5, 178 7, 196 11" },
  circle: {
    viewBox: "0 0 200 80",
    d: "M150 9 C 104 1, 24 6, 9 36 C -1 64, 78 79, 140 73 C 190 67, 202 40, 183 21 C 169 7, 124 3, 94 8",
  },
};

// Underlines, circles or highlights a few words once they scroll into view.
export function Marked({ kind = "highlight", delay = 500, className = "", children }) {
  const [ref, inView] = useInView({ threshold: 0.8 });
  const scribble = SCRIBBLES[kind];
  return (
    <span
      ref={ref}
      className={`marked marked-${kind} ${inView ? "is-drawn" : ""} ${className}`}
      style={{ "--delay": `${delay}ms` }}
    >
      {children}
      {scribble && (
        <svg className="marked-svg" viewBox={scribble.viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={scribble.d} pathLength="1" />
        </svg>
      )}
    </span>
  );
}

// A handwritten margin note, optionally with an arrow doodle.
export function Note({ arrow, className = "", children }) {
  return (
    <span className={`hand-note ${className}`}>
      {arrow === "before" && <Doodle name="arrow" className="hand-note-arrow" boil={false} />}
      <span>{children}</span>
      {arrow === "down" && <Doodle name="arrowDown" className="hand-note-arrow-down" boil={false} />}
    </span>
  );
}
