import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { Check, ShieldAlert } from "lucide-react";
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
  // Our own photos have no license or source page to point to.
  if (!photo.source) {
    return (
      <figcaption>
        {photo.caption}. Photo: {photo.credit}
      </figcaption>
    );
  }
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

// Chapters of the guide, the way a field guide groups species. Each has its
// own highlighter color.
const CHAPTERS = [
  { title: "Plastic", note: "Most of what a cleanup picks up.", tone: "sea", ids: ["bottles", "bags", "foodware", "styrofoam", "microplastics"] },
  { title: "From boats, and the big stuff", note: "Heavy, tangled, often half-buried.", tone: "sand", ids: ["fishing", "large"] },
  { title: "Other materials", note: "Small but sharp, or easy to miss.", tone: "lemon", ids: ["cigarettes", "glass", "metal"] },
  { title: "Handle with care", note: "Don't pick these up yourself.", tone: "peach", ids: ["hazardous"] },
  { title: "Leave it on the beach", note: "Part of the shore, not litter.", tone: "mint", ids: ["natural"] },
];
const DEBRIS_BY_ID = Object.fromEntries(DEBRIS_TYPES.map((d) => [d.id, d]));
const ORDER = CHAPTERS.flatMap((c) => c.ids);
const NUMBER_OF = Object.fromEntries(ORDER.map((id, i) => [id, String(i + 1).padStart(2, "0")]));

// One plate of the guide. Photo and notes swap sides from one entry to the
// next, like facing pages.
function Entry({ id, flip }) {
  const { icon: Icon, name, examples, why, handle, tools } = DEBRIS_BY_ID[id];
  const photo = DEBRIS_PHOTOS[id];
  return (
    <Reveal as="li" id={`debris-${id}`} className={`entry is-${id} ${flip ? "is-flipped" : ""}`}>
      <figure className="entry-photo">
        <div className="entry-print">
          <FadeImg src={photo.src} alt={`${name}: ${photo.caption}`} loading="lazy" />
          {STAMPS[id] && <span className="debris-stamp">{STAMPS[id]}</span>}
          <span className="entry-number" aria-hidden="true">
            {NUMBER_OF[id]}
          </span>
        </div>
        <PhotoCredit photo={photo} />
      </figure>
      <div className="entry-text">
        <h3>
          <Icon aria-hidden="true" />
          {name}
        </h3>
        <p className="entry-examples">
          <svg className="entry-arrow" viewBox="0 0 60 30" aria-hidden="true" focusable="false">
            <path d="M58 22 C 44 26, 22 24, 6 10" />
            <path d="M14 8 L5 9 L8 17" />
          </svg>
          {examples}
        </p>
        <p className="entry-why">{why}</p>
        <div className="entry-handle">
          <Check aria-hidden="true" />
          <div>
            <strong>How to handle it</strong>
            <p>{handle}</p>
          </div>
        </div>
        {tools.length > 0 && (
          <ul className="entry-tools" aria-label="Bring">
            {tools.map((t) => {
              const { icon: ToolIcon, name: toolName } = TOOL_BY_ID[t];
              return (
                <li key={t}>
                  <a href={`#tool-${t}`}>
                    <ToolIcon aria-hidden="true" />
                    {toolName}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Reveal>
  );
}

// A chapter's title, swiped with that chapter's highlighter color.
function ChapterHead({ chapter }) {
  return (
    <header className={`chapter-head tone-${chapter.tone}`}>
      <h2>
        <span>{chapter.title}</span>
      </h2>
      <p className="chapter-note">{chapter.note}</p>
    </header>
  );
}

export default function GuidePage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  useHashTarget();
  let n = 0;

  return (
    <div ref={rootRef} className="guide">
      <header className="guide-title">
        <h1>What washes up</h1>
        <p>How to recognize each kind of beach debris, and how to handle it.</p>
      </header>

      <div id="debris">
        {CHAPTERS.map((chapter) => (
          <section key={chapter.title} className="chapter">
            <ChapterHead chapter={chapter} />
            <ol className="entries">
              {chapter.ids.map((id) => (
                <Entry key={id} id={id} flip={n++ % 2 === 1} />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="guide-section guide-kit" id="tools">
        <header className="kit-head">
          <h2>The kit</h2>
          <p className="chapter-note">Every tool an AI cleanup plan can ask for.</p>
        </header>
        <ul className="kit">
          {TOOLS.map(({ id, icon: Icon, name, use, when }) => (
            <Reveal as="li" key={id} id={`tool-${id}`}>
              <span className="kit-icon">
                <Icon aria-hidden="true" />
              </span>
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
        <header className="kit-head">
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
