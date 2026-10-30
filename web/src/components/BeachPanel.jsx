import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Check,
  Copy,
  Droplets,
  ExternalLink,
  Navigation,
  Sparkles,
  Sun,
  Sunset,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import { Level } from "./ReportDetail";
import BeachTimeline from "./BeachTimeline";
import FadeImg from "./FadeImg";
import CleanupPlan from "./CleanupPlan";
import useWikiSummary from "../lib/useWikiSummary";
import { BEACH_KINDS, BEACH_RADIUS_KM, googleMapsLinks, isCommunityBeach } from "../lib/beaches";
import {
  BLEACHING_LEVELS,
  compass,
  describeUv,
  describeWeather,
  fetchCoralStress,
  fetchSeaTemp,
  fetchTides,
  fetchWeather,
  localClock,
} from "../lib/ocean";
import { formatTime } from "../lib/labels";
import { reportTime } from "../lib/reports";

// Runs fetcher(lat, lng); results for a previous beach read as still loading.
function useAt(fetcher, lat, lng) {
  const key = `${lat},${lng}`;
  const [state, setState] = useState({ key: null, value: undefined });
  useEffect(() => {
    let cancelled = false;
    fetcher(lat, lng).then(
      (value) => !cancelled && setState({ key: `${lat},${lng}`, value }),
      () => !cancelled && setState({ key: `${lat},${lng}`, value: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, lat, lng]);
  return state.key === key ? state.value : undefined;
}

const PRIORITY = {
  clean: { label: "No cleanup needed", tone: "clean" },
  light: { label: "Low cleanup priority", tone: "light" },
  moderate: { label: "Medium cleanup priority", tone: "moderate" },
  heavy: { label: "High cleanup priority", tone: "heavy" },
};

function formatCoords({ lat, lng }) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="chip-button" onClick={copy}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

function Header({ beach }) {
  const links = googleMapsLinks(beach);
  const community = isCommunityBeach(beach.id);
  return (
    <header className="bp-header">
      <div className="bp-tags">
        <span className={community ? "bp-tag bp-tag-community" : "bp-tag"}>
          {community ? "Added by the community" : "Listed beach"}
        </span>
        {beach.country && <span className="bp-tag">{beach.country}</span>}
        {beach.kind && beach.kind !== "unknown" && <span className="bp-tag">{BEACH_KINDS[beach.kind]}</span>}
      </div>
      <h2 className="beach-name">{beach.name}</h2>
      <p className="bp-coords">{formatCoords(beach)}</p>
      <div className="bp-actions">
        <a className="chip-button" href={links.place} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Google Maps
        </a>
        <a className="chip-button" href={links.directions} target="_blank" rel="noreferrer">
          <Navigation aria-hidden="true" />
          Directions
        </a>
        <CopyLink />
      </div>
    </header>
  );
}

function Tile({ icon: Icon, label, value, detail }) {
  return (
    <div className="bp-tile">
      <span className="bp-tile-label">
        <Icon aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
      {detail && <span className="bp-tile-detail">{detail}</span>}
    </div>
  );
}

const pending = (v) => v === undefined;
const failed = (v) => v === "error" || v === null;

function Conditions({ beach }) {
  const sea = useAt(fetchSeaTemp, beach.lat, beach.lng);
  const wx = useAt(fetchWeather, beach.lat, beach.lng);
  const tides = useAt(fetchTides, beach.lat, beach.lng);
  const coral = useAt(fetchCoralStress, beach.lat, beach.lng);

  const show = (v, render) => (pending(v) ? "…" : failed(v) ? "No data" : render(v));
  const coralLevel = coral && !failed(coral) ? BLEACHING_LEVELS[coral.level] : null;

  return (
    <section className="bp-section">
      <h3>Conditions now</h3>
      <div className="bp-tiles">
        <Tile
          icon={Thermometer}
          label="Water"
          value={show(sea, (s) => `${s.now.toFixed(1)}°C`)}
          detail={
            sea?.weekChange != null
              ? `${sea.weekChange >= 0 ? "+" : "−"}${Math.abs(sea.weekChange).toFixed(1)}°C in 7 days`
              : null
          }
        />
        <Tile
          icon={Waves}
          label="Waves"
          value={show(sea, (s) => (s.waveHeight != null ? `${s.waveHeight.toFixed(1)} m` : "No data"))}
        />
        <Tile
          icon={Sun}
          label="Air"
          value={show(wx, (w) => `${Math.round(w.temp)}°C`)}
          detail={wx && !failed(wx) ? describeWeather(wx.code) : null}
        />
        <Tile
          icon={Wind}
          label="Wind"
          value={show(wx, (w) => `${Math.round(w.wind)} km/h`)}
          detail={wx && !failed(wx) ? `From the ${compass(wx.windDir)}` : null}
        />
        <Tile
          icon={Droplets}
          label="UV index"
          value={show(wx, (w) => w.uv.toFixed(1))}
          detail={wx && !failed(wx) ? describeUv(wx.uv) : null}
        />
        <Tile
          icon={Sunset}
          label="Sunset"
          value={show(wx, (w) => localClock(w.sunset) ?? "No data")}
          detail="Local time"
        />
      </div>

      <dl className="bp-rows">
        <div>
          <dt>Next high tide</dt>
          <dd>
            {show(tides, (t) => (t.high ? `${localClock(t.high.time)}, ${t.high.height.toFixed(1)} m` : "No data"))}
          </dd>
        </div>
        <div>
          <dt>Next low tide</dt>
          <dd>
            {show(tides, (t) => (t.low ? `${localClock(t.low.time)}, ${t.low.height.toFixed(1)} m` : "No data"))}
          </dd>
        </div>
        <div>
          <dt>Coral bleaching</dt>
          <dd>
            {coralLevel ? (
              <span className="level">
                <span className="level-dot" data-tone={coralLevel.tone} />
                {coralLevel.label}
              </span>
            ) : (
              show(coral, () => "No data")
            )}
          </dd>
        </div>
      </dl>
      <p className="bp-note">
        Tides are a model estimate for planning, not navigation. Bleaching shows the strongest alert within about
        5 km. Sources: Open-Meteo, NOAA Coral Reef Watch.
      </p>
    </section>
  );
}

function DebrisSummary({ reports, onOpenPlan }) {
  const items = useMemo(() => {
    const counts = new Map();
    for (const r of reports) for (const item of new Set(r.aiAnalysis?.items ?? [])) counts.set(item, (counts.get(item) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reports]);

  if (reports.length === 0) {
    return (
      <section className="bp-status">
        <span className="level">
          <span className="level-dot level-dot-beach" />
          No reports yet
        </span>
        <p>Nobody has reported this beach. If you're nearby, one photo puts it on the map.</p>
      </section>
    );
  }

  const latest = reports[0];
  const priority = PRIORITY[latest.aiAnalysis?.category];
  return (
    <section className="bp-status">
      <div className="bp-status-top">
        <Level category={latest.aiAnalysis?.category} />
        {priority && (
          <span className="bp-priority" data-tone={priority.tone}>
            {priority.label}
          </span>
        )}
      </div>
      <p>
        Based on the latest of {reports.length} report{reports.length > 1 ? "s" : ""} within {BEACH_RADIUS_KM} km,
        {latest.takenAt ? " photo taken" : " sent"} {formatTime(reportTime(latest))}.
      </p>
      {items.length > 0 && (
        <>
          <span className="report-label">Found here</span>
          <ul className="report-items">
            {items.map(([item, count]) => (
              <li key={item}>
                {item}
                {count > 1 && <span className="bp-count"> ×{count}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="chip-button bp-plan-link" onClick={onOpenPlan}>
        <Sparkles aria-hidden="true" />
        Crew, time and gear for a cleanup
      </button>
    </section>
  );
}

function About({ beach }) {
  const { loading, summary } = useWikiSummary(beach.wiki);
  const community = isCommunityBeach(beach.id);
  return (
    <div className="bp-about">
      {loading && <p className="report-meta">Loading description…</p>}
      {summary && (
        <>
          {summary.image && <FadeImg src={summary.image} alt="" loading="lazy" />}
          <p>{summary.extract}</p>
          {summary.url && (
            <a href={summary.url} target="_blank" rel="noreferrer">
              Read more on Wikipedia
            </a>
          )}
        </>
      )}
      {!loading && !summary && beach.desc && <p>{beach.desc.charAt(0).toUpperCase() + beach.desc.slice(1)}.</p>}
      {community && (
        <>
          <p>{beach.notes || "The person who added this beach didn't leave any notes."}</p>
          {beach.createdAt && <p className="report-meta">Added {formatTime(beach.createdAt)}.</p>}
        </>
      )}
      {!loading && !summary && !beach.desc && !community && (
        <p className="report-meta">No description yet. Google Maps usually has photos and reviews.</p>
      )}
      <p className="bp-note">
        {community
          ? "Added by an Ocean Guardian user."
          : "Beach listed from Wikidata and OpenStreetMap; description from Wikipedia where available."}
      </p>
    </div>
  );
}

const TAB_IDS = ["overview", "cleanup", "reports", "about"];

export default function BeachPanel({ beach, reports, allReports, focusReportId, onSelectReport, initialTab }) {
  const startTab = focusReportId ? "reports" : TAB_IDS.includes(initialTab) ? initialTab : "overview";
  const [tab, setTab] = useState(startTab);
  const [shownFor, setShownFor] = useState(beach.id);
  // A new beach starts on Overview, unless the link asked for a specific tab or report.
  if (shownFor !== beach.id) {
    setShownFor(beach.id);
    setTab(startTab);
  }

  const tabs = [
    ["overview", "Overview"],
    ["cleanup", "Cleanup plan"],
    ["reports", `Reports (${reports.length})`],
    ["about", "About"],
  ];

  return (
    <div className="bp">
      <Header beach={beach} />
      <div className="bp-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "bp-tab is-active" : "bp-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bp-body" role="tabpanel">
        {tab === "overview" && (
          <>
            <DebrisSummary reports={reports} onOpenPlan={() => setTab("cleanup")} />
            <Conditions beach={beach} />
          </>
        )}
        {tab === "cleanup" && <CleanupPlan beach={beach} allReports={allReports} />}
        {tab === "reports" && (
          <BeachTimeline reports={reports} focusReportId={focusReportId} onSelectReport={onSelectReport} />
        )}
        {tab === "about" && <About beach={beach} />}
      </div>
      <div className="bp-footer">
        <Link to="/report" className="btn btn-primary">
          Report this beach
        </Link>
      </div>
    </div>
  );
}

