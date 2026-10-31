import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { prefersReducedMotion } from "../lib/motion";
import FadeImg from "./FadeImg";
import { Note } from "./Sketch";

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
    image: "/photos/shalun-litter.webp",
    credit: "Shalun Beach, Tamsui, before our cleanup. Photo: the Ocean Guardian team",
  },
];

// Snapshots pinned to the page at slightly different angles.
const TILTS = [-1.6, 1.2, -0.8, 1.6, -1.2];

// A plain sideways row: scrolling the page always goes straight down, and the
// photos move only when swiped or when the arrows are pressed. The progress
// line and the arrows follow the row's own scroll position.
function useTrack(trackRef, progressRef) {
  const [ends, setEnds] = useState({ start: true, end: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const progress = max > 0 ? track.scrollLeft / max : 1;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      setEnds({ start: track.scrollLeft < 8, end: track.scrollLeft > max - 8 });
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [trackRef, progressRef]);

  const step = (direction) => {
    const track = trackRef.current;
    const card = track?.querySelector(".journey-stop");
    if (!track || !card) return;
    const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    track.scrollBy({ left: direction * distance, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return { ends, step };
}

export default function Journey() {
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const { ends, step } = useTrack(trackRef, progressRef);

  return (
    <section className="journey" aria-label="Where plastic washes up">
      <div className="journey-frame">
        <div ref={trackRef} className="journey-track" tabIndex={0} aria-label="Photos, scroll sideways">
          <div className="journey-intro">
            <h2>
              <span className="serif-italic">Where it</span> washes up
            </h2>
            <p>The same currents connect every coast. Follow the plastic from the tropics to the open Pacific, and back to Taiwan.</p>
            <p className="journey-hint">
              <Note arrow="after">swipe for more</Note>
            </p>
          </div>

          {STOPS.map((stop, i) => (
            <article key={stop.title} className="journey-stop taped" style={{ "--tilt": `${TILTS[i % TILTS.length]}deg` }}>
              <div className="journey-photo">
                <FadeImg src={stop.image} alt="" loading="lazy" />
              </div>
              <div className="journey-copy">
                <span className="journey-region">{stop.region}</span>
                <h3>{stop.title}</h3>
                <p>{stop.body}</p>
                <small className="journey-credit">{stop.credit}</small>
              </div>
            </article>
          ))}

          <div className="journey-end">
            <h3>
              Every coast is connected. <span className="serif-italic">Start with yours.</span>
            </h3>
            <Link to="/map" className="btn btn-primary" viewTransition>
              Explore the beach map
            </Link>
          </div>
        </div>

        <div className="journey-controls">
          <div className="journey-progress" aria-hidden="true">
            <span ref={progressRef} />
          </div>
          <button type="button" className="journey-arrow" onClick={() => step(-1)} disabled={ends.start} aria-label="Previous photo">
            <ArrowLeft aria-hidden="true" />
          </button>
          <button type="button" className="journey-arrow" onClick={() => step(1)} disabled={ends.end} aria-label="Next photo">
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
