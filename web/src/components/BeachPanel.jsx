import { Link } from "react-router";
import { ExternalLink, Navigation } from "lucide-react";
import ReportDetail, { Level } from "./ReportDetail";
import OceanConditions from "./OceanConditions";
import useWikiSummary from "../lib/useWikiSummary";
import { BEACH_RADIUS_KM, googleMapsLinks } from "../lib/beaches";
import { formatTime } from "../lib/labels";

function About({ beach }) {
  const { loading, summary } = useWikiSummary(beach.wiki);
  if (loading) return <p className="report-meta">Loading description…</p>;
  if (summary) {
    return (
      <div className="beach-about">
        {summary.image && <img src={summary.image} alt="" loading="lazy" />}
        <p>{summary.extract}</p>
        {summary.url && (
          <a href={summary.url} target="_blank" rel="noreferrer">
            Read more on Wikipedia
          </a>
        )}
      </div>
    );
  }
  return beach.desc ? <p className="report-meta">{capitalize(beach.desc)}.</p> : null;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function Status({ reports }) {
  if (reports.length === 0) {
    return (
      <div className="beach-status">
        <span className="level">
          <span className="level-dot level-dot-beach" />
          No reports yet
        </span>
        <p className="report-meta">Nobody has reported this beach. If you're nearby, you could be the first.</p>
      </div>
    );
  }
  const latest = reports[0];
  return (
    <div className="beach-status">
      <Level category={latest.aiAnalysis?.category} />
      <p className="report-meta">
        Latest report {formatTime(latest.createdAt)}. {reports.length} report{reports.length > 1 ? "s" : ""} within{" "}
        {BEACH_RADIUS_KM} km.
      </p>
    </div>
  );
}

export default function BeachPanel({ beach, reports, focusReportId, onSelectReport }) {
  const links = googleMapsLinks(beach);
  const focused = reports.find((r) => r.id === focusReportId);

  return (
    <>
      <div className="section">
        <span className="report-meta">{[beach.local, beach.country].filter(Boolean).join(", ")}</span>
        <h2 className="beach-name">{beach.name}</h2>
      </div>

      <About beach={beach} />
      <Status reports={reports} />

      <div className="beach-links">
        <a className="btn" href={links.place} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Reviews and photos on Google Maps
        </a>
        <a className="btn" href={links.directions} target="_blank" rel="noreferrer">
          <Navigation aria-hidden="true" />
          Directions
        </a>
      </div>

      <OceanConditions lat={beach.lat} lng={beach.lng} />

      {reports.length > 0 && (
        <div className="section">
          <span className="report-label">Reports from this beach</span>
          <ol className="history">
            {reports.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-expanded={r.id === focusReportId}
                  onClick={() => onSelectReport(r.id === focusReportId ? null : r.id)}
                >
                  <Level category={r.aiAnalysis?.category} />
                  <span className="report-meta">{formatTime(r.createdAt)}</span>
                </button>
                {r.id === focused?.id && (
                  <div className="history-detail">
                    <ReportDetail report={r} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <Link to="/report" className="btn btn-primary">
        Report this beach
      </Link>
    </>
  );
}
