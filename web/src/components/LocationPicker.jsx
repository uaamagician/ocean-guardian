import { useEffect } from "react";
import { CircleMarker, MapContainer, useMap, useMapEvents } from "react-leaflet";
import { MutedTileLayer } from "../lib/mutedTiles";
import { useBeaches } from "../lib/beaches";
import MapSearch from "./MapSearch";

const TAIWAN = [23.7, 121];

function Tiles() {
  const map = useMap();
  useEffect(() => {
    const layer = new MutedTileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    return () => layer.remove();
  }, [map]);
  return null;
}

// Bring the pin into view when it moves somewhere off screen, or when the map
// is still zoomed out too far to place it accurately.
function Follow({ spot }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    const ll = [spot.lat, spot.lng];
    if (map.getZoom() < 13 || !map.getBounds().contains(ll)) map.setView(ll, 15);
  }, [map, spot]);
  return null;
}

function TapToPin({ onPin }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng.wrap();
      onPin({ lat, lng });
    },
  });
  return null;
}

const CHOICES = [
  { value: "here", label: "Where I am" },
  { value: "photo", label: "From photo" },
  { value: "map", label: "Pick on map" },
];

// Where the report goes on the map. Taking a photo on the beach means the
// phone's position is right; a photo from the library may have been taken
// anywhere, so it can come from the photo's own location data or be placed by
// hand.
export default function LocationPicker({ source, spot, gps, onRetry, photoSpot, photoWithoutSpot, onChoose, onPin }) {
  const { beaches } = useBeaches();
  const choices = CHOICES.filter((c) => c.value !== "photo" || photoSpot);

  return (
    <div className="section where">
      <h2 className="where-title">Where is this beach?</h2>
      <fieldset className="type-toggle where-toggle" style={{ gridTemplateColumns: `repeat(${choices.length}, 1fr)` }}>
        <legend className="visually-hidden">Where to put the report</legend>
        {choices.map((c) => (
          <label key={c.value}>
            <input type="radio" name="where" value={c.value} checked={source === c.value} onChange={() => onChoose(c.value)} />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>

      <WhereStatus source={source} spot={spot} gps={gps} onRetry={onRetry} />
      {source === "here" && photoWithoutSpot && (
        <p className="where-warn">
          The photo you chose has no location saved in it. If it wasn't taken where you are now, pick the spot on the map.
        </p>
      )}

      {source === "map" && <MapSearch beaches={beaches} onBeach={onPin} onPlace={onPin} />}
      <MapContainer
        center={spot ? [spot.lat, spot.lng] : TAIWAN}
        zoom={spot ? 15 : 7}
        minZoom={2}
        scrollWheelZoom={false}
        attributionControl
        className="where-map"
      >
        <Tiles />
        <Follow spot={spot} />
        <TapToPin onPin={onPin} />
        {spot && (
          <CircleMarker
            center={[spot.lat, spot.lng]}
            radius={9}
            interactive={false}
            pathOptions={{ color: "#1d2a32", weight: 3, fillColor: "#e85a30", fillOpacity: 1 }}
          />
        )}
      </MapContainer>
    </div>
  );
}

function WhereStatus({ source, spot, gps, onRetry }) {
  if (source === "photo") return <p className="location">Saved in the photo when it was taken. Tap the map to move it.</p>;
  if (source === "map") {
    return (
      <p className="location">
        {spot ? "Placed by you. Tap the map again to move it." : "Tap the map where the photo was taken, or search for the beach."}
      </p>
    );
  }
  if (gps.status === "locating") return <p className="location">Finding your location…</p>;
  if (gps.status === "error") {
    return (
      <div className="location">
        <p className="error-text">{gps.message}</p>
        <button type="button" className="btn-text" onClick={onRetry}>
          Locate again
        </button>
      </div>
    );
  }
  return (
    <p className="location">
      Your location now, accurate to about {Math.round(gps.value.accuracy)} m.{" "}
      <button type="button" className="btn-text" onClick={onRetry}>
        Locate again
      </button>
    </p>
  );
}
