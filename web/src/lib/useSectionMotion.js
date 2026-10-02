import { useLayoutEffect } from "react";
import { gsap, SplitText } from "./gsap";
import { prefersReducedMotion } from "./motion";

const HEADINGS = ".band-head h2, .journey-intro h2, .final-cta h2";

// Section headings rise line by line from behind a mask as they scroll in, and
// the closing photo drifts with the scroll. Everything is scoped to `rootRef`
// and reverted on unmount, so leaving the page leaves nothing behind.
export default function useSectionMotion(rootRef) {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(HEADINGS).forEach((heading) => {
        SplitText.create(heading, {
          type: "lines",
          mask: "lines",
          // Re-split after web fonts load or the width changes, so lines stay true.
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.09,
              scrollTrigger: { trigger: heading, start: "top 88%", once: true },
            }),
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
    return () => ctx.revert();
  }, [rootRef]);
}
