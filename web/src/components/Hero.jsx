import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { prefersReducedMotion } from "../lib/motion";
import { Marked, Note } from "./Sketch";
import ActionButtons from "./ActionButtons";
import { Gulls } from "./Life";
import { dropRipple, push } from "../lib/ripple";

// A matched pair of illustrations: the same stretch of beach, clean and after
// the tide. Only the debris changes, so the spotlight edge never shows a seam.
const BG_CLEAN = "/hero/clean.webp";
const BG_TRASH = "/hero/trash-dim.webp";

const EASE = 0.3;

// The mask is a CSS radial-gradient driven by --x/--y, updated straight on the DOM
// each frame. Re-encoding a canvas to a PNG mask per frame (and re-rendering React)
// stalls on large screens.
function useSpotlight(sectionRef, layerRef) {
  useEffect(() => {
    const section = sectionRef.current;
    const layer = layerRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    let userMoved = false;
    let visible = true;
    let raf = 0;
    const start = performance.now();
    // On phones the note card covers the lower third, so drift a little higher.
    const driftY = section.clientWidth < 640 ? 0.56 : 0.66;

    const place = (x, y) => {
      layer.style.setProperty("--x", `${x}px`);
      layer.style.setProperty("--y", `${y}px`);
    };

    const last = { x: 0, y: 0 };
    const setFromClient = (clientX, clientY) => {
      // Relative to the layer itself: it shifts with the scroll parallax.
      const rect = layer.getBoundingClientRect();
      target.x = clientX - rect.left;
      target.y = clientY - rect.top;
      last.x = clientX;
      last.y = clientY;
      userMoved = true;
    };


    const onPointer = (e) => setFromClient(e.clientX, e.clientY);
    const onTouch = (e) => {
      const t = e.touches[0];
      if (t) setFromClient(t.clientX, t.clientY);
    };

    const tick = (now) => {
      // Re-aim at the pointer every frame: scrolling (and the parallax that
      // follows it) moves the picture under a pointer that hasn't moved.
      if (userMoved) setFromClient(last.x, last.y);
      if (!userMoved) {
        // Idle drift so touch visitors (no cursor) still see the reveal.
        const t = (now - start) / 1000;
        target.x = section.clientWidth * (0.5 + 0.28 * Math.sin(t * 0.45));
        target.y = section.clientHeight * (driftY + 0.08 * Math.sin(t * 0.8));
      }
      smooth.x += (target.x - smooth.x) * EASE;
      smooth.y += (target.y - smooth.y) * EASE;
      place(smooth.x, smooth.y);
      if (visible) raf = requestAnimationFrame(tick);
    };

    smooth.x = section.clientWidth * 0.5;
    smooth.y = section.clientHeight * driftY;
    place(smooth.x, smooth.y);
    if (reduceMotion) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    });
    observer.observe(section);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [sectionRef, layerRef]);
}

// As the hero scrolls away, the photo lags behind and the heading lifts and fades.
function useScrollAway(sectionRef) {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      const scrub = { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".hero-media", { yPercent: 18, ease: "none", scrollTrigger: scrub });
      gsap.to(".hero-heading", { yPercent: -35, opacity: 0, ease: "none", scrollTrigger: { ...scrub, end: "60% top" } });
      // The bottom copy has its own CSS entrance animation, so GSAP moves its wrapper.
      gsap.to(".hero-bottom", { y: -60, opacity: 0, ease: "none", scrollTrigger: { ...scrub, end: "45% top" } });
    }, sectionRef);
    return () => ctx.revert();
  }, [sectionRef]);
}

// The waterline in the picture (hero/clean.webp, measured on its 1706 x 960
// layout): x along the image, then how far down the water reaches there.
const SHORE = [
  [0, 590], [150, 600], [300, 600], [420, 580], [520, 520], [600, 460], [700, 420], [850, 410],
  [1000, 425], [1150, 420], [1300, 390], [1400, 340], [1500, 280], [1600, 220], [1706, 160],
];

// Is a point on the picture (in its own pixels on screen) in the water? The
// picture covers the hero and is centred, like background-size: cover.
function inWater(x, y, width, height) {
  const scale = Math.max(width / 1706, height / 960);
  const ix = (x - (width - 1706 * scale) / 2) / scale;
  const iy = (y - (height - 960 * scale) / 2) / scale;
  const i = SHORE.findIndex(([sx]) => sx >= ix);
  if (i <= 0) return iy < SHORE[i < 0 ? SHORE.length - 1 : 0][1];
  const [x0, y0] = SHORE[i - 1];
  const [x1, y1] = SHORE[i];
  return iy < y0 + ((y1 - y0) * (ix - x0)) / (x1 - x0);
}

// Tapping the water in the hero sends out rings, like a pebble dropped in the
// shallows; the sand stays still. The rings are plain DOM nodes in a layer
// React never renders into.
function useRipples(sectionRef, layerRef) {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const section = sectionRef.current;
    const picture = section.querySelector(".hero-trash");
    const shimmer = section.querySelector(".hero-shimmer");
    const onDown = (e) => {
      // The picture drifts with the scroll parallax, so test against it.
      const pic = picture.getBoundingClientRect();
      const px = e.clientX - pic.left;
      const py = e.clientY - pic.top;
      if (!inWater(px, py, pic.width, pic.height)) return;
      const box = section.getBoundingClientRect();
      dropRipple(layerRef.current, e.clientX - box.left, e.clientY - box.top);
      push(shimmer, px, py);
    };
    section.addEventListener("pointerdown", onDown);
    return () => section.removeEventListener("pointerdown", onDown);
  }, [sectionRef, layerRef]);
}

export default function Hero() {
  const sectionRef = useRef(null);
  const layerRef = useRef(null);
  const rippleRef = useRef(null);
  useSpotlight(sectionRef, layerRef);
  useScrollAway(sectionRef);
  useRipples(sectionRef, rippleRef);

  return (
    <section ref={sectionRef} className="hero">
      <div className="hero-media">
        <div className="hero-base hero-zoom" style={{ backgroundImage: `url("${BG_CLEAN}")` }} />
        <div
          ref={layerRef}
          className="hero-trash"
          style={{ backgroundImage: `url("${BG_TRASH}")` }}
          aria-hidden="true"
        />
        <div className="hero-shimmer" aria-hidden="true" />
      </div>
      <div className="hero-ripples" ref={rippleRef} aria-hidden="true" />
      <Gulls />
      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-heading">
        <h1>
          <span className="hero-line-1 serif-italic hero-anim hero-reveal" style={{ animationDelay: "0.1s" }}>
            Beautiful shores
          </span>
          <span className="hero-line-2 hero-anim hero-reveal" style={{ animationDelay: "0.22s" }}>
            hide what{" "}
            <Marked kind="underline" delay={800}>
              we leave
            </Marked>
          </span>
        </h1>
        <p className="hero-hint hero-anim hero-fade" style={{ animationDelay: "0.55s" }}>
          <Note arrow="down">Move your cursor, or drag a finger, to see what the tide brought in</Note>
        </p>
      </div>

      <div className="hero-bottom">
        <div className="hero-right taped hero-anim hero-fade" style={{ animationDelay: "0.45s" }}>
          <p>Photograph a beach. AI spots the debris, maps it and plans the cleanup.</p>
          <ActionButtons className="hero-actions" />
        </div>
      </div>
    </section>
  );
}
