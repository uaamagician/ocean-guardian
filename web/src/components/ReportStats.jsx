import { useMemo } from "react";
import { Link } from "react-router";
import usePublishedReports, { distanceKm } from "../lib/usePublishedReports";
import { useBeaches, useReportsByBeach } from "../lib/beaches";
import { MIN_REPORTS_FOR_PLAN, topItems } from "../lib/cleanup";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import { coastOf } from "../lib/regions";
import { commonsCredit } from "../lib/commonsReports";
import "./ReportStats.css";

const LEVELS = ["clean", "light", "moderate", "heavy"];
const WEIGHT = { clean: 0, light: 1, moderate: 2, heavy: 3 };
const MONTHS = 6;

// A stacked bar of how many reports landed at each debris level.
function LevelBar({ reports, label }) {
  const total = reports.length;
  return (
    <div className="level-bar" role="img" aria-label={label}>
      {LEVELS.map((k) => {
        const n = reports.filter((r) => r.aiAnalysis.category === k).length;
        return n ? <span key={k} style={{ width: `${(n / total) * 100}%`, background: TONE_COLORS[CATEGORIES[k].tone] }} /> : null;
      })}
    </div>
  );
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

// What the reports people send in add up to: every number here is counted
// from the published beach reports, so the section grows as they come in.
export default function ReportStats() {
  const { reports } = usePublishedReports();
  const { beaches } = useBeaches();
  const { byBeach, beachOfReport } = useReportsByBeach(beaches, reports);

  const stats = useMemo(() => {
    if (!reports || !beaches) return null;
    const byId = new Map(beaches.map((b) => [b.id, b]));
    const trash = reports.filter((r) => r.type === "trash" && r.aiAnalysis && r.aiAnalysis.category in WEIGHT);
    if (trash.length === 0) return { trash };

    // A report away from any listed beach still belongs to a country: take it
    // from the closest beach within 100 km.
    const countryNear = (loc) => {
      let best = null;
      let bestKm = 100;
      for (const b of beaches) {
        if (Math.abs(b.lat - loc.lat) > 1 || Math.abs(b.lng - loc.lng) > 1.5) continue;
        const km = distanceKm(loc, b);
        if (km < bestKm) {
          best = b;
          bestKm = km;
        }
      }
      return best?.country ?? null;
    };

    // By stretch of coast.
    const coasts = new Map();
    for (const r of trash) {
      const beach = byId.get(beachOfReport.get(r.id));
      const country = commonsCredit(r)?.country ?? beach?.country ?? countryNear(r.location);
      const coast = coastOf(r.location.lat, r.location.lng, country);
      if (!coasts.has(coast)) coasts.set(coast, []);
      coasts.get(coast).push(r);
    }

    // Reports per month, the last six months.
    const now = new Date();
    const months = Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
      return { key: monthKey(d), label: d.toLocaleDateString("en-US", { month: "short" }), count: 0 };
    });
    for (const r of trash) {
      const m = months.find((x) => x.key === monthKey(r.createdAt.toDate()));
      if (m) m.count += 1;
    }

    // Beaches that most need a cleanup: how bad the latest report is, then how
    // often it has been reported.
    const needs = [...byBeach.entries()]
      .map(([id, list]) => ({ beach: byId.get(id), list: list.filter((r) => trash.includes(r)) }))
      .filter(({ beach, list }) => beach && list.length && list[0].aiAnalysis.category !== "clean")
      .sort((a, b) => WEIGHT[b.list[0].aiAnalysis.category] - WEIGHT[a.list[0].aiAnalysis.category] || b.list.length - a.list.length)
      .slice(0, 5);

    const first = trash.reduce((a, r) => (r.createdAt.toMillis() < a.createdAt.toMillis() ? r : a));
    const fromCommons = trash.filter((r) => commonsCredit(r)).length;
    return {
      trash,
      fromCommons,
      beachCount: new Set(trash.map((r) => beachOfReport.get(r.id)).filter(Boolean)).size,
      since: first.createdAt.toDate().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      coasts: [...coasts.entries()].sort((a, b) => b[1].length - a[1].length),
      months,
      items: (() => {
        const counts = new Map();
        for (const r of trash) for (const item of new Set(r.aiAnalysis.items ?? [])) counts.set(item, (counts.get(item) ?? 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      })(),
      needs,
    };
  }, [reports, beaches, byBeach, beachOfReport]);

  return (
    <section className="info-section report-stats" id="reports">
      <h2>What the reports show</h2>
      {!stats && <p className="report-meta">Counting the reports…</p>}
      {stats?.trash.length === 0 && (
        <p className="info-lead">
          No beach reports yet. <Link to="/report">Send the first one</Link> and it shows up here.
        </p>
      )}
      {stats?.trash.length > 0 && (
        <>
          <p className="stats-tally">
            So far, <strong>{stats.trash.length}</strong> beach {stats.trash.length === 1 ? "report" : "reports"} from{" "}
            <strong>{stats.beachCount}</strong> {stats.beachCount === 1 ? "beach" : "beaches"}, since {stats.since}.
          </p>
          {stats.fromCommons > 0 && (
            <p className="data-note">
              {stats.trash.length - stats.fromCommons} sent in by visitors and {stats.fromCommons} from freely licensed
              Wikimedia Commons photos, each rated by the same AI at the place it was taken.
            </p>
          )}

          <div className="stats-grid">
            <div className="stats-block stats-coasts">
              <h3>By coast</h3>
              <table className="coast-table">
                <thead>
                  <tr>
                    <th scope="col">Coast</th>
                    <th scope="col">Reports</th>
                    <th scope="col">Debris levels</th>
                    <th scope="col">Found most</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.coasts.map(([coast, list]) => (
                    <tr key={coast}>
                      <th scope="row">{coast}</th>
                      <td className="num">{list.length}</td>
                      <td>
                        <LevelBar reports={list} label={`Debris levels on the ${coast}`} />
                      </td>
                      <td>{topItems(list, 1)[0] ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="level-legend">
                {LEVELS.map((k) => (
                  <li key={k}>
                    <span className="level-dot" data-tone={CATEGORIES[k].tone} />
                    {CATEGORIES[k].label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="stats-block">
              <h3>Reports a month</h3>
              <ol className="month-bars" aria-label="Beach reports in each of the last six months">
                {stats.months.map((m) => {
                  const most = Math.max(1, ...stats.months.map((x) => x.count));
                  return (
                    <li key={m.key}>
                      <span className="month-count">{m.count || ""}</span>
                      <span className="month-bar" style={{ height: `${(m.count / most) * 100}%` }} />
                      <span className="month-name">{m.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="stats-block">
              <h3>Found most often</h3>
              <ul className="item-bars">
                {stats.items.map(([item, count]) => (
                  <li key={item}>
                    <span>{item}</span>
                    <span className="bar" style={{ width: `${(count / stats.items[0][1]) * 100}%` }} />
                    <span className="count">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="stats-block">
            <h3>Beaches that need a cleanup</h3>
            {stats.needs.length === 0 ? (
              <p className="report-meta">Every reported beach was clean last time.</p>
            ) : (
              <ol className="needs-list">
                {stats.needs.map(({ beach, list }) => {
                  const latest = list[0].aiAnalysis.category;
                  const ready = list.length >= MIN_REPORTS_FOR_PLAN;
                  return (
                    <li key={beach.id}>
                      <span className="level-dot" data-tone={CATEGORIES[latest].tone} />
                      <span className="needs-name">
                        <strong>{beach.name}</strong>
                        <small>
                          {coastOf(beach.lat, beach.lng, beach.country)} · {CATEGORIES[latest].label.toLowerCase()} last time ·{" "}
                          {list.length} {list.length === 1 ? "report" : "reports"}
                          {topItems(list, 2).length > 0 && ` · ${topItems(list, 2).join(", ")}`}
                        </small>
                      </span>
                      <span className="needs-go">
                        <Link to={`/map?b=${encodeURIComponent(beach.id)}`} viewTransition>
                          Map
                        </Link>
                        {ready ? (
                          <Link to={`/map?b=${encodeURIComponent(beach.id)}&t=cleanup`} className="btn btn-small btn-primary" viewTransition>
                            Organize
                          </Link>
                        ) : (
                          <span className="needs-more">
                            {MIN_REPORTS_FOR_PLAN - list.length} more {MIN_REPORTS_FOR_PLAN - list.length === 1 ? "report" : "reports"} for a plan
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  );
}
