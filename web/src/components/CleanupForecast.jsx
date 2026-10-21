import { useEffect, useState } from "react";
import { FEATURED_SPOTS, describeUv } from "../lib/ocean";
import { bestLowTide, clock, compass, dayName, fetchCleanupForecast, isDaylight, localNow, verdict } from "../lib/forecast";
import "./CleanupForecast.css";

const hours = (t) => Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60;

// Through hourly points, a smooth line (Catmull-Rom as cubic Béziers).
function smooth(points) {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const [p1, p2] = [points[i], points[i + 1]];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// Today's tide, drawn by hand: the water rising and falling through the day,
// night shaded at either end, lows and highs marked, and sunset.
function TideLine({ day, tide, now }) {
  const W = 640;
  const H = 210;
  const left = 16;
  const right = W - 16;
  const top = 40;
  const bottom = 160;
  const levels = tide.map(([, v]) => v);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const x = (h) => left + (h / 24) * (right - left);
  const y = (v) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
  const points = tide.map(([t, v]) => [x(hours(t)), y(v)]);
  const line = smooth(points);
  const area = `${line}L${points.at(-1)[0].toFixed(1)} ${H - 18}L${points[0][0].toFixed(1)} ${H - 18}Z`;
  const rise = x(hours(day.sunrise));
  const set = x(hours(day.sunset));
  const nowX = now?.startsWith(day.date) ? x(hours(now)) : null;
  const marks = [
    ...day.lows.map((p) => ({ ...p, kind: "low" })),
    ...day.highs.map((p) => ({ ...p, kind: "high" })),
  ];

  return (
    <svg className="tide-line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tide today: ${marks.map((m) => `${m.kind} at ${clock(m.time)}`).join(", ")}; sunset ${clock(day.sunset)}`}>
      <rect className="tide-night" x={left} y="8" width={rise - left} height={H - 26} />
      <rect className="tide-night" x={set} y="8" width={right - set} height={H - 26} />
      <path className="tide-water" d={area} />
      <path className="tide-curve" d={line} />
      <line className="tide-ground" x1={left} x2={right} y1={H - 18} y2={H - 18} />
      {[6, 12, 18].map((h) => (
        <text key={h} className="tide-hour" x={x(h)} y={H - 2} textAnchor="middle">
          {h === 12 ? "noon" : h === 6 ? "6 am" : "6 pm"}
        </text>
      ))}
      <g className="tide-sunset">
        <line x1={set} x2={set} y1={top - 10} y2={H - 18} />
        <path d={`M${set - 13} ${H - 18} a13 13 0 0 1 26 0`} />
        <text x={set - 18} y={H - 24} textAnchor="end">
          sunset {clock(day.sunset)}
        </text>
      </g>
      {marks.map((m) => {
        const mx = x(hours(m.time));
        const my = y(m.level);
        const lit = isDaylight(day, m.time);
        return (
          <g key={m.time} className={`tide-mark is-${m.kind} ${lit ? "" : "is-dark"}`}>
            <circle cx={mx} cy={my} r="5" />
            <text x={mx} y={m.kind === "low" ? my + 22 : my - 12} textAnchor="middle">
              {m.kind} {clock(m.time)}
            </text>
          </g>
        );
      })}
      {nowX != null && (
        <g className="tide-now">
          <line x1={nowX} x2={nowX} y1="4" y2={H - 18} />
          <text x={nowX + 5} y="10">
            now
          </text>
        </g>
      )}
    </svg>
  );
}

function Stamp({ v }) {
  return <span className={`verdict-stamp is-${v.key}`}>{v.label}</span>;
}

function Today({ spot, day, tide, now }) {
  const v = verdict(day);
  const low = bestLowTide(day);
  return (
    <div className="forecast-today">
      <div className="forecast-say">
        <Stamp v={v} />
        <p className="forecast-why">
          Today at {spot.name}: {v.why.join(", ")}.
        </p>
        <dl className="forecast-facts">
          <div>
            <dt>Best time</dt>
            <dd>{low ? `${clock(low.time)}, low tide` : "No low tide in daylight"}</dd>
          </div>
          <div>
            <dt>Sunset</dt>
            <dd>{clock(day.sunset)}</dd>
          </div>
          <div>
            <dt>Sunrise</dt>
            <dd>{clock(day.sunrise)}</dd>
          </div>
        </dl>
      </div>
      <TideLine day={day} tide={tide} now={now} />
    </div>
  );
}

// The next four days, set out like the tide table pinned up at a harbour.
function TideTable({ days }) {
  return (
    <table className="tide-table">
      <caption className="visually-hidden">Cleanup conditions for the next four days</caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Cleanup?</th>
          <th scope="col">Low tide</th>
          <th scope="col">Waves</th>
          <th scope="col">Wind</th>
          <th scope="col">Rain</th>
          <th scope="col">UV</th>
          <th scope="col">Sunset</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day, i) => {
          const v = verdict(day);
          const best = bestLowTide(day);
          return (
            <tr key={day.date}>
              <th scope="row">{dayName(day.date, i)}</th>
              <td data-label="Cleanup?">
                <Stamp v={v} />
              </td>
              <td data-label="Low tide">
                {day.lows.length === 0 && "–"}
                {day.lows.map((p) => (
                  <span key={p.time} className={`tide-time ${p === best ? "is-best" : ""} ${isDaylight(day, p.time) ? "" : "is-dark"}`}>
                    {clock(p.time)}
                  </span>
                ))}
              </td>
              <td data-label="Waves">{day.waves == null ? "–" : `${day.waves.toFixed(1)} m`}</td>
              <td data-label="Wind">
                <span className="wind">
                  <svg viewBox="0 0 20 20" className="wind-arrow" style={{ rotate: `${day.windFrom + 180}deg` }} aria-hidden="true">
                    <path d="M10 17 V4 M5 9 L10 3 L15 9" />
                  </svg>
                  {Math.round(day.wind)} km/h
                  <small>from {compass(day.windFrom)}</small>
                </span>
              </td>
              <td data-label="Rain">{day.rain}%</td>
              <td data-label="UV">
                {Math.round(day.uv)} <small>{describeUv(day.uv)}</small>
              </td>
              <td data-label="Sunset" className="tide-sunset-cell">
                {clock(day.sunset)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function CleanupForecast() {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState({ data: null, error: false });
  const spot = FEATURED_SPOTS[index];

  useEffect(() => {
    let live = true;
    setState({ data: null, error: false });
    fetchCleanupForecast(spot).then(
      (data) => live && setState({ data, error: false }),
      () => live && setState({ data: null, error: true }),
    );
    return () => {
      live = false;
    };
  }, [spot]);

  const { data, error } = state;
  return (
    <section className="info-section forecast" id="forecast">
      <h2>Cleanup forecast</h2>
      <p className="info-lead">
        Tide, sea and weather for the next four days. Go near low tide in daylight, when the most sand is uncovered,
        and finish before sunset.
      </p>

      <div className="spot-tabs" role="tablist" aria-label="Coast">
        {FEATURED_SPOTS.map((s, i) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`spot-tab ${i === index ? "is-on" : ""}`}
            onClick={() => setIndex(i)}
          >
            {s.name}
            <small>{s.region}</small>
          </button>
        ))}
      </div>

      {error && <p className="report-meta">Couldn't load the forecast. Try again in a minute.</p>}
      {!data && !error && <p className="report-meta">Loading the forecast…</p>}
      {data && (
        <>
          <Today spot={spot} day={data.days[0]} tide={data.tide[0]} now={localNow(data.offset)} />
          <TideTable days={data.days} />
          <p className="data-note">
            Tide, waves and weather from Open-Meteo forecast models, in local time on that coast. Tide times are a
            model estimate, close but not exact: check the harbour tide table before a big event.
          </p>
        </>
      )}
    </section>
  );
}
