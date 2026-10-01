import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.wrap().lng }) });
  return null;
}

function FocusOn({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 10);
  }, [map, lat, lng]);
  return null;
}

export default function ReportsMap({
  reports,
  selectedId,
  onSelect,
  onMapClick,
  picked,
  focus,
  center = [18, 125],
  zoom = 3,
  scrollWheelZoom = true,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={2}
      worldCopyJump
      scrollWheelZoom={scrollWheelZoom}
      zoomControl={false}
      className="reports-map"
    >
      {/* Top-left is taken by the map's title card. */}
      <ZoomControl position="bottomright" />
      {/* OSM's tile servers are fine for development traffic; move to a keyed provider before launch. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onMapClick={onMapClick} />
      <FocusOn lat={focus?.lat} lng={focus?.lng} />
      {picked && (
        <CircleMarker
          center={[picked.lat, picked.lng]}
          radius={8}
          pathOptions={{ color: "#05141c", weight: 3, fillColor: "#ffffff", fillOpacity: 1 }}
        />
      )}
      {reports?.map((r) => {
        const tone = CATEGORIES[r.aiAnalysis?.category]?.tone ?? "none";
        return (
          <CircleMarker
            key={r.id}
            center={[r.location.lat, r.location.lng]}
            radius={r.id === selectedId ? 12 : 8}
            // Without this, a marker click also fires the map's "clicked empty ocean" handler.
            bubblingMouseEvents={false}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: TONE_COLORS[tone], fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect?.(r.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
