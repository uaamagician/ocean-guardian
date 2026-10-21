// Cleanup conditions for a stretch of coast, for today and the next three
// days: tides, waves, wind, rain, UV, sunrise and sunset. Open-Meteo, free and
// callable from the browser. Times come back in the coast's own time zone and
// are shown as they are, so 5:20 pm means 5:20 pm on that beach.

const MARINE = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const DAYS = 4;
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

// Highs and lows from the hourly sea level: a turning point, with its time
// refined between the hours by fitting a parabola through its neighbours.
function turningPoints(times, levels) {
  const lows = [];
  const highs = [];
  for (let i = 1; i < levels.length - 1; i += 1) {
    const [a, b, c] = [levels[i - 1], levels[i], levels[i + 1]];
    if (a == null || b == null || c == null) continue;
    const isLow = b < a && b <= c;
    const isHigh = b > a && b >= c;
    if (!isLow && !isHigh) continue;
    const bend = a - 2 * b + c;
    const shift = bend === 0 ? 0 : (a - c) / (2 * bend);
    const at = new Date(`${times[i]}:00Z`).getTime() + shift * 3600e3;
    const point = { time: new Date(at).toISOString().slice(0, 16), level: b - ((a - c) * shift) / 4 };
    (isLow ? lows : highs).push(point);
  }
  return { lows, highs };
}

export function fetchCleanupForecast(spot) {
  const key = `${spot.lat},${spot.lng}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const at = `latitude=${spot.lat}&longitude=${spot.lng}&timezone=auto&forecast_days=${DAYS}`;
  const promise = Promise.all([
    getJson(`${MARINE}?${at}&hourly=sea_level_height_msl,wave_height&daily=wave_height_max`),
    getJson(
      `${FORECAST}?${at}&daily=sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant`,
    ),
  ]).then(([sea, sky]) => {
    const { time, sea_level_height_msl: level } = sea.hourly;
    const { lows, highs } = turningPoints(time, level);
    const days = sky.daily.time.map((date, i) => ({
      date,
      sunrise: sky.daily.sunrise[i],
      sunset: sky.daily.sunset[i],
      uv: sky.daily.uv_index_max[i],
      rain: sky.daily.precipitation_probability_max[i],
      wind: sky.daily.wind_speed_10m_max[i],
      windFrom: sky.daily.wind_direction_10m_dominant[i],
      waves: sea.daily.wave_height_max?.[i] ?? null,
      lows: lows.filter((p) => p.time.startsWith(date)),
      highs: highs.filter((p) => p.time.startsWith(date)),
    }));
    // The tide line for each day, hour by hour.
    const tide = days.map(({ date }) =>
      time.map((t, i) => [t, level[i]]).filter(([t, v]) => t.startsWith(date) && v != null),
    );
    return { days, tide, offset: sky.utc_offset_seconds };
  });
  // A failed load is forgotten so the next visit tries again.
  promise.catch(() => cache.delete(key));
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

// Is it a good day to clean this beach? Rain, wind and sea decide whether to
// go at all; strong sun only means going early or late.
export function verdict(day) {
  const against = [];
  const caution = [];
  if (day.rain >= 70) against.push(`rain likely (${day.rain}%)`);
  else if (day.rain >= 40) caution.push(`chance of rain (${day.rain}%)`);
  if (day.wind >= 40) against.push(`strong wind, ${Math.round(day.wind)} km/h`);
  else if (day.wind >= 25) caution.push(`breezy, ${Math.round(day.wind)} km/h`);
  if (day.waves != null && day.waves >= 2) against.push(`rough sea, ${day.waves.toFixed(1)} m waves`);
  else if (day.waves != null && day.waves >= 1.2) caution.push(`choppy, ${day.waves.toFixed(1)} m waves`);
  if (day.uv >= 8) caution.push("very strong sun");

  if (against.length) return { key: "no", label: "Not today", why: against.concat(caution) };
  if (caution.length) return { key: "fair", label: "Fair", why: caution };
  const calm = [];
  if (day.rain < 20) calm.push("dry");
  if (day.wind < 15) calm.push("light wind");
  if (day.waves != null && day.waves < 0.8) calm.push("calm sea");
  return { key: "good", label: "Good day", why: calm.length ? calm : ["nothing in the way"] };
}

const minutes = (t) => {
  const [h, m] = t.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

// The lowest tide in daylight is when the most beach is uncovered.
export function bestLowTide(day) {
  const up = minutes(day.sunrise);
  const down = minutes(day.sunset);
  const lit = day.lows.filter((p) => minutes(p.time) > up + 30 && minutes(p.time) < down - 30);
  return lit.sort((a, b) => a.level - b.level)[0] ?? null;
}

export const isDaylight = (day, t) => minutes(t) > minutes(day.sunrise) && minutes(t) < minutes(day.sunset);

// The time on that coast right now, in the same form as the data's times.
export const localNow = (offsetSeconds) => new Date(Date.now() + offsetSeconds * 1000).toISOString().slice(0, 16);

// "2026-10-22T17:20" -> "5:20 pm", read as the beach's own clock.
export function clock(t) {
  let [h, m] = t.slice(11, 16).split(":").map(Number);
  const pm = h >= 12;
  h %= 12;
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, "0")} ${pm ? "pm" : "am"}`;
}

export function dayName(date, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];
