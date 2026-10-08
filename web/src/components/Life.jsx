// Small animals that wander through the page: a sea turtle and bubbles in the
// water sections, a crab on the sand, gulls over the hero. All decorative:
// hidden from screen readers and stilled for reduced motion (see Life.css).
import "./Life.css";

function Turtle() {
  return (
    <svg className="turtle" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <g className="turtle-flipper turtle-flipper-front-top">
        <path d="M70 32 C 78 18, 92 8, 102 6 C 98 16, 88 28, 76 36 Z" />
      </g>
      <g className="turtle-flipper turtle-flipper-front-bottom">
        <path d="M70 58 C 78 72, 92 82, 102 84 C 98 74, 88 62, 76 54 Z" />
      </g>
      <g className="turtle-flipper turtle-flipper-back-top">
        <path d="M38 34 C 32 26, 24 22, 18 22 C 22 30, 28 36, 36 40 Z" />
      </g>
      <g className="turtle-flipper turtle-flipper-back-bottom">
        <path d="M38 56 C 32 64, 24 68, 18 68 C 22 60, 28 54, 36 50 Z" />
      </g>
      <path className="turtle-tail" d="M28 45 L18 42 L18 48 Z" />
      <ellipse className="turtle-head" cx="94" cy="45" rx="11" ry="8.5" />
      <circle className="turtle-eye" cx="99" cy="41" r="1.6" />
      <circle className="turtle-eye" cx="99" cy="49" r="1.6" />
      <ellipse className="turtle-shell" cx="58" cy="45" rx="31" ry="23" />
      <path
        className="turtle-scutes"
        d="M46 45 L53 34 L65 34 L72 45 L65 56 L53 56 Z M53 34 L49 23 M65 34 L68 23 M72 45 L88 45 M65 56 L68 67 M53 56 L49 67 M46 45 L28 45"
      />
    </svg>
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

// A turtle crossing the water and bubbles rising, behind a section's content.
// Place it as the section's first child, before .band-inner.
export function SeaLife() {
  return (
    <div className="sea-life" aria-hidden="true">
      <div className="turtle-path">
        <Turtle />
      </div>
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
  return (
    <div className="crab-lane" aria-hidden="true">
      <div className="crab-path">
        <svg className="crab" viewBox="0 0 90 56" focusable="false">
          <g className="crab-legs crab-legs-a">
            <path d="M30 34 L16 42 M32 38 L20 50 M36 40 L28 54" />
            <path d="M60 34 L74 42 M58 38 L70 50 M54 40 L62 54" />
          </g>
          <g className="crab-legs crab-legs-b">
            <path d="M31 36 L18 46 M34 39 L24 52" />
            <path d="M59 36 L72 46 M56 39 L66 52" />
          </g>
          <path className="crab-arm" d="M30 28 C 22 24, 16 18, 14 12" />
          <path className="crab-arm" d="M60 28 C 68 24, 74 18, 76 12" />
          <path className="crab-claw" d="M14 12 C 6 10, 4 2, 10 0 C 12 4, 16 6, 18 6 C 18 10, 16 12, 14 12 Z" />
          <path className="crab-claw" d="M76 12 C 84 10, 86 2, 80 0 C 78 4, 74 6, 72 6 C 72 10, 74 12, 76 12 Z" />
          <path className="crab-stalk" d="M40 20 L38 11 M50 20 L52 11" />
          <circle className="crab-eye" cx="38" cy="10" r="2.6" />
          <circle className="crab-eye" cx="52" cy="10" r="2.6" />
          <ellipse className="crab-body" cx="45" cy="30" rx="17" ry="12" />
        </svg>
      </div>
    </div>
  );
}

// Below the title, over the water.
const GULLS = [
  { top: "34%", delay: 1, duration: 16, size: 46 },
  { top: "41%", delay: 2.2, duration: 18, size: 30 },
  { top: "29%", delay: 9, duration: 21, size: 36 },
];

// Gulls flying over the beach, seen from above, flapping as they go.
export function Gulls() {
  return (
    <div className="gulls" aria-hidden="true">
      {GULLS.map((g) => (
        <span
          key={g.top}
          className="gull-flight"
          style={{ top: g.top, animationDelay: `${g.delay}s`, animationDuration: `${g.duration}s` }}
        >
          <svg className="gull" viewBox="0 0 60 24" style={{ width: g.size }} focusable="false">
            <path d="M2 14 C 12 4, 22 4, 30 14 C 38 4, 48 4, 58 14" />
          </svg>
        </span>
      ))}
    </div>
  );
}
