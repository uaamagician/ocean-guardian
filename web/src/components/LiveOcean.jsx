import { useEffect, useState } from "react";
import { BLEACHING_LEVELS, FEATURED_SPOTS, fetchCoralStress, fetchSeaTemps } from "../lib/ocean";
import { Reveal } from "./Motion";
import "../pages/Home.css";

function useFeaturedConditions() {
  const [temps, setTemps] = useState(null);
  const [corals, setCorals] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetchSeaTemps(FEATURED_SPOTS)
      .then((t) => !cancelled && setTemps(t))
      .catch(() => !cancelled && setTemps("error"));
    FEATURED_SPOTS.forEach((spot) =>
      fetchCoralStress(spot.lat, spot.lng)
        .then((c) => !cancelled && setCorals((prev) => ({ ...prev, [spot.name]: c })))
        .catch(() => !cancelled && setCorals((prev) => ({ ...prev, [spot.name]: "error" }))),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return { temps, corals };
}

export default function LiveOcean({ title = "The ocean right now" }) {
  const { temps, corals } = useFeaturedConditions();
  return (
    <section className="band band-dark">
      <div className="band-inner">
        <Reveal className="band-head">
          <h2>{title}</h2>
          <p>Coral bleaches when the water stays too warm for weeks. Here are today's sea temperatures and bleaching alerts around Taiwan.</p>
        </Reveal>
        <div className="spots">
          {FEATURED_SPOTS.map((spot, i) => {
            const sst = Array.isArray(temps) ? temps[i] : null;
            const coral = corals[spot.name];
            const level = coral && coral !== "error" ? BLEACHING_LEVELS[coral.level] : null;
            return (
              <article key={spot.name} className="spot">
                <div>
                  <div className="spot-name">{spot.name}</div>
                  <div className="spot-region">{spot.region}</div>
                </div>
                <div className="spot-temp">
                  {sst ? sst.now.toFixed(1) : "–"}
                  <small>°C</small>
                </div>
                <div className="spot-change">
                  {temps === null && "Loading…"}
                  {temps === "error" && "Temperature unavailable"}
                  {sst?.weekChange != null &&
                    `${sst.weekChange >= 0 ? "+" : "−"}${Math.abs(sst.weekChange).toFixed(1)}°C vs. last week`}
                </div>
                <div className="spot-coral">
                  {level ? (
                    <span className="level">
                      <span className="level-dot" data-tone={level.tone} />
                      {level.label}
                    </span>
                  ) : (
                    <span>{coral === "error" ? "Bleaching data unavailable" : coral === null ? "Not monitored" : "Loading…"}</span>
                  )}
                  {level && <small>Heat stress {coral.dhw.toFixed(1)} °C-weeks</small>}
                </div>
              </article>
            );
          })}
        </div>
        <p className="data-note">
          Sea temperature from Open-Meteo, updated hourly. Bleaching alerts from NOAA Coral Reef Watch, updated daily.
        </p>
      </div>
    </section>
  );
}
