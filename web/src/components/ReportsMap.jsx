import { useEffect, useRef } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import { isCommunityBeach } from "../lib/beaches";

const NO_REPORT_COLOR = "#23727a";
const COMMUNITY_RING = "#e8702a";

// While placing a new beach, the map takes clicks and shows a crosshair cursor.
function PlaceHandler({ active, onPlace }) {
  const map = useMap();
  useMapEvents({ click: (e) => active && onPlace?.({ lat: e.latlng.lat, lng: e.latlng.wrap().lng }) });
  useEffect(() => {
    map.getContainer().classList.toggle("is-placing", Boolean(active));
  }, [map, active]);
  return null;
}

function FocusOn({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 11);
  }, [map, lat, lng]);
  return null;
}

// Smooth flight for search results; `key` lets the same spot be flown to twice.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo([target.lat, target.lng], target.zoom, { duration: reduce ? 0 : 1.2 });
  }, [map, target]);
  return null;
}

function radiusFor(zoom, reported, selected) {
  const base = zoom < 5 ? 2.5 : zoom < 8 ? 4 : 6;
  return base + (reported ? 3 : 0) + (selected ? 4 : 0);
}

// ~15k beaches: drawn imperatively on one canvas layer. As React-Leaflet
// components they'd be 15k React elements and the map would crawl.
function BeachLayer({ beaches, tones, selectedId, onSelect, snap }) {
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
        const community = isCommunityBeach(id);
        marker.setRadius(radiusFor(zoom, Boolean(tone) || community, selected));
        marker.setStyle({
          fillColor: tone ? TONE_COLORS[tone] : NO_REPORT_COLOR,
          color: selected ? "#05141c" : community ? COMMUNITY_RING : "#ffffff",
          weight: selected || community ? 3 : tone ? 2 : 1,
        });
        if (tone || selected || community) front.push(marker);
      }
      // Reported and selected beaches draw on top of the plain ones.
      front.forEach((m) => m.bringToFront());
    };
    apply();
    map.on("zoomend", apply);
    return () => map.off("zoomend", apply);
  }, [map, beaches, tones, selectedId]);

  useSnap(map, markers, snap, onSelectRef);

  return null;
}

// How close (in screen pixels from a dot's edge) the pointer has to come for
// the dot to catch it. A tap is less precise than a mouse, so it gets more.
const SNAP_HOVER = 18;
const SNAP_TAP = 26;
const CELL = 48;

// The dots stay small, but the pointer snaps to the nearest one when it comes
// close: a ring marks it, its name shows, and a click there opens it. Off
// while placing a new beach, so that click can land anywhere.
function useSnap(map, markers, enabled, onSelectRef) {
  useEffect(() => {
    if (!enabled) return undefined;
    const container = map.getContainer();
    // Dots bucketed by layer-pixel position; layer pixels don't change while
    // panning, so the index is rebuilt only when the zoom changes.
    let grid = null;
    let indexed = 0;
    const build = () => {
      grid = new Map();
      indexed = markers.current.size;
      for (const [id, marker] of markers.current) {
        const p = map.latLngToLayerPoint(marker.getLatLng());
        const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push({ id, marker, p });
      }
    };
    const nearest = (containerPoint, reach) => {
      // Also rebuilt once the beach list arrives (the dots load after the map).
      if (!grid || indexed !== markers.current.size) build();
      const at = map.containerPointToLayerPoint(containerPoint);
      const cx = Math.floor(at.x / CELL);
      const cy = Math.floor(at.y / CELL);
      let best = null;
      let bestGap = reach;
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (const dot of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
            const gap = at.distanceTo(dot.p) - dot.marker.getRadius();
            if (gap < bestGap) {
              best = dot;
              bestGap = gap;
            }
          }
        }
      }
      return best;
    };

    const ring = L.circleMarker([0, 0], {
      interactive: false,
      radius: 10,
      color: "#e8702a",
      weight: 2.5,
      dashArray: "5 4",
      fill: false,
    });
    let current = null;
    const show = (dot) => {
      if (dot?.id === current?.id) return;
      current?.marker.closeTooltip();
      current = dot;
      container.classList.toggle("is-snapped", Boolean(dot));
      if (!dot) {
        ring.remove();
        return;
      }
      ring.setLatLng(dot.marker.getLatLng()).setRadius(dot.marker.getRadius() + 6).addTo(map);
      dot.marker.openTooltip();
    };

    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => show(nearest(e.containerPoint, SNAP_HOVER)));
    };
    const clear = () => {
      cancelAnimationFrame(frame);
      show(null);
    };
    // A click that missed every dot: open the one it snapped to, if any.
    const onClick = (e) => {
      const touch = e.originalEvent?.pointerType === "touch" || e.originalEvent?.sourceCapabilities?.firesTouchEvents;
      const dot = nearest(e.containerPoint, touch ? SNAP_TAP : SNAP_HOVER);
      if (dot) onSelectRef.current?.(dot.id);
    };
    const reset = () => {
      grid = null;
      clear();
    };

    map.on("mousemove", onMove);
    map.on("mouseout dragstart zoomstart", clear);
    map.on("zoomend viewreset", reset);
    map.on("click", onClick);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout dragstart zoomstart", clear);
      map.off("zoomend viewreset", reset);
      map.off("click", onClick);
      clear();
    };
  }, [map, markers, enabled, onSelectRef]);
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
  flyTo,
  placing = false,
  onPlace,
  draft,
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
      <FlyTo target={flyTo} />
      <PlaceHandler active={placing} onPlace={onPlace} />
      {draft && (
        <CircleMarker
          center={[draft.lat, draft.lng]}
          radius={10}
          interactive={false}
          pathOptions={{ color: COMMUNITY_RING, weight: 3, dashArray: "4 4", fillColor: "#ffffff", fillOpacity: 0.9 }}
        />
      )}
      <BeachLayer
        beaches={beaches}
        tones={beachTones}
        selectedId={selectedBeachId}
        onSelect={onSelectBeach}
        snap={!placing}
      />
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
