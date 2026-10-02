import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Navigation, Printer, TriangleAlert, Truck, Users } from "lucide-react";
import { TOOL_BY_ID } from "../lib/guide";
import { describeUv, describeWeather, fetchDayOutlook, localClock } from "../lib/ocean";
import { headcount } from "../lib/events";
import { Level } from "./ReportDetail";

const span = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

function useDayOutlook(event) {
  const date = event.startsAt.toDate().toLocaleDateString("en-CA");
  const key = `${event.location.lat},${event.location.lng},${date}`;
  const [state, setState] = useState({ key: null, value: undefined });
  useEffect(() => {
    let cancelled = false;
    fetchDayOutlook(event.location.lat, event.location.lng, date).then(
      (value) => !cancelled && setState({ key, value }),
      () => !cancelled && setState({ key, value: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [event.location.lat, event.location.lng, date, key]);
  return state.key === key ? state.value : undefined;
}

function DayOutlook({ event }) {
  const day = useDayOutlook(event);
  if (day === undefined) return <p className="report-meta">Loading the forecast…</p>;
  if (day === "error") return <p className="report-meta">The forecast is unavailable right now.</p>;
  if (day.outOfRange) {
    return <p className="report-meta">The weather and tide forecast appears here about two weeks before the day.</p>;
  }
  return (
    <>
      <dl className="wo-rows">
        <div>
          <dt>Weather</dt>
          <dd>
            {describeWeather(day.code)}, up to {Math.round(day.tempMax)}°C
          </dd>
        </div>
        <div>
          <dt>Chance of rain</dt>
          <dd>{day.rainChance ?? "–"}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>Up to {Math.round(day.windMax)} km/h</dd>
        </div>
        <div>
          <dt>UV index</dt>
          <dd>
            {day.uvMax?.toFixed(1)} ({describeUv(day.uvMax)})
          </dd>
        </div>
        <div>
          <dt>Sunrise and sunset</dt>
          <dd>
            {localClock(day.sunrise)} to {localClock(day.sunset)}
          </dd>
        </div>
        <div>
          <dt>Tides</dt>
          <dd>
            {day.tides === null
              ? "Forecast appears about a week before"
              : day.tides.length === 0
                ? "No data"
                : day.tides.map((t) => `${t.type} ${localClock(t.time)}`).join(", ")}
          </dd>
        </div>
      </dl>
      <p className="bp-note">Forecast from Open-Meteo for the event day. Tides are a model estimate, not for navigation.</p>
    </>
  );
}

export default function WorkOrder({ event, signups }) {
  const wo = event.workOrder;
  const joined = headcount(signups);
  const target = Math.min(event.capacity, wo.volunteers.max);
  const pledged = (tool) => (signups ?? []).filter((s) => s.bringing.includes(tool)).length;
  const start = event.startsAt.toDate();

  return (
    <section className="wo" aria-labelledby="wo-title">
      <header className="wo-head">
        <div>
          <span className="report-label">Work order</span>
          <h2 id="wo-title">{event.title}</h2>
        </div>
        <button type="button" className="chip-button wo-print" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print
        </button>
      </header>

      <dl className="wo-rows">
        <div>
          <dt>When</dt>
          <dd>
            {start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            , {event.durationHours} h
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>
            {event.beachName}
            {event.meetingPoint && `, ${event.meetingPoint}`}
          </dd>
        </div>
        <div>
          <dt>Debris level</dt>
          <dd>
            <Level category={wo.severity} />
          </dd>
        </div>
      </dl>
      <a
        className="chip-button wo-directions"
        href={`https://www.google.com/maps/dir/?api=1&destination=${event.location.lat},${event.location.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        <Navigation aria-hidden="true" />
        Directions to the beach
      </a>

      <section className="wo-block">
        <h3>
          <Users aria-hidden="true" /> Crew
        </h3>
        <div className="wo-crew">
          <strong>
            {joined} <span>of {target} joined</span>
          </strong>
          <span className="report-meta">AI suggests {span(wo.volunteers)} people, capacity {event.capacity}</span>
        </div>
        <div className="wo-bar" role="img" aria-label={`${joined} of ${target} volunteers joined`}>
          <span style={{ width: `${Math.min(100, (joined / target) * 100)}%` }} />
        </div>
        {wo.teams?.length > 0 && (
          <ol className="wo-teams">
            {wo.teams.map((t) => (
              <li key={t.name}>
                <strong>{t.name}</strong>
                <span className="wo-team-size">{t.people} people</span>
                <p>{t.task}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="wo-block">
        <h3>Gear checklist</h3>
        <p className="report-meta">
          Volunteers say what they can bring when they sign up. About {span(wo.bags)} full bags of debris expected.
        </p>
        <ul className="wo-gear">
          {wo.gear.map((g) => {
            const tool = TOOL_BY_ID[g.tool];
            if (!tool) return null;
            const Icon = tool.icon;
            const n = pledged(g.tool);
            return (
              <li key={g.tool}>
                <Icon aria-hidden="true" />
                <div className="wo-gear-main">
                  <Link to={`/guide#tool-${tool.id}`} viewTransition>
                    {tool.name}
                  </Link>
                  <span className="report-meta">
                    {g.quantity}. {g.reason}
                  </span>
                </div>
                <span className={n > 0 ? "wo-pledge is-covered" : "wo-pledge"}>
                  {n > 0 ? (
                    <>
                      <Check aria-hidden="true" /> {n} bringing
                    </>
                  ) : (
                    "Nobody yet"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={wo.heavyMachinery.needed ? "wo-block plan-machinery is-needed" : "wo-block plan-machinery"}>
        <Truck aria-hidden="true" />
        <div>
          <strong>{wo.heavyMachinery.needed ? "Heavy equipment needed" : "No heavy equipment needed"}</strong>
          {wo.heavyMachinery.reason && <p>{wo.heavyMachinery.reason}</p>}
        </div>
      </section>

      {wo.hazards.length > 0 && (
        <section className="wo-block">
          <h3>
            <TriangleAlert aria-hidden="true" /> Watch out for
          </h3>
          <ul className="plan-list plan-hazards">
            {wo.hazards.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      )}

      {wo.tips.length > 0 && (
        <section className="wo-block">
          <h3>Tips</h3>
          <ul className="plan-list">
            {wo.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="wo-block">
        <h3>On the day</h3>
        <DayOutlook event={event} />
      </section>

      <p className="bp-note">
        Planned by AI from {wo.reportCount} report{wo.reportCount === 1 ? "" : "s"} of this beach. Check conditions before
        you set out.
      </p>
    </section>
  );
}
