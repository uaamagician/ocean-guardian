import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { prefersReducedMotion } from "../lib/motion";
import { gsap } from "../lib/gsap";
import FadeImg from "./FadeImg";

const wiki = (path) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

const STOPS = [
  {
    region: "Southeast Asia",
    title: "Tourist beaches",
    body: "On Bali's north coast, fishing boats share the sand with bottles and sandals. Some of the world's busiest beaches are also the hardest to keep clean.",
    image: wiki("4/40/Lovina_Beach_waste_Bali.jpg/1280px-Lovina_Beach_waste_Bali.jpg"),
    credit: "Lovina Beach, Bali. Photo: DayakSibiriak, CC BY-SA 4.0",
  },
  {
    region: "Southern Europe",
    title: "Resort coasts",
    body: "From the Mediterranean to the Canary Islands, holiday beaches are tidied for visitors, and new fragments arrive with every tide.",
    image: wiki(
      "7/78/004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg/1280px-004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg",
    ),
    credit: "Tenerife, Canary Islands. Photo: Marek Ślusarczyk, CC BY 3.0",
  },
  {
    region: "North Pacific",
    title: "Uninhabited atolls",
    body: "Midway Atoll lies about 2,000 km from the nearest city. North Pacific currents still bring an estimated 20 tonnes of plastic to its shores every year.",
    image: wiki(
      "6/64/Beach_strewn_with_plastic_debris_%288080500982%29.jpg/1280px-Beach_strewn_with_plastic_debris_%288080500982%29.jpg",
    ),
    credit: "Midway Atoll. Photo: U.S. Fish and Wildlife Service, public domain",
  },
  {
    region: "East Asia",
    title: "Debris without borders",
    body: "On Japan's Ishigaki Island, the labels on washed-up bottles are Japanese, Chinese and Taiwanese. Currents don't stop at borders.",
    image: wiki(
      "0/0b/Beach_on_Ishigakijima_-_Garbage_from_Japan_and_China_%28or_Taiwan%29.jpg/1280px-Beach_on_Ishigakijima_-_Garbage_from_Japan_and_China_%28or_Taiwan%29.jpg",
    ),
    credit: "Ishigaki Island, Japan. Photo: Syced, CC0",
  },
  {
    region: "Taiwan",
    title: "Our own coast",
    body: "Taiwan has run more than 220,000 coastal cleanups since 2020. What's still missing is a live picture of which beach needs help next.",
    image: wiki(
      "6/6b/2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg/1280px-2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg",
    ),
    credit: "Long Fong Fishing Port, Miaoli. Photo: Taiwankengo, CC BY-SA 4.0",
  },
];

// Pinned horizontal scroll on wide screens, driven by GSAP ScrollTrigger: the
// section pins while vertical scroll moves the track sideways, and each photo
// drifts against its card for depth. Narrow screens and reduced-motion users
// get a native swipeable row instead.
function usePinnedTrack(sectionRef, trackRef, progressRef) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 900px)");
    const update = () => setPinned(query.matches && !prefersReducedMotion());
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (!pinned) return undefined;
    const section = sectionRef.current;
    const track = trackRef.current;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const ctx = gsap.context(() => {
      const slide = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          end: () => `+=${distance()}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });

      gsap.utils.toArray(".journey-stop img", section).forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -5 },
          {
            xPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              containerAnimation: slide,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [pinned, sectionRef, trackRef, progressRef]);

  return pinned;
}

export default function Journey() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const pinned = usePinnedTrack(sectionRef, trackRef, progressRef);

  return (
    <section ref={sectionRef} className="journey" data-pinned={pinned} aria-label="Where plastic washes up">
      <div className="journey-sticky">
        <div ref={trackRef} className="journey-track">
          <div className="journey-intro">
            <h2>
              <span className="serif-italic">Where it</span> washes up
            </h2>
            <p>The same currents connect every coast. Follow the plastic from the tropics to the open Pacific, and back to Taiwan.</p>
            {pinned && <p className="journey-hint">Keep scrolling</p>}
          </div>

          {STOPS.map((stop) => (
            <article key={stop.title} className="journey-stop">
              <FadeImg src={stop.image} alt="" loading="lazy" />
              <div className="journey-copy">
                <span className="journey-region">{stop.region}</span>
                <h3 className="serif-italic">{stop.title}</h3>
                <p>{stop.body}</p>
              </div>
              <small className="journey-credit">{stop.credit}</small>
            </article>
          ))}

          <div className="journey-end">
            <h3>
              Every coast is connected. <span className="serif-italic">Start with yours.</span>
            </h3>
            <Link to="/report" className="btn btn-primary" viewTransition>
              Report a beach
            </Link>
          </div>
        </div>

        {pinned && (
          <div className="journey-progress" aria-hidden="true">
            <span ref={progressRef} />
          </div>
        )}
      </div>
    </section>
  );
}
