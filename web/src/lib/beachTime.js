import { useEffect, useState } from "react";

// A cleanup happens at the beach's own clock, wherever the person reading or
// creating it is. Open-Meteo, already used for the sea conditions, works out
// the time zone from the coordinates.
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const CACHE = "beach-zones";
const zones = new Map();

const keyOf = ({ lat, lng }) => `${lat.toFixed(2)},${lng.toFixed(2)}`;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE)) ?? {};
  } catch {
    return {};
  }
}

function remember(key, zone) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ ...readCache(), [key]: zone }));
  } catch {
    // Without storage it is simply looked up again next visit.
  }
}

export const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function loadZone(location) {
  const key = keyOf(location);
  if (!zones.has(key)) {
    const cached = readCache()[key];
    zones.set(
      key,
      cached
        ? Promise.resolve(cached)
        : fetch(`${FORECAST}?latitude=${location.lat}&longitude=${location.lng}&timezone=auto&forecast_days=1&daily=sunrise`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`time zone ${res.status}`))))
            .then(({ timezone }) => {
              remember(key, timezone);
              return timezone;
            })
            .catch((err) => {
              zones.delete(key);
              throw err;
            }),
    );
  }
  return zones.get(key);
}

// The beach's time zone, or null until it is known (or if it can't be found,
// in which case times show in the reader's own zone as before).
export function useZone(location) {
  const key = location ? keyOf(location) : null;
  const [found, setFound] = useState({ key: null, zone: null });
  useEffect(() => {
    if (!location) return undefined;
    let cancelled = false;
    loadZone(location).then(
      (zone) => !cancelled && setFound({ key, zone }),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [key]); // the key stands for the location
  return found.key === key ? found.zone : null;
}

function partsIn(date, zone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

// A Date whose local fields read as the beach's clock at that moment. Only for
// showing; compare times with the real timestamp.
export function wallClock(date, zone) {
  if (!zone) return date;
  const p = partsIn(date, zone);
  return new Date(p.y, p.m - 1, p.d, p.h, p.min);
}

// The moment the beach's clock reads this date ("2026-12-05") and time ("09:00").
export function fromWallClock(day, time, zone) {
  if (!zone) return new Date(`${day}T${time}`);
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  let t = target;
  // Twice, so a date across a daylight-saving change still lands right.
  for (let i = 0; i < 2; i += 1) {
    const p = partsIn(new Date(t), zone);
    t += target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  }
  return new Date(t);
}

// "PST", "GMT+9" and so on, only when the beach's zone isn't the reader's.
export function zoneLabel(date, zone) {
  if (!zone || zone === viewerZone()) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName").value;
}

// When a cleanup starts, by the beach's clock, and the zone to name beside it.
export function useEventStart(event) {
  const zone = useZone(event.location);
  const real = event.startsAt.toDate();
  return { start: wallClock(real, zone), tz: zoneLabel(real, zone) };
}
