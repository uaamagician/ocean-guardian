import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { DEBRIS_TYPES, SAFETY, TOOLS, TOOL_BY_ID } from "../lib/guide";
import { Reveal } from "../components/Motion";
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

export default function GuidePage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  useHashTarget();

  return (
    <div ref={rootRef}>
      <div className="info-top" />
      <section className="band band-dark guide-hero">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Field guide</h2>
            <p>What turns up on beaches, how to handle it safely, and what to bring.</p>
          </Reveal>
        </div>
      </section>

      <section className="band" id="debris">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>What washes up</h2>
            <p>Grouped like cleanup data cards. Natural material stays on the beach.</p>
          </Reveal>
          <ul className="debris-grid">
            {DEBRIS_TYPES.map(({ id, icon: Icon, name, examples, why, handle, tools }, i) => (
              <Reveal as="li" key={id} id={`debris-${id}`} className={id === "natural" ? "is-natural" : ""} delay={(i % 3) * 40}>
                <div className="debris-top">
                  <Icon aria-hidden="true" />
                  <h3>{name}</h3>
                </div>
                <p className="debris-examples">{examples}</p>
                <p>{why}</p>
                <p className="debris-handle">
                  <strong>How to handle it.</strong> {handle}
                </p>
                {tools.length > 0 && (
                  <ul className="tool-chips" aria-label="Tools">
                    {tools.map((t) => (
                      <li key={t}>
                        <a href={`#tool-${t}`}>{TOOL_BY_ID[t].name}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="band band-paper" id="tools">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Cleanup tools</h2>
            <p>Every tool an AI cleanup plan can ask for.</p>
          </Reveal>
          <ul className="tool-grid">
            {TOOLS.map(({ id, icon: Icon, name, use, when }, i) => (
              <Reveal as="li" key={id} id={`tool-${id}`} delay={(i % 4) * 30}>
                <Icon aria-hidden="true" />
                <h3>{name}</h3>
                <p>{use}</p>
                <p className="tool-when">{when}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="band band-dark" id="safety">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Stay safe</h2>
          </Reveal>
          <ul className="safety-grid">
            {SAFETY.map((rule, i) => (
              <Reveal as="li" key={rule} delay={i * 40}>
                <ShieldAlert aria-hidden="true" />
                <p>{rule}</p>
              </Reveal>
            ))}
          </ul>
          <Link to="/action" className="btn guide-cta" viewTransition>
            See beaches that need a cleanup
          </Link>
        </div>
      </section>
    </div>
  );
}
