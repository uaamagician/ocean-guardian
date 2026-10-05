import { useLayoutEffect } from "react";
import { gsap } from "./gsap";
import { prefersReducedMotion } from "./motion";
import { splitWords } from "./splitWords";

const HEADINGS = ".band-head h2, .journey-intro h2, .final-cta h2";

// Section headings land word by word, each at a slight angle, like stickers
// or handwriting, as they scroll in; the closing photo drifts with the scroll.
// Everything is scoped to `rootRef` and reverted on unmount, so leaving the
// page leaves nothing behind.
export default function useSectionMotion(rootRef) {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const splits = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray(HEADINGS).forEach((heading) => {
        const split = splitWords(heading);
        splits.push(split);
        gsap.from(split.pieces, {
          y: 26,
          opacity: 0,
          rotation: () => gsap.utils.random(-9, 9),
          duration: 0.45,
          ease: "back.out(2)",
          stagger: 0.03,
          scrollTrigger: { trigger: heading, start: "top 95%", once: true },
        });
      });

      gsap.utils.toArray(".final-cta").forEach((el) =>
        gsap.fromTo(
          el,
          { backgroundPositionY: "30%" },
          {
            backgroundPositionY: "70%",
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        ),
      );
    }, rootRef);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, [rootRef]);
}
