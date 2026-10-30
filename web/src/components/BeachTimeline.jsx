import { useMemo, useState } from "react";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import { reportTime } from "../lib/reports";
import { BEACH_RADIUS_KM } from "../lib/beaches";
import ReportDetail, { Level } from "./ReportDetail";

const RANK = { clean: 0, light: 1, moderate: 2, heavy: 3 };
const ROW_LABELS = ["Clean", "Light", "Moderate", "Heavy"];
const PAGE = 15;
const YEAR = 365.25 * 86400e3;

const rankOf = (r) => RANK[CATEGORIES[r.aiAnalysis?.category]?.tone];
const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dayLabel = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Average debris level over a stretch of time, or null with too few reports to say.
function averageRank(reports, from, to) {
  const ranks = reports
    .filter((r) => {
      const t = reportTime(r).toMillis();
      return t >= from && t < to;
    })
    .map(rankOf)
    .filter((x) => x !== undefined);
  return ranks.length >= 2 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
}

// One line on how the last year compares with the one before.
function trendLine(reports) {
  const now = Date.now();
  const recent = averageRank(reports, now - YEAR, now + 86400e3);
  const before = averageRank(reports, now - 2 * YEAR, now - YEAR);
  if (recent === null || before === null) return null;
  if (recent < before - 0.4) return "Less debris over the past year than the year before.";
  if (recent > before + 0.4) return "More debris over the past year than the year before.";
  return "About the same over the past year as the year before.";
}

// Every report as a dot: across is time, up is how much debris it showed.
function Chart({ reports, focusReportId, onSelectReport }) {
  const points = reports
    .map((r) => ({ r, t: reportTime(r).toMillis(), rank: rankOf(r) }))
    .filter((p) => p.rank !== undefined)
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return null;

  const W = 320;
  const H = 120;
  const left = 58;
  const right = 10;
  const top = 10;
  const rowGap = 22;
  const start = points[0].t;
  const end = Math.max(Date.now(), points.at(-1).t);
  const span = Math.max(end - start, 30 * 86400e3);
  const x = (t) => left + ((t - start) / span) * (W - left - right);
  const y = (rank) => top + (3 - rank) * rowGap;

  // Year marks when the history spans years, month marks otherwise.
  const ticks = [];
  const first = new Date(start);
  if (span > 1.5 * YEAR) {
    for (let year = first.getFullYear() + 1; new Date(year, 0, 1).getTime() <= end; year++) {
      ticks.push({ t: new Date(year, 0, 1).getTime(), label: String(year) });
    }
  } else {
    const step = span > 0.5 * YEAR ? 3 : 1;
    for (
      let d = new Date(first.getFullYear(), first.getMonth() + 1, 1);
      d.getTime() <= end;
      d.setMonth(d.getMonth() + step)
    ) {
      ticks.push({ t: d.getTime(), label: d.toLocaleDateString("en-US", { month: "short" }) });
    }
  }

  return (
    <svg
      className="beach-timeline-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Debris level of each report over time"
    >
      {ROW_LABELS.map((label, rank) => (
        <g key={label}>
          <line x1={left} x2={W - right} y1={y(rank)} y2={y(rank)} className="beach-timeline-row" />
          <text x={left - 8} y={y(rank) + 3.5} textAnchor="end" className="beach-timeline-label">
            {label}
          </text>
        </g>
      ))}
      {ticks.map((tick) => (
        <g key={tick.t}>
          <line x1={x(tick.t)} x2={x(tick.t)} y1={top - 4} y2={y(0) + 4} className="beach-timeline-tick" />
          <text x={x(tick.t)} y={H - 6} textAnchor="middle" className="beach-timeline-label">
            {tick.label}
          </text>
        </g>
      ))}
      <polyline points={points.map((p) => `${x(p.t)},${y(p.rank)}`).join(" ")} className="beach-timeline-line" />
      {points.map((p) => (
        <circle
          key={p.r.id}
          cx={x(p.t)}
          cy={y(p.rank)}
          r={p.r.id === focusReportId ? 6.5 : 4.5}
          fill={TONE_COLORS[CATEGORIES[p.r.aiAnalysis.category].tone]}
          className={p.r.id === focusReportId ? "beach-timeline-dot is-focus" : "beach-timeline-dot"}
          onClick={() => onSelectReport(p.r.id)}
        >
          <title>
            {CATEGORIES[p.r.aiAnalysis.category].label}, {reportTime(p.r).toDate().toLocaleDateString("en-US")}
          </title>
        </circle>
      ))}
    </svg>
  );
}

// A beach's reports through the years: the chart for the shape of it, then
// the reports month by month, a page at a time, with a filter for each year.
export default function BeachTimeline({ reports, focusReportId, onSelectReport }) {
  const [year, setYear] = useState(null);
  const [shown, setShown] = useState(PAGE);

  const years = useMemo(() => {
    const counts = new Map();
    for (const r of reports) {
      const y = reportTime(r).toDate().getFullYear();
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0] - a[0]);
  }, [reports]);

  if (reports.length === 0) {
    return <p className="report-meta">No reports within {BEACH_RADIUS_KM} km of this beach yet.</p>;
  }

  const list = year ? reports.filter((r) => reportTime(r).toDate().getFullYear() === year) : reports;
  // A report opened from the map or the chart is always on the page.
  const focusAt = list.findIndex((r) => r.id === focusReportId);
  const visible = list.slice(0, Math.max(shown, focusAt + 1));
  const months = [];
  for (const r of visible) {
    const label = monthLabel(reportTime(r).toDate());
    if (months.at(-1)?.label !== label) months.push({ label, reports: [] });
    months.at(-1).reports.push(r);
  }

  const oldest = reportTime(reports.at(-1)).toDate();
  const trend = trendLine(reports);

  return (
    <div className="beach-timeline">
      <p className="beach-timeline-summary">
        {reports.length} {reports.length === 1 ? "report" : "reports"} since {monthLabel(oldest)}.{trend && ` ${trend}`}
      </p>
      <Chart
        reports={reports}
        focusReportId={focusReportId}
        onSelectReport={(id) => {
          setYear(null);
          onSelectReport(id);
        }}
      />

      {years.length > 1 && (
        <div className="toolbar-chips beach-timeline-years" role="group" aria-label="Show one year">
          {[[null, reports.length], ...years].map(([y, n]) => (
            <button
              key={y ?? "all"}
              type="button"
              className="toolbar-chip"
              aria-pressed={year === y}
              onClick={() => {
                setYear(y);
                setShown(PAGE);
              }}
            >
              {y ?? "All"} <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      {months.map((m) => (
        <section key={m.label} className="beach-timeline-month">
          <h4>{m.label}</h4>
          <ol className="history">
            {m.reports.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-expanded={r.id === focusReportId}
                  onClick={() => onSelectReport(r.id === focusReportId ? null : r.id)}
                >
                  <Level category={r.aiAnalysis?.category} />
                  <span className="report-meta">
                    {dayLabel(reportTime(r).toDate())}
                    {r.takenAt && (
                      <span className="beach-timeline-sent">
                        {" "}
                        · sent{" "}
                        {r.createdAt
                          .toDate()
                          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </span>
                </button>
                {r.id === focusReportId && (
                  <div className="history-detail">
                    <ReportDetail report={r} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}

      {visible.length < list.length && (
        <button
          type="button"
          className="btn btn-small beach-timeline-more"
          onClick={() => setShown(visible.length + PAGE)}
        >
          Show older reports ({list.length - visible.length} more)
        </button>
      )}
    </div>
  );
}
