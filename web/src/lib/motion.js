import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Becomes true once the element scrolls into view, then stays true.
export function useInView({ threshold = 0.1, rootMargin = "0px 0px -2% 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(prefersReducedMotion);
  useEffect(() => {
    if (inView || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, threshold, rootMargin]);
  return [ref, inView];
}

const easeOut = (t) => 1 - (1 - t) ** 3;

// Counts from 0 to `value` once it's visible.
export function useCountUp(value, inView, duration = 1600) {
  const [current, setCurrent] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return undefined;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setCurrent(value * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, inView, duration]);
  return current;
}
