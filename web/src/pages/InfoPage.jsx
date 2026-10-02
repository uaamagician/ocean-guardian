import { useRef } from "react";
import { Link } from "react-router";
import LiveOcean from "../components/LiveOcean";
import { BLEACHING_LEVELS } from "../lib/ocean";
import useSectionMotion from "../lib/useSectionMotion";
import "./Home.css";

const LEVEL_MEANING = [
  "Water temperature is normal. Coral is under no heat stress.",
  "The water is warmer than coral can tolerate, but damage hasn't started to build up.",
  "Heat stress is building. Some scattered bleaching is possible.",
  "Heat stress of 4 °C-weeks or more. Significant bleaching is likely.",
  "Heat stress of 8 °C-weeks or more. Widespread bleaching and some coral death are likely.",
];

export default function InfoPage() {
  const rootRef = useRef(null);
  useSectionMotion(rootRef);
  return (
    <div ref={rootRef}>
      <div className="info-top" />
      <LiveOcean title="Live ocean conditions" />

      <section className="band">
        <div className="band-inner">
          <div className="band-split">
            <div className="band-head">
              <h2>Reading a bleaching alert</h2>
              <p>
                Coral gets its food and color from algae living inside it. When the water stays too warm, the algae leave and the coral turns white. If the heat lasts too long, the coral starves.
              </p>
            </div>
          </div>
          <ul className="bleach-levels">
            {LEVEL_MEANING.map((meaning, level) => (
              <li key={BLEACHING_LEVELS[level].label}>
                <span className="level">
                  <span className="level-dot" data-tone={BLEACHING_LEVELS[level].tone} />
                  {BLEACHING_LEVELS[level].label}
                </span>
                <p>{meaning}</p>
              </li>
            ))}
          </ul>
          <p className="report-meta">
            Heat stress is measured in Degree Heating Weeks: how far the water rose above what coral tolerates, multiplied by how many weeks it stayed there, over the past 12 weeks. Alert levels are defined by NOAA Coral Reef Watch.
          </p>
        </div>
      </section>

      <section className="band band-deep">
        <div className="band-inner">
          <div className="band-split band-split-top">
            <div className="band-head">
              <h2>Most global warming happens in the ocean</h2>
              <p>
                The ocean has absorbed more than 90% of the extra heat trapped by greenhouse gases. It shields the land from most of the warming, at the cost of warmer, more acidic water and more frequent coral bleaching.
              </p>
            </div>
            <div className="band-head">
              <h2>Most beach debris comes from land</h2>
              <p>Most plastic on beaches flows out through rivers, storm drains, and activity along the coast. Every single-use item you skip is one less piece for the tide to bring back.</p>
              <Link to="/report" className="btn btn-light">
                Report a beach you visited
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
