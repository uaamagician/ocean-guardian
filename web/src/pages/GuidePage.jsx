import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { DEBRIS_TYPES, SAFETY, TOOLS, TOOL_BY_ID } from "../lib/guide";
import { DEBRIS_PHOTOS } from "../lib/debrisPhotos";
import { Reveal } from "../components/Motion";
import FadeImg from "../components/FadeImg";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";
import "./GuidePage.css";

// Links like /guide#tool-netCutters land on that tool (under the fixed nav, via
// scroll-margin) and flash it. Router links change the URL with pushState, which
// CSS :target doesn't notice. The flag is a data attribute because Reveal
// rewrites className when the card scrolls in.
function useHashTarget() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return undefined;
    // Layout position via offsetTop: the card is still shifted down by its
    // reveal animation, so getBoundingClientRect (and scrollIntoView) land 24px short.
    const frame = requestAnimationFrame(() => {
      let top = 0;
      for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
      const nav = document.querySelector(".nav")?.offsetHeight ?? 0;
      window.scrollTo({ top: top - nav - 24 });
    });
    el.dataset.target = "true";
    const done = setTimeout(() => delete el.dataset.target, 2600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
      delete el.dataset.target;
    };
  }, [hash]);
}

// Two kinds get a warning stamped across the photo.
const STAMPS = { natural: "Leave it", hazardous: "Don't touch" };

function PhotoCredit({ photo }) {
  return (
    <figcaption>
      {photo.caption}. Photo: {photo.credit},{" "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
      , via{" "}
      <a href={photo.source} target="_blank" rel="noreferrer">
        Wikimedia Commons
      </a>
    </figcaption>
  );
}

// Chapters of the guide, the way a field guide groups species.
const CHAPTERS = [
  { title: "Plastic", note: "Most of what a cleanup picks up.", ids: ["bottles", "bags", "foodware", "styrofoam", "microplastics"] },
  { title: "From boats, and the big stuff", note: "Heavy, tangled, often half-buried.", ids: ["fishing", "large"] },
  { title: "Other materials", note: "Small but sharp, or easy to miss.", ids: ["cigarettes", "glass", "metal"] },
  { title: "Handle with care", note: "Don't pick these up yourself.", ids: ["hazardous"] },
  { title: "Leave it on the beach", note: "Part of the shore, not litter.", ids: ["natural"] },
];
const DEBRIS_BY_ID = Object.fromEntries(DEBRIS_TYPES.map((d) => [d.id, d]));
const NUMBER_OF = Object.fromEntries(CHAPTERS.flatMap((c) => c.ids).map((id, i) => [id, String(i + 1).padStart(2, "0")]));

function Entry({ id }) {
  const { icon: Icon, name, examples, why, handle, tools } = DEBRIS_BY_ID[id];
  const photo = DEBRIS_PHOTOS[id];
  return (
    <Reveal as="li" id={`debris-${id}`} className={`entry is-${id}`}>
      <figure className="entry-photo">
        <div className="entry-print">
          <FadeImg src={photo.src} alt={`${name}: ${photo.caption}`} loading="lazy" />
          {STAMPS[id] && <span className="debris-stamp">{STAMPS[id]}</span>}
        </div>
        <PhotoCredit photo={photo} />
      </figure>
      <div className="entry-text">
        <div className="entry-head">
          <span className="entry-number" aria-hidden="true">
            {NUMBER_OF[id]}
          </span>
          <h3>
            <Icon aria-hidden="true" />
            {name}
          </h3>
        </div>
        <p className="entry-examples">{examples}</p>
        <div className="entry-cols">
          <div>
            <h4>Why it matters</h4>
            <p>{why}</p>
          </div>
          <div className="entry-handle">
            <h4>How to handle it</h4>
            <p>{handle}</p>
          </div>
        </div>
        {tools.length > 0 && (
          <p className="entry-tools">
            <span>Bring:</span>
            {tools.map((t, i) => (
              <span key={t}>
                <a href={`#tool-${t}`}>{TOOL_BY_ID[t].name}</a>
                {i < tools.length - 1 ? "," : ""}
              </span>
            ))}
          </p>
        )}
      </div>
    </Reveal>
  );
}

export default function GuidePage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  useHashTarget();

  return (
    <div ref={rootRef} className="guide">
      <section className="guide-section guide-first" id="debris">
        <header className="guide-title">
          <h1>What washes up</h1>
          <p>Twelve kinds of beach debris, how to recognize them and how to handle each one.</p>
        </header>
        {CHAPTERS.map((chapter) => (
          <section key={chapter.title} className="chapter">
            <header className="chapter-head">
              <h2>{chapter.title}</h2>
              <p>{chapter.note}</p>
            </header>
            <ol className="entries">
              {chapter.ids.map((id) => (
                <Entry key={id} id={id} />
              ))}
            </ol>
          </section>
        ))}
      </section>

      <section className="guide-section guide-kit" id="tools">
        <header className="chapter-head">
          <h2>The kit</h2>
          <p>Every tool an AI cleanup plan can ask for.</p>
        </header>
        <ul className="kit">
          {TOOLS.map(({ id, icon: Icon, name, use, when }) => (
            <Reveal as="li" key={id} id={`tool-${id}`}>
              <Icon aria-hidden="true" />
              <div>
                <h3>{name}</h3>
                <p>{use}</p>
                <p className="kit-when">{when}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="guide-section" id="safety">
        <header className="chapter-head">
          <h2>Stay safe</h2>
        </header>
        <ol className="safety">
          {SAFETY.map((rule) => (
            <Reveal as="li" key={rule}>
              <ShieldAlert aria-hidden="true" />
              <p>{rule}</p>
            </Reveal>
          ))}
        </ol>
        <Link to="/action" className="btn guide-cta" viewTransition>
          See beaches that need a cleanup
        </Link>
      </section>
    </div>
  );
}
