import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronDown, LocateFixed, MapPinPlus, X } from "lucide-react";
import ReportsMap from "../components/ReportsMap";
import ReportDetail from "../components/ReportDetail";
import OceanConditions from "../components/OceanConditions";
import BeachPanel from "../components/BeachPanel";
import AddBeachForm from "../components/AddBeachForm";
import MapSearch from "../components/MapSearch";
import usePublishedReports, { useNearbyReports } from "../lib/usePublishedReports";
import { BEACH_RADIUS_KM, useAllBeaches, useReportsByBeach } from "../lib/beaches";
import { CATEGORIES } from "../lib/labels";
import { useUpcomingEvents } from "../lib/events";
import "./MapPage.css";

const LEGEND = ["clean", "light", "moderate", "heavy"];

export default function MapPage() {
  const { reports: latest, error: reportsError } = usePublishedReports();
  const { beaches, error: beachesError } = useAllBeaches();
  const [params, setSearchParams] = useSearchParams();
  // The map loads the newest reports; an open beach adds every report around
  // it, so its history goes back to the first one however many came since.
  // A link to one report opens its beach, so look around the report instead.
  const openAt =
    beaches?.find((b) => b.id === params.get("b")) ?? latest?.find((r) => r.id === params.get("r"))?.location;
  const nearby = useNearbyReports(openAt, BEACH_RADIUS_KM * 2);
  const reports = useMemo(() => {
    if (!latest || nearby.length === 0) return latest;
    const ids = new Set(latest.map((r) => r.id));
    return [...latest, ...nearby.filter((r) => !ids.has(r.id))];
  }, [latest, nearby]);
  const { byBeach, unmatched, beachOfReport, tones } = useReportsByBeach(beaches, reports);
  // Opening and closing beaches swaps the URL in place, so Back leaves the map
  // for wherever you came from instead of stepping through every beach clicked.
  const setParams = (next) => setSearchParams(next, { replace: true });
  // Adding a beach: `placing` turns map clicks into a location pick for the form.
  // `?add=1` (from the report page) opens straight into adding a beach.
  const [placing, setPlacing] = useState(() => params.get("add") === "1");
  const [draft, setDraft] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const upcoming = useUpcomingEvents(100);
  const navigate = useNavigate();

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

  // Where the visitor is. The map opens on the whole world, then, unless a link
  // asked for a beach, glides to them after a moment so they see where they are.
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    busy.current = Boolean(params.get("b") || params.get("r") || placing);
  });
  const locate = useCallback((delay) => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    const asked = Date.now();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(at);
        setLocating(false);
        setTimeout(
          () => {
            // Someone who has already opened a beach or started adding one stays put.
            if (!delay || !busy.current) setFlyTo({ ...at, zoom: 9 });
          },
          Math.max(0, delay - (Date.now() - asked)),
        );
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);
  useEffect(() => {
    if (!entry.b && !entry.r) locate(2000);
  }, [entry, locate]);

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
      {/* On phones an open beach takes the bottom of the screen, so the header steps aside. */}
      <header className={!placing && (beach || loneReport) ? "map-header has-sheet" : "map-header"}>
        <MapSearch
          beaches={beaches}
          onBeach={(b) => {
            setFlyTo({ lat: b.lat, lng: b.lng, zoom: 13 });
            selectBeach(b.id);
          }}
          onPlace={(p) => {
            setFlyTo({ lat: p.lat, lng: p.lng, zoom: 12 });
            if (!placing) close();
          }}
        />
        <h1>World beach map</h1>
        {/* On phones the count and hint are left out once the beaches load; problems still show. */}
        <p className={beaches && !reportsError ? "report-meta map-status is-ready" : "report-meta map-status"}>{status}</p>
        <button
          type="button"
          className="chip-button map-legend-toggle"
          aria-expanded={legendOpen}
          onClick={() => setLegendOpen((open) => !open)}
        >
          Legend <ChevronDown aria-hidden="true" />
        </button>
        <ul className={legendOpen ? "map-legend is-open" : "map-legend"} aria-label="Legend">
          <li>
            <span className="level-dot level-dot-beach" />
            No reports yet
          </li>
          <li>
            <span className="level-dot level-dot-community" />
            Added by users
          </li>
          <li>
            <span className="legend-flag" />
            Upcoming cleanup
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
          flyTo={flyTo}
          placing={placing}
          onPlace={setDraft}
          draft={draft}
          events={upcoming}
          onSelectEvent={(id) => navigate(`/events/${id}`, { viewTransition: true })}
          me={me}
        />
        <button
          type="button"
          className="map-locate"
          onClick={() => locate(0)}
          disabled={locating}
          aria-label="Show where I am"
          title="Show where I am"
        >
          <LocateFixed aria-hidden="true" />
        </button>
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
            allReports={reports}
            initialTab={params.get("t")}
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
