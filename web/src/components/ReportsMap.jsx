import { useEffect, useRef } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { CATEGORIES, TONE_COLORS } from "../lib/labels";
import { isCommunityBeach } from "../lib/beaches";
import { MutedTileLayer } from "../lib/mutedTiles";

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

// OpenStreetMap, recoloured as each tile loads (see lib/mutedTiles.js).
function MutedTiles({ url, attribution, maxZoom }) {
  const map = useMap();
  useEffect(() => {
    const layer = new MutedTileLayer(url, { attribution, maxZoom }).addTo(map);
    return () => layer.remove();
  }, [map, url, attribution, maxZoom]);
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

// Labels on cleanup flags only show once the map is zoomed in far enough for
// them to have room; further out the flags alone mark where cleanups are.
//
// During a zoom Leaflet stretches the dot layers (the beaches' canvas and the
// lone reports' SVG) as pictures, which balloons every dot until they redraw.
// `is-zooming` hides them for the animation; they fade back in at the new scale.
function ZoomClass() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const update = () => container.classList.toggle("is-far", map.getZoom() < 7);
    const hide = () => container.classList.add("is-zooming");
    const show = () => requestAnimationFrame(() => container.classList.remove("is-zooming"));
    update();
    map.on("zoomend", update);
    map.on("zoomstart", hide);
    map.on("zoomend", show);
    return () => {
      map.off("zoomend", update);
      map.off("zoomstart", hide);
      map.off("zoomend", show);
    };
  }, [map]);
  return null;
}

const FLAG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21.5V3.2" fill="none" stroke="#1d2a32" stroke-width="2.2" stroke-linecap="round"/><path d="M6.4 3.6c3.6-1.6 6.2 1.4 10.6.2l-1.6 4.4 2.6 3.9c-4.3 1.4-7-1.6-11.6.1z" fill="#ffd84d" stroke="#1d2a32" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function whenLabel(date) {
  const days = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400e3);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// A small flag beside the beach for each upcoming cleanup, raised above and to
// the right of the beach's own dot so both stay clickable.
function eventIcon(event) {
  const label = `Cleanup ${whenLabel(event.startsAt.toDate())}`;
  return L.divIcon({
    className: "event-flag",
    html: `${FLAG}<span class="event-flag-label">${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [3, 30],
  });
}

const ME_ICON = L.divIcon({ className: "me-dot", html: "<span></span>", iconSize: [16, 16], iconAnchor: [8, 8] });

// Dots come in three sizes, by how far the map is zoomed in.
const baseRadius = (zoom) => (zoom < 5 ? 2.5 : zoom < 8 ? 4 : 6);

function radiusFor(zoom, reported, selected) {
  return baseRadius(zoom) + (reported ? 3 : 0) + (selected ? 4 : 0);
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
    // Their own pane, so it can be hidden while the map zooms (see below).
    if (!map.getPane("beaches")) map.createPane("beaches").style.zIndex = 420;
    const renderer = L.canvas({ padding: 0.5, pane: "beaches" });
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

  // Restyling 15k dots is the slow part of a zoom, and their size only changes
  // at two zoom levels, so a zoom restyles them only when it crosses one.
  const sizedFor = useRef(null);
  useEffect(() => {
    const apply = () => {
      const zoom = map.getZoom();
      sizedFor.current = baseRadius(zoom);
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
    // An animated zoom announces its target first. Setting the new radii then,
    // without a redraw, lets the projection Leaflet does at the end of every
    // zoom draw them at no extra cost.
    const onZoomAnim = (e) => {
      const base = baseRadius(e.zoom);
      if (base === sizedFor.current) return;
      sizedFor.current = base;
      for (const [id, marker] of markers.current) {
        const r = radiusFor(e.zoom, Boolean(tones?.get(id)) || isCommunityBeach(id), id === selectedId);
        marker.options.radius = r;
        marker._radius = r;
      }
    };
    // Zooms without an animation (and anything the above missed) restyle in full.
    const onZoomEnd = () => {
      if (baseRadius(map.getZoom()) !== sizedFor.current) apply();
    };
    map.on("zoomanim", onZoomAnim);
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomanim", onZoomAnim);
      map.off("zoomend", onZoomEnd);
    };
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
    // The dots on screen, bucketed by layer-pixel position. Rebuilt after a
    // zoom or a pan, lazily, the first time the pointer needs it.
    let grid = null;
    let indexed = 0;
    const build = () => {
      grid = new Map();
      indexed = markers.current.size;
      // The visible area in layer pixels, with a margin for the snap reach.
      const view = map.getPixelBounds();
      const origin = map.getPixelOrigin();
      const minX = view.min.x - origin.x - CELL;
      const minY = view.min.y - origin.y - CELL;
      const maxX = view.max.x - origin.x + CELL;
      const maxY = view.max.y - origin.y + CELL;
      for (const [id, marker] of markers.current) {
        // Leaflet keeps each dot's layer-pixel position after projecting it.
        const p = marker._point ?? map.latLngToLayerPoint(marker.getLatLng());
        if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
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
    map.on("zoomend viewreset moveend", reset);
    map.on("click", onClick);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout dragstart zoomstart", clear);
      map.off("zoomend viewreset moveend", reset);
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
  events,
  onSelectEvent,
  me,
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
      <MutedTiles
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, beaches from Wikidata and OpenStreetMap'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomClass />
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
      {me && <Marker position={[me.lat, me.lng]} icon={ME_ICON} interactive={false} keyboard={false} />}
      {!placing &&
        events?.map((e) => (
          <Marker
            key={e.id}
            position={[e.location.lat, e.location.lng]}
            icon={eventIcon(e)}
            title={`${e.title}, ${e.startsAt.toDate().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
            zIndexOffset={500}
            bubblingMouseEvents={false}
            eventHandlers={{ click: () => onSelectEvent?.(e.id) }}
          />
        ))}
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
