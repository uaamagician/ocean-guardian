// Whether a report was sent from a beach: the distance to the nearest beach on
// the map, from the listed beaches the site serves plus the ones people added.
// The list is fetched once per instance and refreshed hourly.
const BEACHES_URL = "https://ocean-guardian-65ee0.web.app/beaches.json";
const REFRESH_MS = 60 * 60 * 1000;

let cache = { at: 0, points: null };

async function beachPoints(db) {
  if (cache.points && Date.now() - cache.at < REFRESH_MS) return cache.points;
  const res = await fetch(BEACHES_URL);
  if (!res.ok) throw new Error(`beaches.json ${res.status}`);
  const { beaches } = await res.json();
  // Rows are [id, name, local, lat, lng, ...], as written by scripts/build-beaches.mjs.
  const points = beaches.map((b) => ({ lat: b[3], lng: b[4] }));
  const community = await db.collection("beaches").select("location").get();
  for (const d of community.docs) {
    const loc = d.get("location");
    if (loc) points.push({ lat: loc.lat, lng: loc.lng });
  }
  cache = { at: Date.now(), points };
  return points;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

exports.nearestBeachKm = async (db, location) => {
  let best = Infinity;
  for (const p of await beachPoints(db)) {
    // Skip anything clearly further than the best so far before the trigonometry.
    if (Math.abs(p.lat - location.lat) * 111 > best) continue;
    best = Math.min(best, distanceKm(location, p));
  }
  return best;
};
