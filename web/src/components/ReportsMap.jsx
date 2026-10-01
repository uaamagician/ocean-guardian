import { useEffect, useRef } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";

const NO_REPORT_COLOR = "#23727a";

function FocusOn({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 11);
  }, [map, lat, lng]);
  return null;
}

function radiusFor(zoom, reported, selected) {
  const base = zoom < 5 ? 2.5 : zoom < 8 ? 4 : 6;
  return base + (reported ? 3 : 0) + (selected ? 4 : 0);
}

// ~15k beaches: drawn imperatively on one canvas layer. As React-Leaflet
// components they'd be 15k React elements and the map would crawl.
function BeachLayer({ beaches, tones, selectedId, onSelect }) {
  const map = useMap();
  const markers = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!beaches) return undefined;
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup().addTo(map);
    const byId = markers.current;
    for (const b of beaches) {
      const marker = L.circleMarker([b.lat, b.lng], {
        renderer,
        bubblingMouseEvents: false,
        color: "#ffffff",
        weight: 1,
        fillColor: NO_REPORT_COLOR,
        fillOpacity: 0.9,
        radius: 3,
      });
      marker.bindTooltip(b.name, { direction: "top", offset: [0, -6] });
      marker.on("click", () => onSelectRef.current?.(b.id));
      marker.addTo(group);
      byId.set(b.id, marker);
    }
    return () => {
      group.remove();
      byId.clear();
    };
  }, [map, beaches]);

  useEffect(() => {
    const apply = () => {
      const zoom = map.getZoom();
      const front = [];
      for (const [id, marker] of markers.current) {
        const tone = tones?.get(id);
        const selected = id === selectedId;
        marker.setRadius(radiusFor(zoom, Boolean(tone), selected));
        marker.setStyle({
          fillColor: tone ? TONE_COLORS[tone] : NO_REPORT_COLOR,
          color: selected ? "#05141c" : "#ffffff",
          weight: selected ? 3 : tone ? 2 : 1,
        });
        if (tone || selected) front.push(marker);
      }
      // Reported and selected beaches draw on top of the plain ones.
      front.forEach((m) => m.bringToFront());
    };
    apply();
    map.on("zoomend", apply);
    return () => map.off("zoomend", apply);
  }, [map, beaches, tones, selectedId]);

  return null;
}

export default function ReportsMap({
  beaches,
  beachTones,
  selectedBeachId,
  onSelectBeach,
  reports,
  selectedReportId,
  onSelectReport,
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
      {/* Top-left holds the title card and the right side the detail panel. */}
      <ZoomControl position="bottomleft" />
      {/* OSM's tile servers are fine for development traffic; move to a keyed provider before launch. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, beaches from Wikidata and OpenStreetMap'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FocusOn lat={focus?.lat} lng={focus?.lng} />
      <BeachLayer beaches={beaches} tones={beachTones} selectedId={selectedBeachId} onSelect={onSelectBeach} />
      {/* Reports that aren't near any known beach still get their own marker. */}
      {reports?.map((r) => {
        const tone = CATEGORIES[r.aiAnalysis?.category]?.tone ?? "none";
        return (
          <CircleMarker
            key={r.id}
            center={[r.location.lat, r.location.lng]}
            radius={r.id === selectedReportId ? 12 : 8}
            bubblingMouseEvents={false}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: TONE_COLORS[tone], fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectReport?.(r.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
