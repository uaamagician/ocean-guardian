import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Package, Sparkles, Users } from "lucide-react";
import Hero from "../components/Hero";
import ReportsMap from "../components/ReportsMap";
import { Level } from "../components/ReportDetail";
import usePhotoUrls from "../lib/usePhotoUrls";
import LiveOcean from "../components/LiveOcean";
import { CATEGORIES, TONE_COLORS, formatTime } from "../lib/labels";
import usePublishedReports from "../lib/usePublishedReports";
import "./Home.css";

function WorldMap({ reports }) {
  const navigate = useNavigate();
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>世界各地的海灘，現在長什麼樣子</h2>
            <p>每個點都是一筆經過 AI 判讀的回報。點地圖上任何一片海，也能查到當地的即時海溫和珊瑚白化警報。</p>
          </div>
          <Link to="/map" className="btn">
            打開完整地圖
          </Link>
        </div>
        <div className="map-preview">
          <ReportsMap
            reports={reports}
            scrollWheelZoom={false}
            onSelect={(id) => navigate(`/map?r=${id}`)}
            onMapClick={({ lat, lng }) => navigate(`/map?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}`)}
          />
        </div>
      </div>
    </section>
  );
}

const LEVEL_ORDER = ["clean", "light", "moderate", "heavy"];

function DebrisStats({ reports }) {
  const stats = useMemo(() => {
    const trash = (reports ?? []).filter((r) => r.type === "trash" && r.aiAnalysis);
    const levels = Object.fromEntries(LEVEL_ORDER.map((k) => [k, 0]));
    const items = new Map();
    for (const r of trash) {
      if (r.aiAnalysis.category in levels) levels[r.aiAnalysis.category] += 1;
      for (const item of new Set(r.aiAnalysis.items ?? [])) items.set(item, (items.get(item) ?? 0) + 1);
    }
    const topItems = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { total: trash.length, levels, topItems };
  }, [reports]);

  const maxItem = stats.topItems[0]?.[1] ?? 1;

  return (
    <section className="band band-deep">
      <div className="band-inner">
        <div className="band-head">
          <h2>海洋垃圾狀況</h2>
          <p>從所有公開回報統計出來的結果。回報越多，這張圖就越接近真實的海岸。</p>
        </div>
        <div className="stats">
          <div className="stat-big">
            <strong>{reports === null ? "–" : stats.total}</strong>
            <span>筆海灘垃圾回報</span>
          </div>

          <div className="stat-block">
            <h3>髒亂程度分布</h3>
            <div className="level-bar" role="img" aria-label="各髒亂程度的回報比例">
              {LEVEL_ORDER.map((k) =>
                stats.levels[k] ? (
                  <span
                    key={k}
                    style={{
                      width: `${(stats.levels[k] / stats.total) * 100}%`,
                      background: TONE_COLORS[CATEGORIES[k].tone],
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className="level-legend">
              {LEVEL_ORDER.map((k) => (
                <li key={k}>
                  <span className="level-dot" data-tone={CATEGORIES[k].tone} />
                  {CATEGORIES[k].label} {stats.levels[k]}
                </li>
              ))}
            </ul>
          </div>

          <div className="stat-block">
            <h3>最常出現的垃圾</h3>
            {stats.topItems.length === 0 ? (
              <p className="data-note">還沒有足夠的辨識結果。</p>
            ) : (
              <ul className="item-bars">
                {stats.topItems.map(([name, count]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span className="bar" style={{ width: `${(count / maxItem) * 100}%` }} />
                    <span className="count">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function LatestCard({ report }) {
  const [cover] = usePhotoUrls(report.photos?.slice(0, 1) ?? []);
  return (
    <Link to={`/map?r=${report.id}`} className="latest-card">
      {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="latest-card-placeholder" />}
      <Level category={report.aiAnalysis?.category} />
      <span className="report-meta">{formatTime(report.createdAt)}</span>
      {report.aiAnalysis?.items?.length > 0 && (
        <ul className="report-items">
          {report.aiAnalysis.items.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function HowItWorks({ reports }) {
  const latest = (reports ?? []).slice(0, 4);
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>回報一片海灘，只要三步</h2>
            <p>不用註冊、不用填表單。拍照的方式也不限制，遠景近景都可以，一次最多四張。</p>
          </div>
          <Link to="/report" className="btn btn-primary">
            開始回報
          </Link>
        </div>
        <ol className="steps">
          <li>
            <h3>拍照上傳</h3>
            <p>拍下眼前的海灘，位置會自動帶入。</p>
          </li>
          <li>
            <h3>AI 判讀</h3>
            <p>Gemini 辨識垃圾種類和髒亂程度，看不清楚的會提醒你補拍。</p>
          </li>
          <li>
            <h3>地圖更新</h3>
            <p>判讀結果可信的回報，會立刻出現在世界海灘地圖上。</p>
          </li>
        </ol>
        {latest.length > 0 && (
          <>
            <h3>最新回報</h3>
            <div className="latest">
              {latest.map((r) => (
                <LatestCard key={r.id} report={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CleanupPreview() {
  return (
    <section className="band band-dark">
      <div className="band-inner">
        <div className="band-split">
          <div className="band-head">
            <h2>我要參加淨灘</h2>
            <p>
              同一片海灘累積足夠的回報後，AI 會估算淨灘需要多少人、多少時間、帶哪些工具。主辦單位不用先去場勘，小社團也能和企業志工隊一起湊成一團。
            </p>
          </div>
          <div className="plan-example">
            <span className="plan-tag">示意畫面，功能開發中</span>
            <dl>
              <dt>建議人數</dt>
              <dd>20 至 25 人</dd>
              <dt>預估工時</dt>
              <dd>1.5 小時</dd>
              <dt>必備裝備</dt>
              <dd>割網刀、推車、防刺手套</dd>
              <dt>大型器械</dt>
              <dd>不需要</dd>
            </dl>
          </div>
        </div>
        <ul className="features">
          <li>
            <Sparkles aria-hidden="true" />
            <h3>AI 淨灘規劃</h3>
            <p>依據回報的垃圾種類和範圍，估算人力、工時和需要準備的物品。</p>
          </li>
          <li>
            <Users aria-hidden="true" />
            <h3>揪團報名</h3>
            <p>企業 CSR、NGO、學校社團都能開團，民眾直接線上報名。</p>
          </li>
          <li>
            <Package aria-hidden="true" />
            <h3>淨灘成效</h3>
            <p>淨灘後再拍一張，自動比對前後差異，成為可以放進 ESG 報告的數據。</p>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { reports } = usePublishedReports();
  return (
    <>
      <Hero />
      <LiveOcean />
      <WorldMap reports={reports} />
      <DebrisStats reports={reports} />
      <HowItWorks reports={reports} />
      <CleanupPreview />
    </>
  );
}
