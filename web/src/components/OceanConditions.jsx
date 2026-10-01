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
  if (sst === undefined) return <p className="report-meta">查詢海溫中…</p>;
  if (sst === "error") return <p className="report-meta">海溫資料暫時無法取得。</p>;
  if (sst === null) return <p className="report-meta">這個位置沒有海溫資料，可能在陸地上，試著點靠海一點的地方。</p>;
  return (
    <p>
      <strong className="ocean-temp">{sst.now.toFixed(1)}°C</strong>
      {sst.weekChange != null && (
        <span className="report-meta">
          ，比 7 天前{sst.weekChange >= 0 ? "高" : "低"} {Math.abs(sst.weekChange).toFixed(1)}°C
        </span>
      )}
    </p>
  );
}

function Coral({ coral }) {
  if (coral === undefined) return <p className="report-meta">查詢珊瑚白化警報中…</p>;
  if (coral === "error") return <p className="report-meta">珊瑚白化資料暫時無法取得。</p>;
  if (coral === null) return <p className="report-meta">這裡不在珊瑚白化監測範圍內。</p>;
  const level = BLEACHING_LEVELS[coral.level] ?? { label: `警報等級 ${coral.level}`, tone: "heavy" };
  return (
    <p>
      <span className="level">
        <span className="level-dot" data-tone={level.tone} />
        {level.label}
      </span>
      <br />
      <span className="report-meta">
        累積熱壓力 {coral.dhw.toFixed(1)} °C-週，NOAA {coral.date} 資料
      </span>
    </p>
  );
}

export default function OceanConditions({ lat, lng }) {
  const { sst, coral } = useOcean(lat, lng);
  return (
    <div className="ocean">
      <span className="report-label">即時海溫</span>
      <SeaTemp sst={sst} />
      <span className="report-label">珊瑚白化警報</span>
      <Coral coral={coral} />
    </div>
  );
}
