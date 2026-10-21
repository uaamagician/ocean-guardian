import LiveOcean from "../components/LiveOcean";
import CleanupForecast from "../components/CleanupForecast";
import ReportStats from "../components/ReportStats";
import { BLEACHING_LEVELS } from "../lib/ocean";
import "./Home.css";
import "./InfoPage.css";

const LEVEL_MEANING = [
  "Water temperature is normal. No heat stress.",
  "Warmer than coral tolerates, but no damage has built up yet.",
  "Heat stress is building. Scattered bleaching is possible.",
  "4 °C-weeks of heat stress or more. Significant bleaching is likely.",
  "8 °C-weeks or more. Widespread bleaching and some coral death are likely.",
];


export default function InfoPage() {
  return (
    <div className="info-page">
      <header className="info-header">
        <div className="info-header-inner">
          <h1>Ocean data</h1>
          <p>When to go, what the sea is doing, and what the reports so far add up to.</p>
        </div>
      </header>

      <CleanupForecast />

      <div id="conditions">
        <LiveOcean title="Sea temperature around Taiwan" />
      </div>

      <ReportStats />

      <section className="info-section" id="bleaching">
        <h2>Reading a bleaching alert</h2>
        <p className="info-lead">
          Coral gets its color and most of its food from algae living inside it. When the water stays too warm, the
          algae leave and the coral turns white. If the heat lasts, the coral starves.
        </p>
        <table className="sketch-table">
          <thead>
            <tr>
              <th scope="col">Alert level</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_MEANING.map((meaning, level) => (
              <tr key={BLEACHING_LEVELS[level].label}>
                <th scope="row">
                  <span className="level">
                    <span className="level-dot" data-tone={BLEACHING_LEVELS[level].tone} />
                    {BLEACHING_LEVELS[level].label}
                  </span>
                </th>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="report-meta">
          Heat stress is counted in degree heating weeks (°C-weeks): how far the water rose above what coral tolerates,
          times how many weeks it stayed there, over the past 12 weeks. Levels are defined by NOAA Coral Reef Watch.
        </p>
      </section>


    </div>
  );
}
