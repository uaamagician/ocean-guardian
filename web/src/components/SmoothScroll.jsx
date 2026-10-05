import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { prefersReducedMotion } from "../lib/motion";

// Inertial page scrolling, kept in step with GSAP's ScrollTrigger. Off for
// reduced-motion users and on pages where the wheel belongs to something else.
export default function SmoothScroll({ enabled }) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return undefined;
    // A light touch: 0.1 felt like the page trailed behind the wheel.
    const lenis = new Lenis({ lerp: 0.22, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [enabled]);
  return null;
}
