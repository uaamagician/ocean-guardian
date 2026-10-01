import { useEffect, useState } from "react";
import { BLEACHING_LEVELS, fetchCoralStress, fetchSeaTemp } from "../lib/ocean";

function useOcean(lat, lng) {
  const [state, setState] = useState({ key: null, sst: undefined, coral: undefined });
  const key = `${lat},${lng}`;
  useEffect(() => {
    let cancelled = false;
    const settle = (field) => (value) => !cancelled && setState((s) => ({ ...s, key, [field]: value }));
    fetchSeaTemp(lat, lng).then(settle("sst"), () => settle("sst")("error"));
    fetchCoralStress(lat, lng).then(settle("coral"), () => settle("coral")("error"));
    return () => {
      cancelled = true;
    };
  }, [lat, lng, key]);
  // Stale results from the previous point read as still loading.
  return state.key === key ? state : { sst: undefined, coral: undefined };
}

function SeaTemp({ sst }) {
  if (sst === undefined) return <p className="report-meta">Checking sea temperature…</p>;
  if (sst === "error") return <p className="report-meta">Sea temperature is unavailable right now.</p>;
  if (sst === null) return <p className="report-meta">No sea temperature here. This spot may be on land, so try clicking a little further out to sea.</p>;
  return (
    <p>
      <strong className="ocean-temp">{sst.now.toFixed(1)}°C</strong>
      {sst.weekChange != null && (
        <span className="report-meta">
          {" "}
          {sst.weekChange >= 0 ? "+" : "−"}
          {Math.abs(sst.weekChange).toFixed(1)}°C vs. 7 days ago
        </span>
      )}
      {sst.waveHeight != null && (
        <>
          <br />
          <span className="report-meta">Waves about {sst.waveHeight.toFixed(1)} m</span>
        </>
      )}
    </p>
  );
}

function Coral({ coral }) {
  if (coral === undefined) return <p className="report-meta">Checking coral bleaching alerts…</p>;
  if (coral === "error") return <p className="report-meta">Coral bleaching data is unavailable right now.</p>;
  if (coral === null) return <p className="report-meta">No coral bleaching monitoring in the waters near here.</p>;
  const level = BLEACHING_LEVELS[coral.level] ?? { label: `Alert level ${coral.level}`, tone: "heavy" };
  return (
    <p>
      <span className="level">
        <span className="level-dot" data-tone={level.tone} />
        {level.label}
      </span>
      <br />
      <span className="report-meta">
        Nearby waters, heat stress {coral.dhw.toFixed(1)} °C-weeks, NOAA data from {coral.date}
      </span>
    </p>
  );
}

export default function OceanConditions({ lat, lng }) {
  const { sst, coral } = useOcean(lat, lng);
  return (
    <div className="ocean">
      <span className="report-label">Sea temperature now</span>
      <SeaTemp sst={sst} />
      <span className="report-label">Coral bleaching alert</span>
      <Coral coral={coral} />
    </div>
  );
}
