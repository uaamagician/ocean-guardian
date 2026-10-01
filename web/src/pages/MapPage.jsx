import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { X } from "lucide-react";
import ReportsMap from "../components/ReportsMap";
import ReportDetail, { Level } from "../components/ReportDetail";
import OceanConditions from "../components/OceanConditions";
import usePublishedReports, { distanceKm } from "../lib/usePublishedReports";
import { CATEGORIES, formatTime } from "../lib/labels";
import "./MapPage.css";

const HISTORY_RADIUS_KM = 2;
const NEARBY_RADIUS_KM = 5;
const LEGEND = ["clean", "light", "moderate", "heavy"];

function formatCoords({ lat, lng }) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

function History({ reports, center, excludeId, radiusKm, title, onSelect }) {
  const nearby = reports
    .filter((r) => r.id !== excludeId && distanceKm(center, r.location) <= radiusKm)
    .slice(0, 10);
  return (
    <div className="section">
      <span className="report-label">{title}</span>
      {nearby.length === 0 ? (
        <p className="report-meta">No other reports within {radiusKm} km yet.</p>
      ) : (
        <ol className="history">
          {nearby.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onSelect(r.id)}>
                <Level category={r.aiAnalysis?.category} />
                <span className="report-meta">{formatTime(r.createdAt)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function MapPage() {
  const { reports, error } = usePublishedReports();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("r");
  const picked = useMemo(() => {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [params]);

  const selected = reports?.find((r) => r.id === selectedId);
  const select = (id) => setParams({ r: id });
  const pick = ({ lat, lng }) => setParams({ lat: lat.toFixed(3), lng: lng.toFixed(3) });
  const close = () => setParams({});

  // Center on a deep link (from the home page) once; later clicks shouldn't move the map.
  const [entry] = useState(() => ({ r: selectedId, point: picked }));
  const focus = useMemo(() => {
    if (entry.r) return reports?.find((r) => r.id === entry.r)?.location ?? null;
    return entry.point;
  }, [entry, reports]);

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>World beach map</h1>
        <p className="report-meta">
          {error ? "Couldn't load reports. Refresh the page to try again." : reports === null ? "Loading reports…" : `${reports.length} public reports. Click anywhere on the sea for live conditions.`}
        </p>
        <ul className="map-legend" aria-label="Legend">
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
          reports={reports}
          selectedId={selectedId}
          onSelect={select}
          onMapClick={pick}
          picked={picked}
          focus={focus}
        />
      </div>

      {selected && (
        <aside className="map-sheet" aria-label="Report details">
          <button type="button" className="map-sheet-close" onClick={close} aria-label="Close">
            <X />
          </button>
          <ReportDetail report={selected} />
          <OceanConditions lat={selected.location.lat} lng={selected.location.lng} />
          <History
            reports={reports}
            center={selected.location}
            excludeId={selected.id}
            radiusKm={HISTORY_RADIUS_KM}
            title="History of this beach"
            onSelect={select}
          />
        </aside>
      )}

      {!selected && picked && (
        <aside className="map-sheet" aria-label="Conditions at this spot">
          <button type="button" className="map-sheet-close" onClick={close} aria-label="Close">
            <X />
          </button>
          <div className="section">
            <h2>Conditions at this spot</h2>
            <p className="report-meta">
              {formatCoords(picked)}
            </p>
          </div>
          <OceanConditions lat={picked.lat} lng={picked.lng} />
          {reports && (
            <History
              reports={reports}
              center={picked}
              radiusKm={NEARBY_RADIUS_KM}
              title="Nearby reports"
              onSelect={select}
            />
          )}
          <Link to="/report" className="btn btn-primary">
            Report this beach
          </Link>
        </aside>
      )}
    </div>
  );
}
