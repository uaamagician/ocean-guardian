import { useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { ClipboardList, Sparkles, Users } from "lucide-react";
import Hero from "../components/Hero";
import ReportsMap from "../components/ReportsMap";
import FadeImg from "../components/FadeImg";
import LiveOcean from "../components/LiveOcean";
import Journey from "../components/Journey";
import { Reveal } from "../components/Motion";
import { Doodle, Footprints, Marked, SeaGlass } from "../components/Sketch";
import { FinalCta, GuideTeaser, WhyItMatters } from "../components/Story";
import JoinCard from "../components/JoinCard";
import { Crab } from "../components/Life";
import { useLatestPlan, usePlanCount } from "../lib/cleanup";
import { useUpcomingEvents } from "../lib/events";
import { HISTORY_PHOTOS } from "../lib/history";
import { TOOL_BY_ID } from "../lib/guide";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import usePublishedReports from "../lib/usePublishedReports";
import { useBeaches, useReportsByBeach } from "../lib/beaches";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";
import SeaSurface from "../components/SeaSurface";
import ReportCard from "../components/ReportCard";

// Live numbers and the next cleanups, straight under the hero.
function RightNow({ reports }) {
  const { beaches } = useBeaches();
  const { byBeach } = useReportsByBeach(beaches, reports);
  const upcoming = useUpcomingEvents();
  const plans = usePlanCount();
  const stats = [
    { value: reports?.length, label: "beach reports", to: "/map" },
    { value: beaches && reports ? byBeach.size : undefined, label: "beaches reported", to: "/map" },
    { value: plans, label: "AI cleanup plans", to: "/action?tab=organize" },
    { value: upcoming?.length, label: "cleanups coming up", to: "/action" },
  ];
  return (
    <section className="band right-now">
      <Crab />
      <div className="band-inner">
        <div className="right-now-head">
          <h2>Right now</h2>
          <span className="report-meta">Live from the beach map and the cleanup board</span>
        </div>
        <ul className="now-stats">
          {stats.map((s, i) => (
            <Reveal as="li" key={s.label} delay={i * 40}>
              <Link to={s.to} className="now-stat" viewTransition>
                <strong>{s.value ?? "–"}</strong>
                <span>{s.label}</span>
              </Link>
            </Reveal>
          ))}
        </ul>

        <div className="now-next">
          <h3>Next cleanups</h3>
          <Link to="/action" className="btn-text" viewTransition>
            All cleanups
          </Link>
        </div>
        {upcoming === undefined && <p className="report-meta">Loading cleanups…</p>}
        {upcoming?.length === 0 && (
          <div className="cl-empty now-empty">
            <p>No cleanups scheduled yet. Beaches with an AI plan are ready for one.</p>
            <Link to="/action?tab=organize" className="btn btn-primary" viewTransition>
              Organize a cleanup
            </Link>
          </div>
        )}
        {upcoming?.length > 0 && (
          <ul className="join-grid">
            {upcoming.slice(0, 3).map((e) => (
              <li key={e.id}>
                <JoinCard event={e} reports={reports} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WorldMap({ reports }) {
  const navigate = useNavigate();
  const { beaches } = useBeaches();
  const { unmatched, tones } = useReportsByBeach(beaches, reports);
  return (
    <section className="band band-paper sand-drift">
      <div className="band-inner">
        <div className="band-split">
          <Reveal className="band-head">
            <h2>
              Every beach, <Marked kind="underline">one map</Marked>
            </h2>
            <p>15,000+ beaches, colored by their latest report. Click one for water conditions and reports.</p>
          </Reveal>
          <Link to="/map" className="btn" viewTransition>
            Open the full map
          </Link>
        </div>
        <Doodle name="gull" className="band-doodle map-gull" />
        <Doodle name="gull" className="band-doodle map-gull map-gull-2" delay={250} />
        <Reveal className="map-preview taped">
          <ReportsMap
            beaches={beaches}
            beachTones={tones}
            onSelectBeach={(id) => navigate(`/map?b=${encodeURIComponent(id)}`)}
            reports={unmatched}
            onSelectReport={(id) => navigate(`/map?r=${id}`)}
            scrollWheelZoom={false}
          />
        </Reveal>
      </div>
    </section>
  );
}

const LEVEL_ORDER = ["clean", "light", "moderate", "heavy"];

function DebrisStats({ reports }) {
  const stats = useMemo(() => {
    const trash = (reports ?? []).filter((r) => r.type === "trash" && r.aiAnalysis);
    const levels = Object.fromEntries(LEVEL_ORDER.map((k) => [k, 0]));
    const items = new Map();
    for (const r of trash) {
      if (r.aiAnalysis.category in levels) levels[r.aiAnalysis.category] += 1;
      for (const item of new Set(r.aiAnalysis.items ?? [])) items.set(item, (items.get(item) ?? 0) + 1);
    }
    const topItems = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { total: trash.length, levels, topItems };
  }, [reports]);

  const maxItem = stats.topItems[0]?.[1] ?? 1;

  return (
    <section className="band band-dark">
      <div className="band-inner">
        <Reveal className="band-head">
          <h2>Marine debris at a glance</h2>
          <p>Counted from every public report.</p>
        </Reveal>
        <div className="stats">
          <div className="stat-big">
            <strong>{reports === null ? "–" : stats.total}</strong>
            <span>beach debris reports</span>
          </div>

          <div className="stat-block">
            <h3>Debris levels</h3>
            <div className="level-bar" role="img" aria-label="Share of reports at each debris level">
              {LEVEL_ORDER.map((k) =>
                stats.levels[k] ? (
                  <span
                    key={k}
                    style={{
                      width: `${(stats.levels[k] / stats.total) * 100}%`,
                      background: TONE_COLORS[CATEGORIES[k].tone],
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className="level-legend">
              {LEVEL_ORDER.map((k) => (
                <li key={k}>
                  <span className="level-dot" data-tone={CATEGORIES[k].tone} />
                  {CATEGORIES[k].label} {stats.levels[k]}
                </li>
              ))}
            </ul>
          </div>

          <div className="stat-block">
            <h3>Most common items</h3>
            {stats.topItems.length === 0 ? (
              <p className="data-note">Not enough analyzed reports yet.</p>
            ) : (
              <ul className="item-bars">
                {stats.topItems.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span className="bar" style={{ width: `${(count / maxItem) * 100}%` }} />
                    <span className="count">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ reports }) {
  const latest = (reports ?? []).slice(0, 4);
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-split">
          <Reveal className="band-head">
            <h2>
              Report a beach in <Marked kind="circle" delay={300}>three steps</Marked>
            </h2>
            <p>No sign-up, no forms. Up to four photos, wide or close up.</p>
          </Reveal>
          <Link to="/report" className="btn btn-primary" viewTransition>
            Start reporting
          </Link>
        </div>
        <SeaGlass className="band-doodle steps-glass" />
        <ol className="steps">
          <li>
            <h3>Snap and upload</h3>
            <p>Your location is added automatically.</p>
          </li>
          <li>
            <Footprints className="step-arrow" />
            <h3>AI analysis</h3>
            <p>Gemini names the debris and rates the beach, and asks for a closer photo when unsure.</p>
          </li>
          <li>
            <Footprints className="step-arrow" />
            <h3>Map update</h3>
            <p>Confident reports go on the beach map right away.</p>
          </li>
        </ol>
        {latest.length > 0 && (
          <>
            <div className="latest-head">
              <h3>Latest reports</h3>
              <Link to="/reports" className="btn-text" viewTransition>
                See all reports
              </Link>
            </div>
            <div className="latest">
              {latest.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

const span = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

function LatestPlan({ record }) {
  const { plan } = record;
  return (
    <Link to={`/map?b=${encodeURIComponent(record.beachId)}&t=cleanup`} className="plan-example taped" viewTransition>
      <span className="plan-tag">Latest AI plan: {record.name}</span>
      <dl>
        <dt>Volunteers</dt>
        <dd>{span(plan.volunteers)} people</dd>
        <dt>Estimated time</dt>
        <dd>
          {plan.hours} hour{plan.hours === 1 ? "" : "s"}
        </dd>
        <dt>Gear</dt>
        <dd>
          {plan.gear
            .map((g) => TOOL_BY_ID[g.tool]?.name)
            .filter(Boolean)
            .join(", ")}
        </dd>
        <dt>Heavy machinery</dt>
        <dd>{plan.heavyMachinery.needed ? "Needed" : "Not needed"}</dd>
      </dl>
    </Link>
  );
}

function CleanupPreview() {
  const latest = useLatestPlan();
  return (
    <section className="band band-dark sea-calm">
      <SeaSurface calm />
      <div className="band-inner">
        <div className="band-split">
          <Reveal className="band-head">
            <h2>Plan a cleanup from the reports</h2>
            <p>With two or more reports, AI estimates the crew, time and gear, so organizers can skip the site visit.</p>
            <Link to="/action?tab=organize" className="btn" viewTransition>
              See beaches that need a cleanup
            </Link>
          </Reveal>
          {latest && <LatestPlan record={latest} />}
        </div>
        <ul className="features">
          <li>
            <Sparkles aria-hidden="true" />
            <h3>AI cleanup plan</h3>
            <p>Crew, hours, bags and gear from the reports.</p>
          </li>
          <li>
            <Users aria-hidden="true" />
            <h3>Sign-ups</h3>
            <p>Volunteers sign in with Google and tick the gear they'll bring.</p>
          </li>
          <li>
            <ClipboardList aria-hidden="true" />
            <h3>Work order</h3>
            <p>Teams, a gear checklist and hazards, printable for the day.</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

// Three of the most recent cleanups from the history page.
function HistoryTeaser() {
  const picks = HISTORY_PHOTOS.slice(-3).reverse();
  return (
    <section className="band band-deep sea-calm">
      <SeaSurface calm />
      <div className="band-inner">
        <div className="band-split">
          <Reveal className="band-head">
            <h2>
              Cleanups that <Marked kind="underline">came before</Marked>
            </h2>
            <p>Cleanups volunteers photographed and shared, from 1986 to today.</p>
          </Reveal>
          <Link to="/history" className="btn" viewTransition>
            See the cleanup history
          </Link>
        </div>
        <ul className="history-strip">
          {picks.map((h, i) => (
            <Reveal as="li" key={h.source} delay={i * 40}>
              <Link to="/history" className="history-snap" viewTransition>
                <FadeImg src={h.image} alt={`Beach cleanup, ${h.place}`} loading="lazy" />
                <span className="history-snap-place">{h.place}</span>
                <span className="history-snap-meta">
                  {h.country}, {h.date.slice(0, 4)}
                </span>
              </Link>
              <small className="history-snap-credit">
                Photo: {h.credit}, {h.license}
              </small>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { reports } = usePublishedReports();
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  return (
    <div ref={rootRef}>
      <Hero />
      <RightNow reports={reports} />
      <WorldMap reports={reports} />
      <div className="sea-run">
        <SeaSurface />
        <DebrisStats reports={reports} />
        <LiveOcean />
      </div>
      <HowItWorks reports={reports} />
      <CleanupPreview />
      <Journey />
      <WhyItMatters />
      <GuideTeaser />
      <HistoryTeaser />
      <FinalCta />
    </div>
  );
}
