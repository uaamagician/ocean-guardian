import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { X } from "lucide-react";
import ReportsMap from "../components/ReportsMap";
import ReportDetail from "../components/ReportDetail";
import OceanConditions from "../components/OceanConditions";
import BeachPanel from "../components/BeachPanel";
import usePublishedReports from "../lib/usePublishedReports";
import { useBeaches, useReportsByBeach } from "../lib/beaches";
import { CATEGORIES } from "../lib/labels";
import "./MapPage.css";

const LEGEND = ["clean", "light", "moderate", "heavy"];

export default function MapPage() {
  const { reports, error: reportsError } = usePublishedReports();
  const { beaches, error: beachesError } = useBeaches();
  const { byBeach, unmatched, beachOfReport, tones } = useReportsByBeach(beaches, reports);
  const [params, setParams] = useSearchParams();

  const reportParam = params.get("r");
  const beachId = params.get("b") ?? (reportParam ? beachOfReport.get(reportParam) : null);
  const beach = beaches?.find((b) => b.id === beachId) ?? null;
  const loneReport = !beach && reportParam ? unmatched.find((r) => r.id === reportParam) : null;

  // Center on a deep link (from the home page) once; later clicks shouldn't move the map.
  const [entry] = useState(() => ({ b: params.get("b"), r: reportParam }));
  const focus = useMemo(() => {
    if (entry.b) {
      const b = beaches?.find((x) => x.id === entry.b);
      return b ? { lat: b.lat, lng: b.lng } : null;
    }
    if (entry.r) return reports?.find((r) => r.id === entry.r)?.location ?? null;
    return null;
  }, [entry, beaches, reports]);

  const selectBeach = (id) => setParams({ b: id });
  const close = () => setParams({});
  const status = beachesError
    ? "Couldn't load the beach list. Refresh the page to try again."
    : reportsError
      ? "Couldn't load reports. Refresh the page to try again."
      : !beaches
        ? "Loading beaches…"
        : `${beaches.length.toLocaleString("en-US")} beaches. Click one to see its conditions, reports and reviews.`;

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>World beach map</h1>
        <p className="report-meta">{status}</p>
        <ul className="map-legend" aria-label="Legend">
          <li>
            <span className="level-dot level-dot-beach" />
            No reports yet
          </li>
          {LEGEND.map((key) => (
            <li key={key}>
              <span className="level-dot" data-tone={CATEGORIES[key].tone} />
              {CATEGORIES[key].label}
            </li>
          ))}
        </ul>
      </header>

      <div className="map-canvas">
        <ReportsMap
          beaches={beaches}
          beachTones={tones}
          selectedBeachId={beach?.id}
          onSelectBeach={selectBeach}
          reports={unmatched}
          selectedReportId={loneReport?.id}
          onSelectReport={(id) => setParams({ r: id })}
          focus={focus}
        />
      </div>

      {beach && (
        <aside className="map-sheet" aria-label={beach.name}>
          <button type="button" className="map-sheet-close" onClick={close} aria-label="Close">
            <X />
          </button>
          <BeachPanel
            beach={beach}
            reports={byBeach.get(beach.id) ?? []}
            focusReportId={reportParam}
            onSelectReport={(id) => setParams(id ? { b: beach.id, r: id } : { b: beach.id })}
          />
        </aside>
      )}

      {loneReport && (
        <aside className="map-sheet" aria-label="Report details">
          <button type="button" className="map-sheet-close" onClick={close} aria-label="Close">
            <X />
          </button>
          <ReportDetail report={loneReport} />
          <p className="report-meta">This report isn't near any beach on our list.</p>
          <OceanConditions lat={loneReport.location.lat} lng={loneReport.location.lng} />
        </aside>
      )}
    </div>
  );
}
