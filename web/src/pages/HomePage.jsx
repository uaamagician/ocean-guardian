import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Package, Sparkles, Users } from "lucide-react";
import Hero from "../components/Hero";
import ReportsMap from "../components/ReportsMap";
import { Level } from "../components/ReportDetail";
import usePhotoUrls from "../lib/usePhotoUrls";
import LiveOcean from "../components/LiveOcean";
import { CATEGORIES, TONE_COLORS, formatTime } from "../lib/labels";
import usePublishedReports from "../lib/usePublishedReports";
import "./Home.css";

function WorldMap({ reports }) {
  const navigate = useNavigate();
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>Beaches around the world, right now</h2>
            <p>Every dot is a report analyzed by AI. Click anywhere on the sea to see that spot's live water temperature and coral bleaching alert.</p>
          </div>
          <Link to="/map" className="btn">
            Open the full map
          </Link>
        </div>
        <div className="map-preview">
          <ReportsMap
            reports={reports}
            scrollWheelZoom={false}
            onSelect={(id) => navigate(`/map?r=${id}`)}
            onMapClick={({ lat, lng }) => navigate(`/map?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}`)}
          />
        </div>
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
    <section className="band band-deep">
      <div className="band-inner">
        <div className="band-head">
          <h2>Marine debris at a glance</h2>
          <p>Counted from every public report. The more people report, the closer this gets to the real coastline.</p>
        </div>
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

function LatestCard({ report }) {
  const [cover] = usePhotoUrls(report.photos?.slice(0, 1) ?? []);
  return (
    <Link to={`/map?r=${report.id}`} className="latest-card">
      {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="latest-card-placeholder" />}
      <Level category={report.aiAnalysis?.category} />
      <span className="report-meta">{formatTime(report.createdAt)}</span>
      {report.aiAnalysis?.items?.length > 0 && (
        <ul className="report-items">
          {report.aiAnalysis.items.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function HowItWorks({ reports }) {
  const latest = (reports ?? []).slice(0, 4);
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>Report a beach in three steps</h2>
            <p>No sign-up and no forms. Shoot it however you like, wide or close up, with up to four photos.</p>
          </div>
          <Link to="/report" className="btn btn-primary">
            Start reporting
          </Link>
        </div>
        <ol className="steps">
          <li>
            <h3>Snap and upload</h3>
            <p>Photograph the beach in front of you. Your location is added automatically.</p>
          </li>
          <li>
            <h3>AI analysis</h3>
            <p>Gemini identifies the debris and how bad it is, and asks for another photo when something is unclear.</p>
          </li>
          <li>
            <h3>Map update</h3>
            <p>Reports the AI is confident about appear on the world beach map right away.</p>
          </li>
        </ol>
        {latest.length > 0 && (
          <>
            <h3>Latest reports</h3>
            <div className="latest">
              {latest.map((r) => (
                <LatestCard key={r.id} report={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CleanupPreview() {
  return (
    <section className="band band-dark">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>Join a beach cleanup</h2>
            <p>
              Once a beach has enough reports, AI estimates how many people, how much time, and which tools a cleanup needs. Organizers can skip the site visit, and a small club can team up with a company volunteer group to fill a crew.
            </p>
          </div>
          <div className="plan-example">
            <span className="plan-tag">Preview, in development</span>
            <dl>
              <dt>Volunteers</dt>
              <dd>20 to 25 people</dd>
              <dt>Estimated time</dt>
              <dd>1.5 hours</dd>
              <dt>Gear</dt>
              <dd>Net cutters, carts, puncture-proof gloves</dd>
              <dt>Heavy machinery</dt>
              <dd>Not needed</dd>
            </dl>
          </div>
        </div>
        <ul className="features">
          <li>
            <Sparkles aria-hidden="true" />
            <h3>AI cleanup planning</h3>
            <p>From the reported debris and how far it spreads, estimate the crew, the hours, and what to bring.</p>
          </li>
          <li>
            <Users aria-hidden="true" />
            <h3>Team up and sign up</h3>
            <p>Companies, NGOs, and school clubs can host a cleanup, and anyone can sign up online.</p>
          </li>
          <li>
            <Package aria-hidden="true" />
            <h3>Cleanup impact</h3>
            <p>Take another photo afterward. The before-and-after comparison becomes data you can put in an ESG report.</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { reports } = usePublishedReports();
  return (
    <>
      <Hero />
      <LiveOcean />
      <WorldMap reports={reports} />
      <DebrisStats reports={reports} />
      <HowItWorks reports={reports} />
      <CleanupPreview />
    </>
  );
}
