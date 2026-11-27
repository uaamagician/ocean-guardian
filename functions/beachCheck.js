// Whether a report was sent from a beach: the distance to the nearest beach on
// the map, from the listed beaches the site serves and, separately, the ones
// people added (minus any hidden for being inland). The lists are fetched once
// per instance and refreshed hourly.
const BEACHES_URL = "https://ocean-guardian-65ee0.web.app/beaches.json";
const REFRESH_MS = 60 * 60 * 1000;

let cache = { at: 0, listed: null, added: null };

async function beachPoints(db) {
  if (cache.listed && Date.now() - cache.at < REFRESH_MS) return cache;
  const res = await fetch(BEACHES_URL);
  if (!res.ok) throw new Error(`beaches.json ${res.status}`);
  const { beaches } = await res.json();
  // Rows are [id, name, local, lat, lng, ...], as written by scripts/build-beaches.mjs.
  const listed = beaches.map((b) => ({ lat: b[3], lng: b[4] }));
  const community = await db.collection("beaches").select("location", "hidden").get();
  const added = community.docs
    .filter((d) => d.get("location") && !d.get("hidden"))
    .map((d) => ({ lat: d.get("location").lat, lng: d.get("location").lng }));
  cache = { at: Date.now(), listed, added };
  return cache;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function nearest(points, location) {
  let best = Infinity;
  for (const p of points) {
    // Skip anything clearly further than the best so far before the trigonometry.
    if (Math.abs(p.lat - location.lat) * 111 > best) continue;
    best = Math.min(best, distanceKm(location, p));
  }
  return best;
}

// Kilometres to the nearest listed beach and to the nearest one people added.
exports.nearestBeachKm = async (db, location) => {
  const { listed, added } = await beachPoints(db);
  return { listed: nearest(listed, location), added: nearest(added, location) };
};
