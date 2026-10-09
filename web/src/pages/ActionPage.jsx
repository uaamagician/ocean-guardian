import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { CalendarCheck, Clock, MapPin, Megaphone, Users } from "lucide-react";
import { Level } from "../components/ReportDetail";
import { Reveal } from "../components/Motion";
import { Thumb } from "../components/Snapshots";
import ListToolbar from "../components/ListToolbar";
import { ORGANIZER_TYPES, headcount, useSignups, useUpcomingEvents } from "../lib/events";
import { organizerLabel } from "../lib/english";
import usePublishedReports, { distanceKm } from "../lib/usePublishedReports";
import { getPosition } from "../lib/reports";
import { useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { MIN_REPORTS_FOR_PLAN, planInputs, topItems, usePlanIds, usePlanRequest, useStoredPlan } from "../lib/cleanup";
import "./Home.css";
import "./ActionPage.css";
import "./Events.css";

const SEVERITY_RANK = { heavy: 4, moderate: 3, light: 2, clean: 1 };
const PAGE = 12;

const matches = (query, ...fields) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
};

const regionsOf = (items, getRegion) =>
  [...new Set(items.map(getRegion).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Asks for the visitor's location the first time "Nearest to me" is picked.
function useMyPosition(wanted) {
  const [state, setState] = useState({ here: null, error: "" });
  useEffect(() => {
    if (!wanted || state.here || state.error) return undefined;
    let cancelled = false;
    getPosition()
      .then((here) => !cancelled && setState({ here, error: "" }))
      .catch((err) => !cancelled && setState({ here: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [wanted, state.here, state.error]);
  return state;
}

function ShowMore({ shown, total, onMore }) {
  if (shown >= total) return null;
  return (
    <button type="button" className="btn cl-more" onClick={onMore}>
      Show {Math.min(PAGE, total - shown)} more
    </button>
  );
}

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
          {organizerLabel(event.organizer, ORGANIZER_TYPES)}
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

const JOIN_SORTS = { soonest: "Soonest first", largest: "Largest first", nearest: "Nearest to me" };

function JoinPanel({ upcoming, reports, onOrganize }) {
  const { beaches } = useAllBeaches();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("soonest");
  const [limit, setLimit] = useState(PAGE);
  const { here, error } = useMyPosition(sort === "nearest");

  const regionOf = useMemo(() => {
    const byId = new Map((beaches ?? []).map((b) => [b.id, b.country]));
    return (e) => byId.get(e.beachId);
  }, [beaches]);

  const list = useMemo(() => {
    if (!upcoming) return upcoming;
    const found = upcoming.filter(
      (e) => matches(query, e.title, e.beachName, e.organizer.name) && (!region || regionOf(e) === region),
    );
    if (sort === "largest") return [...found].sort((a, b) => b.capacity - a.capacity);
    if (sort === "nearest" && here) return [...found].sort((a, b) => distanceKm(here, a.location) - distanceKm(here, b.location));
    return found;
  }, [upcoming, query, region, sort, here, regionOf]);

  return (
    <>
      <div className="cl-panel-head">
        <h2>Upcoming cleanups</h2>
        <p>Open one to see the work order, then sign in with Google to join.</p>
      </div>
      {upcoming?.length > 0 && (
        <ListToolbar
          query={query}
          onQuery={(v) => {
            setQuery(v);
            setLimit(PAGE);
          }}
          placeholder="Search by beach, title or organizer"
          regions={regionsOf(upcoming, regionOf)}
          region={region}
          onRegion={setRegion}
          sorts={JOIN_SORTS}
          sort={sort}
          onSort={setSort}
          count={list.length}
          noun="cleanup"
          note={sort === "nearest" ? (error ? "Location unavailable" : here ? "" : "Finding you…") : ""}
        />
      )}
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
      {upcoming?.length > 0 && list.length === 0 && <p className="cl-none">No cleanups match. Try another search or region.</p>}
      {list?.length > 0 && (
        <ul className="cl-list">
          {list.slice(0, limit).map((e, i) => (
            <Reveal as="li" key={e.id} delay={Math.min(i, 6) * 30}>
              <EventRow event={e} reports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
      {list && <ShowMore shown={limit} total={list.length} onMore={() => setLimit((n) => n + PAGE)} />}
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

const ORGANIZE_SORTS = {
  dirtiest: "Dirtiest first",
  recent: "Latest report",
  reports: "Most reports",
  nearest: "Nearest to me",
  name: "Name A–Z",
};
const ORGANIZE_STATUS = { all: "All beaches", planned: "AI plan ready", needs: "Needs more photos" };

const newest = (list) => list[0].createdAt?.toMillis?.() ?? 0;

function OrganizePanel({ reports }) {
  const { beaches } = useAllBeaches();
  const { byBeach } = useReportsByBeach(beaches, reports);
  const planIds = usePlanIds();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("dirtiest");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const { here, error } = useMyPosition(sort === "nearest");

  const all = useMemo(() => {
    if (!beaches) return null;
    const byId = new Map(beaches.map((b) => [b.id, b]));
    return [...byBeach.entries()]
      .map(([id, list]) => ({ beach: byId.get(id), list }))
      .filter((r) => r.beach)
      .map((r) => ({ ...r, evidence: planInputs(reports, r.beach).length }));
  }, [beaches, byBeach, reports]);

  const rows = useMemo(() => {
    if (!all) return null;
    const found = all.filter(
      ({ beach, evidence }) =>
        matches(query, beach.name, beach.country) &&
        (!region || beach.country === region) &&
        (status === "all" ||
          (status === "planned" && planIds?.has(beach.id)) ||
          (status === "needs" && !planIds?.has(beach.id) && evidence < MIN_REPORTS_FOR_PLAN)),
    );
    const bySeverity = (a, b) =>
      (SEVERITY_RANK[b.list[0].aiAnalysis?.category] ?? 0) - (SEVERITY_RANK[a.list[0].aiAnalysis?.category] ?? 0) ||
      b.list.length - a.list.length;
    const order = {
      dirtiest: bySeverity,
      recent: (a, b) => newest(b.list) - newest(a.list),
      reports: (a, b) => b.list.length - a.list.length || bySeverity(a, b),
      nearest: here ? (a, b) => distanceKm(here, a.beach) - distanceKm(here, b.beach) : bySeverity,
      name: (a, b) => a.beach.name.localeCompare(b.beach.name),
    }[sort];
    return [...found].sort(order);
  }, [all, query, region, status, sort, here, planIds]);

  const reset = (setter) => (value) => {
    setter(value);
    setLimit(PAGE);
  };

  return (
    <>
      <div className="cl-panel-head">
        <h2>Pick a beach</h2>
        <p>
          A beach with an AI plan can host a cleanup now: you set the date and meeting point, and the plan becomes the
          work order.
        </p>
      </div>
      {all?.length > 0 && (
        <ListToolbar
          query={query}
          onQuery={reset(setQuery)}
          placeholder="Search beaches"
          regions={regionsOf(all, (r) => r.beach.country)}
          region={region}
          onRegion={reset(setRegion)}
          sorts={ORGANIZE_SORTS}
          sort={sort}
          onSort={setSort}
          statuses={ORGANIZE_STATUS}
          status={status}
          onStatus={reset(setStatus)}
          count={rows.length}
          noun="beach"
          plural="beaches"
          note={sort === "nearest" ? (error ? "Location unavailable" : here ? "" : "Finding you…") : ""}
        />
      )}
      {all === null && <p className="report-meta">Loading beaches…</p>}
      {all?.length === 0 && (
        <div className="cl-empty">
          <h3>No beach has been reported yet</h3>
          <p>A cleanup starts from photos. One report puts the first beach here.</p>
          <Link to="/report" className="btn btn-primary" viewTransition>
            Report a beach
          </Link>
        </div>
      )}
      {all?.length > 0 && rows.length === 0 && <p className="cl-none">No beaches match. Try another search or filter.</p>}
      {rows?.length > 0 && (
        <ul className="cl-list">
          {rows.slice(0, limit).map(({ beach, list }, i) => (
            <Reveal as="li" key={beach.id} delay={Math.min(i, 6) * 30}>
              <BeachRow beach={beach} list={list} allReports={reports} />
            </Reveal>
          ))}
        </ul>
      )}
      {rows && <ShowMore shown={limit} total={rows.length} onMore={() => setLimit((n) => n + PAGE)} />}
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
