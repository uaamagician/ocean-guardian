import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router";
import { BookOpen, CalendarCheck, Megaphone, Sparkles } from "lucide-react";
import { Level } from "../components/ReportDetail";
import { Reveal } from "../components/Motion";
import EventCard from "../components/EventCard";
import { useUpcomingEvents } from "../lib/events";
import usePublishedReports from "../lib/usePublishedReports";
import { useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { MIN_REPORTS_FOR_PLAN, planInputs, useStoredPlan } from "../lib/cleanup";
import { formatTime } from "../lib/labels";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";
import "./ActionPage.css";
import "./Events.css";

const SEVERITY_RANK = { heavy: 4, moderate: 3, light: 2, clean: 1 };
const MAX_ROWS = 20;

const range = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

// Scrolls to a section on this page, below the fixed nav.
function jumpTo(id, behavior = "smooth") {
  let el = document.getElementById(id);
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  if (el) window.scrollTo({ top: top - 72, behavior });
}

function PlanStatus({ stored, count }) {
  if (stored === undefined) return <span className="report-meta">Checking plan…</span>;
  if (stored) {
    const { plan } = stored;
    return (
      <span className="cl-plan is-ready">
        <Sparkles aria-hidden="true" />
        {range(plan.volunteers)} volunteers, {plan.hours} h, {plan.heavyMachinery.needed ? "heavy equipment" : "no heavy equipment"}
      </span>
    );
  }
  if (count >= MIN_REPORTS_FOR_PLAN) {
    return (
      <span className="cl-plan">
        <Sparkles aria-hidden="true" />
        Ready for an AI plan
      </span>
    );
  }
  const missing = MIN_REPORTS_FOR_PLAN - count;
  return <span className="report-meta">Needs {missing} more report{missing > 1 ? "s" : ""} for a plan</span>;
}

// A beach on the organize list: details on the left, and what you can do now
// on the right (organize right away if the AI plan exists).
function BeachRow({ beach, list, allReports }) {
  const stored = useStoredPlan(beach.id);
  const count = planInputs(allReports, beach).length;
  const beachLink = `/map?b=${encodeURIComponent(beach.id)}&t=cleanup`;
  return (
    <div className="cl-row">
      <Link to={beachLink} className="cl-main" viewTransition>
        <strong className="cl-name">{beach.name}</strong>
        <span className="report-meta">{[beach.local, beach.country].filter(Boolean).join(", ") || "Added by users"}</span>
      </Link>
      <div className="cl-level">
        <Level category={list[0].aiAnalysis?.category} />
        <span className="report-meta">
          {list.length} report{list.length > 1 ? "s" : ""}, latest {formatTime(list[0].createdAt)}
        </span>
      </div>
      <PlanStatus stored={stored} count={count} />
      <div className="cl-action">
        {stored ? (
          <Link to={`/events/new?b=${encodeURIComponent(beach.id)}`} className="btn btn-primary btn-small" viewTransition>
            Organize here
          </Link>
        ) : (
          <Link to={beachLink} className="btn btn-small" viewTransition>
            {count >= MIN_REPORTS_FOR_PLAN && stored === null ? "Get the AI plan" : "View beach"}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ActionPage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  const { reports } = usePublishedReports();
  const { beaches } = useAllBeaches();
  const { byBeach } = useReportsByBeach(beaches, reports);
  const upcoming = useUpcomingEvents();
  const { hash } = useLocation();

  // The account menu links straight to #organize.
  useEffect(() => {
    if (hash === "#organize" || hash === "#upcoming") jumpTo(hash.slice(1), "auto");
  }, [hash, beaches]);

  // Dirtiest first, then the beaches with the most evidence.
  const rows = useMemo(() => {
    if (!beaches) return null;
    const byId = new Map(beaches.map((b) => [b.id, b]));
    return [...byBeach.entries()]
      .map(([id, list]) => ({ beach: byId.get(id), reports: list }))
      .filter((r) => r.beach)
      .sort(
        (a, b) =>
          (SEVERITY_RANK[b.reports[0].aiAnalysis?.category] ?? 0) - (SEVERITY_RANK[a.reports[0].aiAnalysis?.category] ?? 0) ||
          b.reports.length - a.reports.length,
      )
      .slice(0, MAX_ROWS);
  }, [beaches, byBeach]);

  return (
    <div ref={rootRef}>
      <div className="info-top" />
      <section className="band band-dark">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Beach cleanups</h2>
            <p>
              Join a cleanup near you, or organize one. Once a beach has {MIN_REPORTS_FOR_PLAN} or more reports, AI
              plans the crew, time and gear, and turns it into a work order volunteers sign up to.
            </p>
          </Reveal>
          <Reveal className="cl-choices" delay={120}>
            <button type="button" className="cl-choice" onClick={() => jumpTo("upcoming")}>
              <CalendarCheck aria-hidden="true" />
              <strong>Join a cleanup</strong>
              <span>
                {upcoming?.length
                  ? `${upcoming.length} coming up. Sign up and say what gear you'll bring.`
                  : "See what's scheduled and sign up."}
              </span>
            </button>
            <button type="button" className="cl-choice" onClick={() => jumpTo("organize")}>
              <Megaphone aria-hidden="true" />
              <strong>Organize a cleanup</strong>
              <span>Pick a beach with an AI plan, set a time and a meeting point.</span>
            </button>
          </Reveal>
        </div>
      </section>

      <section className="band" id="upcoming">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Upcoming cleanups</h2>
            <p>Sign up with a nickname, say how many you're bringing and which gear you can carry.</p>
          </Reveal>
          {upcoming === undefined && <p className="report-meta">Loading cleanups…</p>}
          {upcoming?.length === 0 && (
            <div className="notice">
              <p>Nothing scheduled yet. Pick a beach with an AI plan and organize the first one.</p>
              <button type="button" className="btn btn-primary" onClick={() => jumpTo("organize")}>
                Organize a cleanup
              </button>
            </div>
          )}
          {upcoming?.length > 0 && (
            <ul className="event-list">
              {upcoming.map((e, i) => (
                <Reveal as="li" key={e.id} delay={Math.min(i, 6) * 50}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="band band-paper" id="organize">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Organize a cleanup</h2>
            <p>
              Pick a beach. The ones with an AI plan can host a cleanup right away; the plan becomes the work order with
              the crew size, teams and a gear checklist. Dirtiest beaches first.
            </p>
          </Reveal>

          {rows === null && <p className="report-meta">Loading beaches…</p>}
          {rows?.length === 0 && (
            <div className="notice">
              <p>No beach has been reported yet. One photo puts the first beach on this list.</p>
              <Link to="/report" className="btn btn-primary" viewTransition>
                Report a beach
              </Link>
            </div>
          )}

          {rows?.length > 0 && (
            <ol className="cl-list">
              {rows.map(({ beach, reports: list }, i) => (
                <Reveal as="li" key={beach.id} delay={Math.min(i, 6) * 50}>
                  <BeachRow beach={beach} list={list} allReports={reports} />
                </Reveal>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="band">
        <div className="band-inner cl-extra">
          <Reveal className="notice">
            <Sparkles aria-hidden="true" className="cl-icon" />
            <h3>How organizing works</h3>
            <ol className="cl-steps">
              <li>Press “Organize here” on a beach with an AI plan, and sign in with Google.</li>
              <li>Set the date, the meeting point and how many people can join.</li>
              <li>Share the event link. Volunteers sign up and tick the gear they'll bring.</li>
            </ol>
          </Reveal>
          <Reveal className="notice" delay={80}>
            <BookOpen aria-hidden="true" className="cl-icon" />
            <h3>New to beach cleanups?</h3>
            <p>The field guide explains what you'll find, how to handle it safely, and every tool a plan may ask for.</p>
            <Link to="/guide" className="btn" viewTransition>
              Open the field guide
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
