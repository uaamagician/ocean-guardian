// Live ocean data from free public APIs that allow browser calls (CORS *).
// Open-Meteo Marine: sea surface temperature, global, hourly.
// NOAA Coral Reef Watch (via PacIOOS ERDDAP): 5km daily bleaching heat stress.

const OPEN_METEO = "https://marine-api.open-meteo.com/v1/marine";
const CRW = "https://pae-paha.pacioos.hawaii.edu/erddap/griddap/dhw_5km.json";
const CACHE_MS = 10 * 60 * 1000;

const cache = new Map();

function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = load().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

const round = (n) => Math.round(n * 100) / 100;

function seaTempParams(lats, lngs) {
  return new URLSearchParams({
    latitude: lats.join(","),
    longitude: lngs.join(","),
    current: "sea_surface_temperature",
    daily: "sea_surface_temperature_max",
    past_days: "7",
    forecast_days: "1",
    timezone: "auto",
  });
}

function parseSeaTemp(json) {
  const now = json.current?.sea_surface_temperature;
  if (now == null) return null;
  const week = (json.daily?.sea_surface_temperature_max ?? []).filter((v) => v != null);
  return { now, week, weekChange: week.length > 1 ? now - week[0] : null };
}

// Returns null when the point is on land (no ocean cell).
export function fetchSeaTemp(lat, lng) {
  return cached(`sst:${round(lat)},${round(lng)}`, async () => {
    const res = await fetch(`${OPEN_METEO}?${seaTempParams([lat], [lng])}`);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    return parseSeaTemp(await res.json());
  });
}

// One request for several spots; Open-Meteo returns an array in the same order.
export async function fetchSeaTemps(spots) {
  const params = seaTempParams(
    spots.map((s) => s.lat),
    spots.map((s) => s.lng),
  );
  const res = await fetch(`${OPEN_METEO}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [json]).map(parseSeaTemp);
}

export const BLEACHING_LEVELS = [
  { label: "無白化壓力", tone: "clean" },
  { label: "白化觀察", tone: "light" },
  { label: "白化警告", tone: "light" },
  { label: "白化警報一級", tone: "moderate" },
  { label: "白化警報二級", tone: "heavy" },
  { label: "白化警報三級", tone: "heavy" },
  { label: "白化警報四級", tone: "heavy" },
  { label: "白化警報五級", tone: "heavy" },
];

// Returns null when the 5km cell is land or has no data.
export function fetchCoralStress(lat, lng) {
  return cached(`crw:${round(lat)},${round(lng)}`, async () => {
    const at = `%5B(last)%5D%5B(${lat})%5D%5B(${lng})%5D`;
    const res = await fetch(`${CRW}?CRW_BAA${at},CRW_DHW${at}`);
    if (!res.ok) throw new Error(`Coral Reef Watch ${res.status}`);
    const [time, , , level, dhw] = (await res.json()).table.rows[0];
    if (level == null || Number.isNaN(Number(level))) return null;
    return { date: time.slice(0, 10), level: Number(level), dhw: Number(dhw) };
  });
}

// Offshore points: coastal 5km cells are often classed as land and return no data.
export const FEATURED_SPOTS = [
  { name: "金山", region: "新北", lat: 25.26, lng: 121.66 },
  { name: "福隆", region: "新北", lat: 25.04, lng: 121.97 },
  { name: "澎湖", region: "澎湖", lat: 23.55, lng: 119.5 },
  { name: "綠島", region: "台東", lat: 22.66, lng: 121.5 },
  { name: "墾丁南灣", region: "屏東", lat: 21.92, lng: 120.76 },
];
