import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { MapPinPlus, X } from "lucide-react";
import ReportsMap from "../components/ReportsMap";
import ReportDetail from "../components/ReportDetail";
import OceanConditions from "../components/OceanConditions";
import BeachPanel from "../components/BeachPanel";
import AddBeachForm from "../components/AddBeachForm";
import usePublishedReports from "../lib/usePublishedReports";
import { useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { CATEGORIES } from "../lib/labels";
import "./MapPage.css";

const LEGEND = ["clean", "light", "moderate", "heavy"];

export default function MapPage() {
  const { reports, error: reportsError } = usePublishedReports();
  const { beaches, error: beachesError } = useAllBeaches();
  const { byBeach, unmatched, beachOfReport, tones } = useReportsByBeach(beaches, reports);
  const [params, setParams] = useSearchParams();
  // Adding a beach: `placing` turns map clicks into a location pick for the form.
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState(null);

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

  const stopPlacing = () => {
    setPlacing(false);
    setDraft(null);
  };
  const selectBeach = (id) => {
    stopPlacing();
    setParams({ b: id });
  };
  const close = () => setParams({});
  const startPlacing = () => {
    setParams({});
    setPlacing(true);
  };
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
          <li>
            <span className="level-dot level-dot-community" />
            Added by users
          </li>
          {LEGEND.map((key) => (
            <li key={key}>
              <span className="level-dot" data-tone={CATEGORIES[key].tone} />
              {CATEGORIES[key].label}
            </li>
          ))}
        </ul>
        {!placing && (
          <button type="button" className="btn map-add" onClick={startPlacing} disabled={!beaches}>
            <MapPinPlus aria-hidden="true" />
            Add a missing beach
          </button>
        )}
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
          placing={placing}
          onPlace={setDraft}
          draft={draft}
        />
      </div>

      {placing && (
        <aside className="map-sheet map-sheet-panel" aria-label="Add a missing beach">
          <AddBeachForm
            point={draft}
            beaches={beaches}
            onAdded={selectBeach}
            onOpenBeach={selectBeach}
            onCancel={stopPlacing}
          />
        </aside>
      )}

      {!placing && beach && (
        <aside className="map-sheet map-sheet-panel" aria-label={beach.name}>
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

      {!placing && loneReport && (
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
