import { Link } from "react-router";
import LiveOcean from "../components/LiveOcean";
import { BLEACHING_LEVELS } from "../lib/ocean";
import "./Home.css";

const LEVEL_MEANING = [
  "海溫正常，珊瑚沒有熱壓力。",
  "海溫已經高過珊瑚能承受的範圍，但還沒開始累積傷害。",
  "熱壓力開始累積，可能出現零星白化。",
  "累積熱壓力達 4 °C-週以上，預期會出現明顯的白化。",
  "累積熱壓力達 8 °C-週以上，預期大範圍白化，部分珊瑚死亡。",
];

export default function InfoPage() {
  return (
    <>
      <div className="info-top" />
      <LiveOcean title="即時海況" />

      <section className="band">
        <div className="band-inner">
          <div className="band-split">
            <div className="band-head">
              <h2>看懂珊瑚白化警報</h2>
              <p>
                珊瑚靠體內的共生藻提供養分和顏色。海水持續偏熱，共生藻會離開，珊瑚就變白；熱壓力撐太久，珊瑚會餓死。
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
            「累積熱壓力」（Degree Heating Weeks）是過去 12 週裡，海溫超過珊瑚耐受上限的程度乘上持續週數。等級定義來自 NOAA Coral Reef Watch。
          </p>
        </div>
      </section>

      <section className="band band-deep">
        <div className="band-inner">
          <div className="band-split band-split-top">
            <div className="band-head">
              <h2>暖化，大部分發生在海裡</h2>
              <p>
                溫室氣體多留住的熱，超過九成被海洋吸收。海洋替陸地擋下了大部分的暖化，代價是更熱、更酸的海水，以及越來越頻繁的珊瑚白化。
              </p>
            </div>
            <div className="band-head">
              <h2>垃圾，大部分來自陸地</h2>
              <p>海灘上的塑膠多半是從河川、排水溝和海岸活動流出去的。少用一次性塑膠，就是少一件會被浪推回岸上的垃圾。</p>
              <Link to="/report" className="btn btn-light">
                回報你看到的海灘
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
