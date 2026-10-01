import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import ReportDetail from "../components/ReportDetail";
import "./MapPage.css";

// Main island plus Penghu; Leaflet fits this box to whatever screen size it gets.
const TAIWAN_BOUNDS = [
  [21.85, 119.3],
  [25.35, 122.05],
];

// Listing published reports requires the status filter, or the rules reject the whole query.
const publishedReports = query(
  collection(db, "reports"),
  where("status", "==", "published"),
  orderBy("createdAt", "desc"),
  limit(300),
);

const LEGEND = ["clean", "light", "moderate", "heavy"];

export default function MapPage() {
  const [reports, setReports] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(
    () =>
      onSnapshot(
        publishedReports,
        (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (err) => {
          console.error(err);
          setLoadError(true);
        },
      ),
    [],
  );

  const selected = reports?.find((r) => r.id === selectedId);

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>海灘現況</h1>
        <p className="report-meta">
          {loadError
            ? "回報資料載入失敗，請重新整理頁面。"
            : reports === null
              ? "載入回報中…"
              : `目前 ${reports.length} 筆公開回報`}
        </p>
        <ul className="map-legend" aria-label="圖例">
          {LEGEND.map((key) => (
            <li key={key}>
              <span className="level-dot" data-tone={CATEGORIES[key].tone} />
              {CATEGORIES[key].label}
            </li>
          ))}
        </ul>
      </header>

      <MapContainer bounds={TAIWAN_BOUNDS} className="map" zoomControl={false}>
        {/* OSM's tile servers are fine for development traffic; move to a keyed provider before launch. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {reports?.map((r) => {
          const tone = CATEGORIES[r.aiAnalysis?.category]?.tone ?? "none";
          return (
            <CircleMarker
              key={r.id}
              center={[r.location.lat, r.location.lng]}
              radius={r.id === selectedId ? 13 : 9}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: TONE_COLORS[tone], fillOpacity: 1 }}
              eventHandlers={{ click: () => setSelectedId(r.id) }}
            />
          );
        })}
      </MapContainer>

      {reports?.length === 0 && (
        <div className="map-sheet">
          <p>還沒有公開的回報。到海邊拍一張，就是地圖上的第一筆。</p>
          <Link to="/report" className="btn btn-primary">
            回報海灘現況
          </Link>
        </div>
      )}

      {selected && (
        <section className="map-sheet" aria-label="回報詳情">
          <button type="button" className="map-sheet-close" onClick={() => setSelectedId(null)} aria-label="關閉">
            ×
          </button>
          <ReportDetail report={selected} />
        </section>
      )}
    </div>
  );
}
