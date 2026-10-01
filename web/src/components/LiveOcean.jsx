import { useEffect, useState } from "react";
import { BLEACHING_LEVELS, FEATURED_SPOTS, fetchCoralStress, fetchSeaTemps } from "../lib/ocean";
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

export default function LiveOcean({ title = "現在的海" }) {
  const { temps, corals } = useFeaturedConditions();
  return (
    <section className="band band-dark">
      <div className="band-inner">
        <div className="band-head">
          <h2>{title}</h2>
          <p>海水連續幾週偏熱，珊瑚就會白化。這是台灣幾片海域今天的海溫和珊瑚白化警報。</p>
        </div>
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
                  {temps === null && "讀取中…"}
                  {temps === "error" && "海溫暫時無法取得"}
                  {sst?.weekChange != null &&
                    `比一週前${sst.weekChange >= 0 ? "高" : "低"} ${Math.abs(sst.weekChange).toFixed(1)}°C`}
                </div>
                <div className="spot-coral">
                  {level ? (
                    <span className="level">
                      <span className="level-dot" data-tone={level.tone} />
                      {level.label}
                    </span>
                  ) : (
                    <span>{coral === "error" ? "白化資料暫時無法取得" : coral === null ? "無監測資料" : "讀取中…"}</span>
                  )}
                  {level && <small>累積熱壓力 {coral.dhw.toFixed(1)} °C-週</small>}
                </div>
              </article>
            );
          })}
        </div>
        <p className="data-note">
          海溫來自 Open-Meteo，每小時更新；珊瑚白化警報來自 NOAA Coral Reef Watch，每天更新。
        </p>
      </div>
    </section>
  );
}
