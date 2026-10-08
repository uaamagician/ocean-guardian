import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { CalendarCheck, Clock, MapPin, Megaphone, Users } from "lucide-react";
import { Level } from "../components/ReportDetail";
import { Reveal } from "../components/Motion";
import { Thumb } from "../components/Snapshots";
import { ORGANIZER_TYPES, headcount, useSignups, useUpcomingEvents } from "../lib/events";
import usePublishedReports from "../lib/usePublishedReports";
import { useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { MIN_REPORTS_FOR_PLAN, planInputs, topItems, usePlanRequest, useStoredPlan } from "../lib/cleanup";
import "./Home.css";
import "./ActionPage.css";
import "./Events.css";

const SEVERITY_RANK = { heavy: 4, moderate: 3, light: 2, clean: 1 };
const MAX_BEACHES = 12;

const range = ({ min, max }) => (min === max ? `${min}` : `${min}–${max}`);

/* ---------- Join: one row per upcoming cleanup ---------- */

function EventRow({ event, reports }) {
  const signups = useSignups(event.id);
  const joined = headcount(signups);
  const left = Math.max(0, event.capacity - joined);
  const start = event.startsAt.toDate();
  const evidence = planInputs(reports, event.location);
  const found = topItems(evidence, 3);
  return (
    <Link to={`/events/${event.id}`} className="cl-row" viewTransition>
      <span className="cl-date" aria-hidden="true">
        <small>{start.toLocaleDateString("en-US", { month: "short" })}</small>
        <strong>{start.getDate()}</strong>
        <small>{start.toLocaleDateString("en-US", { weekday: "short" })}</small>
      </span>
      <Thumb reports={evidence} />
      <span className="cl-main">
        <strong className="cl-title">{event.title}</strong>
        <span className="cl-meta">
          <span>
            <Clock aria-hidden="true" />
            {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, {event.durationHours} h
          </span>
          <span>
            <MapPin aria-hidden="true" />
            {event.beachName}
          </span>
        </span>
        <span className="cl-sub">
          {ORGANIZER_TYPES[event.organizer.type]}: {event.organizer.name}
          {found.length > 0 && ` · Expect ${found.join(", ")}`}
        </span>
      </span>
      <span className="cl-side">
        <span className="cl-spots">
          <span className="wo-bar">
            <span style={{ width: `${Math.min(100, (joined / event.capacity) * 100)}%` }} />
          </span>
          {left === 0 ? "Full" : `${left} of ${event.capacity} spots left`}
        </span>
        <span className="btn btn-primary btn-small">{left === 0 ? "Details" : "Join"}</span>
      </span>
    </Link>
  );
}

function JoinPanel({ upcoming, reports, onOrganize }) {
  return (
    <>
      <div className="cl-panel-head">
        <h2>Upcoming cleanups</h2>
        <p>Open one to see the work order, then sign in with Google to join.</p>
      </div>
      {upcoming === undefined && <p className="report-meta">Loading cleanups…</p>}
      {upcoming?.length === 0 && (
        <div className="cl-empty">
          <h3>No cleanups scheduled yet</h3>
          <p>Beaches with an AI plan are ready for one.</p>
          <button type="button" className="btn btn-primary" onClick={onOrganize}>
            Organize the first one
          </button>
        </div>
      )}
      {upcoming?.length > 0 && (
        <ul className="cl-list">
          {upcoming.map((e, i) => (
            <Reveal as="li" key={e.id} delay={Math.min(i, 6) * 30}>
              <EventRow event={e} reports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- Organize: one row per reported beach ---------- */

function BeachRow({ beach, list, allReports }) {
  const stored = useStoredPlan(beach.id);
  const ask = usePlanRequest(beach);
  const evidence = planInputs(allReports, beach);
  const record = ask.result?.status === "ok" ? ask.result : stored;
  const plan = record?.plan;
  const ready = evidence.length >= MIN_REPORTS_FOR_PLAN;
  const missing = MIN_REPORTS_FOR_PLAN - evidence.length;
  const found = topItems(evidence, 3);
  const beachLink = `/map?b=${encodeURIComponent(beach.id)}&t=cleanup`;

  return (
    <div className="cl-row is-static">
      <Thumb reports={evidence.length ? evidence : list} />
      <span className="cl-main">
        <Link to={beachLink} className="cl-title" viewTransition>
          {beach.name}
        </Link>
        <span className="cl-meta">
          <Level category={list[0].aiAnalysis?.category} />
          <span>
            {list.length} report{list.length > 1 ? "s" : ""}
            {beach.country ? `, ${beach.country}` : ""}
          </span>
        </span>
        {found.length > 0 && <span className="cl-sub">Found: {found.join(", ")}</span>}
      </span>
      <span className="cl-side">
        {plan ? (
          <span className="cl-plan">
            <Users aria-hidden="true" /> {range(plan.volunteers)} people
            <Clock aria-hidden="true" /> {plan.hours} h
          </span>
        ) : (
          <span className="cl-plan is-muted">
            {stored === undefined
              ? "Checking…"
              : ready
                ? "Ready for an AI plan"
                : `Needs ${missing} more report${missing > 1 ? "s" : ""}`}
          </span>
        )}
        {ask.error && <span className="error-text">{ask.error}</span>}
        {plan ? (
          <Link to={`/events/new?b=${encodeURIComponent(beach.id)}`} className="btn btn-primary btn-small" viewTransition>
            Organize here
          </Link>
        ) : stored === undefined ? null : ready ? (
          <button type="button" className="btn btn-primary btn-small" onClick={ask.run} disabled={ask.loading}>
            {ask.loading ? "Planning…" : "Get AI plan"}
          </button>
        ) : (
          <Link to="/report" className="btn btn-small" viewTransition>
            Add a photo
          </Link>
        )}
      </span>
    </div>
  );
}

function OrganizePanel({ reports }) {
  const { beaches } = useAllBeaches();
  const { byBeach } = useReportsByBeach(beaches, reports);

  // Dirtiest first, then the beaches with the most evidence.
  const rows = useMemo(() => {
    if (!beaches) return null;
    const byId = new Map(beaches.map((b) => [b.id, b]));
    return [...byBeach.entries()]
      .map(([id, list]) => ({ beach: byId.get(id), list }))
      .filter((r) => r.beach)
      .sort(
        (a, b) =>
          (SEVERITY_RANK[b.list[0].aiAnalysis?.category] ?? 0) - (SEVERITY_RANK[a.list[0].aiAnalysis?.category] ?? 0) ||
          b.list.length - a.list.length,
      )
      .slice(0, MAX_BEACHES);
  }, [beaches, byBeach]);

  return (
    <>
      <div className="cl-panel-head">
        <h2>Pick a beach</h2>
        <p>
          A beach with an AI plan can host a cleanup now: you set the date and meeting point, and the plan becomes the
          work order.
        </p>
      </div>
      {rows === null && <p className="report-meta">Loading beaches…</p>}
      {rows?.length === 0 && (
        <div className="cl-empty">
          <h3>No beach has been reported yet</h3>
          <p>A cleanup starts from photos. One report puts the first beach here.</p>
          <Link to="/report" className="btn btn-primary" viewTransition>
            Report a beach
          </Link>
        </div>
      )}
      {rows?.length > 0 && (
        <ul className="cl-list">
          {rows.map(({ beach, list }, i) => (
            <Reveal as="li" key={beach.id} delay={Math.min(i, 6) * 30}>
              <BeachRow beach={beach} list={list} allReports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ActionPage() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const { reports } = usePublishedReports();
  const upcoming = useUpcomingEvents();
  // Older links used #organize.
  const tab = params.get("tab") === "organize" || hash === "#organize" ? "organize" : "join";
  const setTab = (next) => setParams(next === "organize" ? { tab: next } : {}, { replace: true, preventScrollReset: true });

  return (
    <div className="cl-page">
      <header className="cl-header">
        <div className="cl-header-inner">
          <h1>Beach cleanups</h1>
          <div className="cl-tabs" role="tablist" aria-label="Join or organize">
            <button
              type="button"
              role="tab"
              id="tab-join"
              aria-selected={tab === "join"}
              aria-controls="cl-panel"
              className="cl-tab"
              onClick={() => setTab("join")}
            >
              <CalendarCheck aria-hidden="true" />
              Join
              {upcoming?.length > 0 && <span className="cl-count">{upcoming.length}</span>}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-organize"
              aria-selected={tab === "organize"}
              aria-controls="cl-panel"
              className="cl-tab"
              onClick={() => setTab("organize")}
            >
              <Megaphone aria-hidden="true" />
              Organize
            </button>
          </div>
        </div>
      </header>

      <section className="cl-panel" id="cl-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "join" ? (
          <JoinPanel upcoming={upcoming} reports={reports} onOrganize={() => setTab("organize")} />
        ) : (
          <OrganizePanel reports={reports} />
        )}
      </section>
    </div>
  );
}
