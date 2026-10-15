import { useRef } from "react";
import { Link } from "react-router";
import { Reveal } from "../components/Motion";
import { Footprints, Marked } from "../components/Sketch";
import { Shell, Starfish } from "../components/Life";
import FadeImg from "../components/FadeImg";
import EventCard from "../components/EventCard";
import ActionButtons from "../components/ActionButtons";
import { HISTORY } from "../lib/history";
import { usePastEvents } from "../lib/events";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";
import "./Events.css";
import "./ActionPage.css";
import "./HistoryPage.css";

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Credit({ item }) {
  return (
    <figcaption className="tl-credit">
      Photo: {item.credit},{" "}
      {item.licenseUrl ? (
        <a href={item.licenseUrl} target="_blank" rel="noreferrer">
          {item.license}
        </a>
      ) : (
        item.license
      )}
      , via{" "}
      <a href={item.source} target="_blank" rel="noreferrer">
        Wikimedia Commons
      </a>
    </figcaption>
  );
}

function CleanupItem({ item, side }) {
  return (
    <Reveal as="li" className={`tl-item tl-${side}`}>
      <span className="tl-dot" aria-hidden="true" />
      <figure className="tl-photo taped">
        <FadeImg src={item.image} alt={`Volunteers at a beach cleanup, ${item.place}`} loading="lazy" />
        <Credit item={item} />
      </figure>
      <div className="tl-note">
        <span className="tl-date">{formatDate(item.date)}</span>
        <h3>{item.place}</h3>
        <span className="tl-country">{item.country}</span>
        <p>{item.summary}</p>
      </div>
    </Reveal>
  );
}

function MilestoneItem({ item }) {
  return (
    <Reveal as="li" className="tl-item tl-milestone">
      <span className="tl-dot" aria-hidden="true" />
      <div className="tl-sticky">
        <span className="tl-year">{item.year}</span>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
    </Reveal>
  );
}

export default function HistoryPage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  const past = usePastEvents();
  let side = 0;

  return (
    <div ref={rootRef}>
      <div className="info-top" />
      <section className="band band-dark">
        <div className="band-inner">
          <Shell className="band-doodle hist-shell bob" />
          <Reveal className="band-head">
            <h2>
              Cleanups that <Marked kind="underline">came before</Marked>
            </h2>
            <p>
              People have been cleaning coastlines for decades. These are a few of the cleanups that volunteers
              photographed and shared, from Texas in 1986 to Ishigaki in 2025. Every photo belongs to its
              photographer and is credited under it.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="band band-paper hist-band">
        <div className="band-inner">
          <ol className="timeline">
            {HISTORY.map((item) =>
              item.kind === "milestone" ? (
                <MilestoneItem key={item.year} item={item} />
              ) : (
                <CleanupItem key={item.source} item={item} side={side++ % 2 ? "right" : "left"} />
              ),
            )}
          </ol>
          <Footprints steps={6} className="hist-steps" />
        </div>
      </section>

      <section className="band paper-drift">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Cleanups organized here</h2>
            <p>Every cleanup run through Ocean Guardian joins this page once it's done, with its work order and crew.</p>
          </Reveal>
          {past === undefined && <p className="report-meta">Loading…</p>}
          {past !== undefined && !past?.length && (
            <div className="cl-empty">
              <Starfish className="cl-empty-doodle bob" />
              <h3>The first page is still blank</h3>
              <p>No cleanup organized here has finished yet. Join one, or set one up, and it lands here afterward.</p>
              <Link to="/action" className="btn btn-primary" viewTransition>
                See upcoming cleanups
              </Link>
            </div>
          )}
          {past?.length > 0 && (
            <ul className="event-list">
              {[...past].reverse().map((e) => (
                <li key={e.id}>
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="band band-dark hist-cta">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Add the next page</h2>
            <p>Report the beach near you, join a cleanup, or organize your own.</p>
          </Reveal>
          <ActionButtons />
        </div>
      </section>
    </div>
  );
}
