import { useEffect, useRef } from "react";
import { Link } from "react-router";

// Placeholder pair (public domain, USFWS via Wikimedia Commons): two different
// beaches, so the coastline shifts at the spotlight's edge. For the final design,
// put a matched pair (same shot, with and without debris) in web/public/hero/ and
// point these at "/hero/clean.jpg" and "/hero/trash.jpg".
const BG_CLEAN =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Midway_Atoll_beach_-_DPLA_-_bf2efbe93a65d318eb836aab4fa97dbf.jpg/1920px-Midway_Atoll_beach_-_DPLA_-_bf2efbe93a65d318eb836aab4fa97dbf.jpg";
const BG_TRASH =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Beach_strewn_with_plastic_debris_%288080500982%29.jpg/1920px-Beach_strewn_with_plastic_debris_%288080500982%29.jpg";

const EASE = 0.1;

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

    const place = (x, y) => {
      layer.style.setProperty("--x", `${x}px`);
      layer.style.setProperty("--y", `${y}px`);
    };

    const setFromClient = (clientX, clientY) => {
      const rect = section.getBoundingClientRect();
      target.x = clientX - rect.left;
      target.y = clientY - rect.top;
      userMoved = true;
    };

    const onPointer = (e) => setFromClient(e.clientX, e.clientY);
    const onTouch = (e) => {
      const t = e.touches[0];
      if (t) setFromClient(t.clientX, t.clientY);
    };

    const tick = (now) => {
      if (!userMoved) {
        // Idle drift so touch visitors (no cursor) still see the reveal.
        const t = (now - start) / 1000;
        target.x = section.clientWidth * (0.5 + 0.28 * Math.sin(t * 0.45));
        target.y = section.clientHeight * (0.66 + 0.1 * Math.sin(t * 0.8));
      }
      smooth.x += (target.x - smooth.x) * EASE;
      smooth.y += (target.y - smooth.y) * EASE;
      place(smooth.x, smooth.y);
      if (visible) raf = requestAnimationFrame(tick);
    };

    smooth.x = section.clientWidth * 0.5;
    smooth.y = section.clientHeight * 0.66;
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

export default function Hero() {
  const sectionRef = useRef(null);
  const layerRef = useRef(null);
  useSpotlight(sectionRef, layerRef);

  return (
    <section ref={sectionRef} className="hero">
      <div className="hero-base hero-zoom" style={{ backgroundImage: `url("${BG_CLEAN}")` }} />
      <div
        ref={layerRef}
        className="hero-trash"
        style={{ backgroundImage: `url("${BG_TRASH}")` }}
        aria-hidden="true"
      />
      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-heading">
        <h1>
          <span className="hero-line-1 serif-italic hero-anim hero-reveal" style={{ animationDelay: "0.25s" }}>
            Beautiful shores
          </span>
          <span className="hero-line-2 hero-anim hero-reveal" style={{ animationDelay: "0.42s" }}>
            hide what we leave
          </span>
        </h1>
        <p className="hero-hint hero-anim hero-fade" style={{ animationDelay: "1.1s" }}>
          Move your cursor, or drag a finger, to see what the tide brought in
        </p>
      </div>

      <div className="hero-left hero-anim hero-fade" style={{ animationDelay: "0.7s" }}>
        <p>More than 11 million tonnes of plastic enter the ocean every year. Some of it washes back, onto beaches we think are clean.</p>
      </div>

      <div className="hero-right hero-anim hero-fade" style={{ animationDelay: "0.85s" }}>
        <p>Snap a photo as you walk by. AI identifies the debris and how much there is, and the beach map updates for everyone.</p>
        <Link to="/report" className="btn btn-primary">
          Start reporting
        </Link>
      </div>
    </section>
  );
}
