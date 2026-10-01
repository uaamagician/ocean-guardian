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
    current: "sea_surface_temperature,wave_height",
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
  return {
    now,
    week,
    weekChange: week.length > 1 ? now - week[0] : null,
    waveHeight: json.current?.wave_height ?? null,
  };
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
  { label: "No stress", tone: "clean" },
  { label: "Bleaching watch", tone: "light" },
  { label: "Bleaching warning", tone: "light" },
  { label: "Alert level 1", tone: "moderate" },
  { label: "Alert level 2", tone: "heavy" },
  { label: "Alert level 3", tone: "heavy" },
  { label: "Alert level 4", tone: "heavy" },
  { label: "Alert level 5", tone: "heavy" },
];

// Beaches sit on the shoreline, where the 5km cell is often classed as land, so
// read the surrounding 3x3 cells and report the strongest alert in nearby water.
// Returns null when every cell is land or has no data.
const CELL = 0.05;

export function fetchCoralStress(lat, lng) {
  return cached(`crw:${round(lat)},${round(lng)}`, async () => {
    const range = (v) => `(${(v - CELL * 1.2).toFixed(3)}):(${(v + CELL * 1.2).toFixed(3)})`;
    const at = `%5B(last)%5D%5B${range(lat)}%5D%5B${range(lng)}%5D`;
    const res = await fetch(`${CRW}?CRW_BAA${at},CRW_DHW${at}`);
    if (!res.ok) throw new Error(`Coral Reef Watch ${res.status}`);
    let worst = null;
    for (const [time, , , level, dhw] of (await res.json()).table.rows) {
      if (level == null || Number.isNaN(Number(level))) continue;
      if (!worst || level > worst.level || (level === worst.level && dhw > worst.dhw)) {
        worst = { date: time.slice(0, 10), level: Number(level), dhw: Number(dhw) };
      }
    }
    return worst;
  });
}

// Offshore points: coastal 5km cells are often classed as land and return no data.
export const FEATURED_SPOTS = [
  { name: "Jinshan", region: "New Taipei", lat: 25.26, lng: 121.66 },
  { name: "Fulong", region: "New Taipei", lat: 25.04, lng: 121.97 },
  { name: "Penghu", region: "Penghu Islands", lat: 23.55, lng: 119.5 },
  { name: "Green Island", region: "Taitung", lat: 22.66, lng: 121.5 },
  { name: "Nanwan, Kenting", region: "Pingtung", lat: 21.92, lng: 120.76 },
];

const FORECAST = "https://api.open-meteo.com/v1/forecast";

// WMO weather codes, grouped the way Open-Meteo documents them.
const WEATHER_CODES = [
  [[0], "Clear"],
  [[1], "Mostly clear"],
  [[2], "Partly cloudy"],
  [[3], "Overcast"],
  [[45, 48], "Fog"],
  [[51, 53, 55, 56, 57], "Drizzle"],
  [[61, 63, 65, 66, 67], "Rain"],
  [[71, 73, 75, 77], "Snow"],
  [[80, 81, 82], "Rain showers"],
  [[85, 86], "Snow showers"],
  [[95, 96, 99], "Thunderstorm"],
];

export function describeWeather(code) {
  return WEATHER_CODES.find(([codes]) => codes.includes(code))?.[1] ?? "Unknown";
}

// WHO UV index bands.
export function describeUv(uv) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];

// Times come back in the beach's own time zone ("2026-10-01T17:46").
export const localClock = (iso) => iso?.slice(11, 16) ?? null;

export function fetchWeather(lat, lng) {
  return cached(`wx:${round(lat)},${round(lng)}`, async () => {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      current: "temperature_2m,wind_speed_10m,wind_direction_10m,uv_index,weather_code",
      daily: "sunrise,sunset",
      forecast_days: "1",
      timezone: "auto",
    });
    const res = await fetch(`${FORECAST}?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo forecast ${res.status}`);
    const json = await res.json();
    const c = json.current;
    return {
      temp: c.temperature_2m,
      wind: c.wind_speed_10m,
      windDir: c.wind_direction_10m,
      uv: c.uv_index,
      code: c.weather_code,
      sunrise: json.daily?.sunrise?.[0] ?? null,
      sunset: json.daily?.sunset?.[0] ?? null,
    };
  });
}

// Open-Meteo's sea level height includes tides, so the next turning points are
// the next high and low tide. A model estimate: fine for planning, not navigation.
export function fetchTides(lat, lng) {
  return cached(`tide:${round(lat)},${round(lng)}`, async () => {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      hourly: "sea_level_height_msl",
      forecast_days: "2",
      timezone: "auto",
    });
    const res = await fetch(`${OPEN_METEO}?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo tides ${res.status}`);
    const json = await res.json();
    const times = json.hourly?.time ?? [];
    const levels = json.hourly?.sea_level_height_msl ?? [];
    if (!levels.some((v) => v != null)) return null;

    const nowLocal = new Date(Date.now() + json.utc_offset_seconds * 1000).toISOString().slice(0, 16);
    let high = null;
    let low = null;
    for (let i = 1; i < levels.length - 1 && !(high && low); i++) {
      const [prev, cur, next] = [levels[i - 1], levels[i], levels[i + 1]];
      if (times[i] < nowLocal || prev == null || cur == null || next == null) continue;
      if (!high && cur > prev && cur >= next) high = { time: times[i], height: cur };
      if (!low && cur < prev && cur <= next) low = { time: times[i], height: cur };
    }
    return { high, low };
  });
}
