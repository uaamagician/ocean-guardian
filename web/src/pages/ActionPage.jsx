import { useMemo, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { CalendarCheck, Clock, Megaphone, Package, Users } from "lucide-react";
import { Level } from "../components/ReportDetail";
import { Reveal } from "../components/Motion";
import { Doodle, Footprints, SeaGlass } from "../components/Sketch";
import { AiSaw, Snapshots } from "../components/Snapshots";
import { ORGANIZER_TYPES, headcount, useSignups, useUpcomingEvents } from "../lib/events";
import usePublishedReports from "../lib/usePublishedReports";
import { useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { MIN_REPORTS_FOR_PLAN, planInputs, usePlanRequest, useStoredPlan } from "../lib/cleanup";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";
import "./ActionPage.css";
import "./Events.css";

const SEVERITY_RANK = { heavy: 4, moderate: 3, light: 2, clean: 1 };
const MAX_BEACHES = 12;

const range = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

// A short numbered how-to, drawn across the top of each tab.
function Steps({ items }) {
  return (
    <ol className="cl-steps">
      {items.map((text, i) => (
        <li key={text}>
          {i > 0 && <Footprints className="cl-step-arrow" />}
          <span className="cl-step-num">{i + 1}</span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Join ---------- */

function JoinCard({ event, reports }) {
  const signups = useSignups(event.id);
  const joined = headcount(signups);
  const start = event.startsAt.toDate();
  const left = Math.max(0, event.capacity - joined);
  const evidence = planInputs(reports, event.location);
  return (
    <Link to={`/events/${event.id}`} className="join-tile" viewTransition>
      <div className="join-tile-photo">
        <Snapshots reports={evidence} max={1} />
        <span className="date-sticker" aria-hidden="true">
          <small>{start.toLocaleDateString("en-US", { month: "short" })}</small>
          <strong>{start.getDate()}</strong>
        </span>
      </div>
      <div className="join-tile-body">
        <strong className="join-tile-title">{event.title}</strong>
        <span className="report-meta">
          {start.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}, {event.beachName}
        </span>
        <span className="report-meta">
          {ORGANIZER_TYPES[event.organizer.type]}: {event.organizer.name}
        </span>
        <AiSaw reports={evidence} max={3} />
        <div className="join-tile-spots">
          <div className="wo-bar">
            <span style={{ width: `${Math.min(100, (joined / event.capacity) * 100)}%` }} />
          </div>
          <span>{left === 0 ? "Full" : `${left} of ${event.capacity} spots left`}</span>
        </div>
        <span className="btn btn-primary btn-small join-tile-cta">{left === 0 ? "See details" : "Join this cleanup"}</span>
      </div>
    </Link>
  );
}

function JoinPanel({ upcoming, reports, onOrganize }) {
  return (
    <>
      <div className="cl-panel-head">
        <h2>Pick a cleanup and join</h2>
        <Steps items={["Pick a cleanup below", "Sign in with Google", "Say how many are coming and what gear you'll bring"]} />
      </div>
      {upcoming === undefined && <p className="report-meta">Loading cleanups…</p>}
      {upcoming?.length === 0 && (
        <div className="cl-empty">
          <Doodle name="starfish" className="cl-empty-doodle bob" />
          <h3>No cleanups scheduled yet</h3>
          <p>Be the first. Pick a beach the AI has already looked at and set a time.</p>
          <button type="button" className="btn btn-primary" onClick={onOrganize}>
            Organize the first one
          </button>
        </div>
      )}
      {upcoming?.length > 0 && (
        <ul className="join-grid">
          {upcoming.map((e, i) => (
            <Reveal as="li" key={e.id} delay={Math.min(i, 6) * 30}>
              <JoinCard event={e} reports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- Organize ---------- */

function BeachCard({ beach, list, allReports }) {
  const stored = useStoredPlan(beach.id);
  const ask = usePlanRequest(beach);
  const evidence = planInputs(allReports, beach);
  const record = ask.result?.status === "ok" ? ask.result : stored;
  const plan = record?.plan;
  const ready = evidence.length >= MIN_REPORTS_FOR_PLAN;
  const missing = MIN_REPORTS_FOR_PLAN - evidence.length;
  const beachLink = `/map?b=${encodeURIComponent(beach.id)}&t=cleanup`;

  return (
    <article className="beach-tile">
      <Snapshots reports={evidence.length ? evidence : list} max={3} />
      <div className="beach-tile-body">
        <div className="beach-tile-head">
          <Link to={beachLink} className="beach-tile-name" viewTransition>
            {beach.name}
          </Link>
          <Level category={list[0].aiAnalysis?.category} />
        </div>
        <span className="report-meta">
          {beach.country || "Added by users"}, {list.length} report
          {list.length > 1 ? "s" : ""}
        </span>

        <AiSaw reports={evidence} />

        {plan ? (
          <ul className="ai-plan-line" aria-label="AI plan">
            <li>
              <Users aria-hidden="true" /> {range(plan.volunteers)} people
            </li>
            <li>
              <Clock aria-hidden="true" /> {plan.hours} h
            </li>
            <li>
              <Package aria-hidden="true" /> {plan.gear.length} kinds of gear
            </li>
          </ul>
        ) : stored === undefined ? (
          <p className="report-meta">Checking for a plan…</p>
        ) : ready ? (
          <p className="report-meta">Enough photos for the AI to plan a cleanup here.</p>
        ) : (
          <p className="report-meta">
            The AI needs {missing} more photo report{missing > 1 ? "s" : ""} to plan a cleanup.
          </p>
        )}
        {ask.error && <p className="error-text">{ask.error}</p>}

        <div className="beach-tile-actions">
          {plan ? (
            <Link to={`/events/new?b=${encodeURIComponent(beach.id)}`} className="btn btn-primary btn-small" viewTransition>
              Organize here
            </Link>
          ) : stored === undefined ? null : ready ? (
            <button type="button" className="btn btn-primary btn-small" onClick={ask.run} disabled={ask.loading}>
              {ask.loading ? "The AI is looking at the photos…" : "Ask the AI for a plan"}
            </button>
          ) : (
            <Link to="/report" className="btn btn-small" viewTransition>
              Add a photo
            </Link>
          )}
          <Link to={beachLink} className="btn-text" viewTransition>
            Beach details
          </Link>
        </div>
      </div>
    </article>
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
        <h2>Organize a cleanup</h2>
        <Steps
          items={[
            "Pick a beach people have photographed",
            "Check what the AI saw and planned",
            "Set a time and meeting point, then share the link",
          ]}
        />
      </div>
      {rows === null && <p className="report-meta">Loading beaches…</p>}
      {rows?.length === 0 && (
        <div className="cl-empty">
          <Doodle name="bottle" className="cl-empty-doodle bob" />
          <h3>No beach has been reported yet</h3>
          <p>A cleanup starts from photos. One report puts the first beach here.</p>
          <Link to="/report" className="btn btn-primary" viewTransition>
            Report a beach
          </Link>
        </div>
      )}
      {rows?.length > 0 && (
        <ul className="beach-grid">
          {rows.map(({ beach, list }, i) => (
            <Reveal as="li" key={beach.id} delay={Math.min(i, 6) * 30}>
              <BeachCard beach={beach} list={list} allReports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
      <p className="report-meta cl-guide-note">
        New to beach cleanups? The <Link to="/guide">field guide</Link> explains what you'll find, how to handle it
        safely, and every tool a plan may ask for.
      </p>
    </>
  );
}

export default function ActionPage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const { reports } = usePublishedReports();
  const upcoming = useUpcomingEvents();
  // Older links used #organize.
  const tab = params.get("tab") === "organize" || hash === "#organize" ? "organize" : "join";
  const setTab = (next) => setParams(next === "organize" ? { tab: next } : {}, { replace: true, preventScrollReset: true });

  return (
    <div ref={rootRef}>
      <div className="info-top" />
      <section className="band band-dark cl-top">
        <div className="band-inner">
          <Reveal className="band-head">
            <h2>Beach cleanups</h2>
            <p>
              Join one near you, or organize your own. Every cleanup starts from photos people took at the beach: the
              AI looks at them and works out the crew, the time and the gear.
            </p>
          </Reveal>
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
              <strong>Join a cleanup</strong>
              <span>
                {upcoming?.length
                  ? `${upcoming.length} coming up`
                  : upcoming === undefined
                    ? "See what's scheduled"
                    : "Nothing scheduled yet"}
              </span>
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
              <strong>Organize one</strong>
              <span>Start from a beach the AI has looked at</span>
            </button>
          </div>
        </div>
      </section>

      <section className="band band-paper cl-panel" id="cl-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className="band-inner">
          <SeaGlass className="band-doodle cl-glass" />
          {tab === "join" ? (
            <JoinPanel upcoming={upcoming} reports={reports} onOrganize={() => setTab("organize")} />
          ) : (
            <OrganizePanel reports={reports} />
          )}
        </div>
      </section>
    </div>
  );
}
