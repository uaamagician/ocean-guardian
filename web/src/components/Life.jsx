// Small animals that wander through the page: a sea turtle, fish and bubbles
// in the water sections, a crab on the sand, gulls over the hero, plus the sun,
// shell and starfish that sit beside headings. The animals are hand-drawn
// pictures (art/creatures), cut apart by scripts/split-creatures.py so their
// flippers, claws, legs and tails can move. All decorative: hidden from screen
// readers and stilled for reduced motion (see Life.css).
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
  return (
    <div className="sea-life" aria-hidden="true">
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
  return (
    <div className="crab-lane" aria-hidden="true">
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
  return (
    <div className="gulls" aria-hidden="true">
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
