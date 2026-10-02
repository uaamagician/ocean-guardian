import { useMemo, useRef } from "react";
import { Link } from "react-router";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
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

function PlanStatus({ beach, allReports }) {
  const stored = useStoredPlan(beach.id);
  const count = planInputs(allReports, beach).length;
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

export default function ActionPage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  const { reports } = usePublishedReports();
  const { beaches } = useAllBeaches();
  const { byBeach } = useReportsByBeach(beaches, reports);
  const upcoming = useUpcomingEvents();

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
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Upcoming cleanups</h2>
            <p>Sign up with a nickname, say how many you're bringing and which gear you can carry.</p>
          </Reveal>
          {upcoming === undefined && <p className="report-meta">Loading cleanups…</p>}
          {upcoming?.length === 0 && (
            <p className="report-meta">
              Nothing scheduled yet. Pick a beach below that has a plan, and organize the first one.
            </p>
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

      <section className="band band-paper">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Beaches that need attention</h2>
            <p>Sorted by the latest debris level, then by how many people have reported them.</p>
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
                  <Link to={`/map?b=${encodeURIComponent(beach.id)}&t=cleanup`} className="cl-row" viewTransition>
                    <div className="cl-main">
                      <strong className="cl-name">{beach.name}</strong>
                      <span className="report-meta">
                        {[beach.local, beach.country].filter(Boolean).join(", ") || "Added by users"}
                      </span>
                    </div>
                    <div className="cl-level">
                      <Level category={list[0].aiAnalysis?.category} />
                      <span className="report-meta">
                        {list.length} report{list.length > 1 ? "s" : ""}, latest {formatTime(list[0].createdAt)}
                      </span>
                    </div>
                    <PlanStatus beach={beach} allReports={reports} />
                    <ChevronRight className="cl-chevron" aria-hidden="true" />
                  </Link>
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
            <h3>Organize a cleanup</h3>
            <p>
              Open a beach with a plan, then choose “Organize a cleanup from this plan”. You set the time and meeting
              point; the AI plan becomes the work order: crew size, teams and a gear checklist volunteers fill in.
            </p>
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
