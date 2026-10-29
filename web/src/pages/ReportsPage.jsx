import { useMemo, useState } from "react";
import { Link } from "react-router";
import ReportCard from "../components/ReportCard";
import usePublishedReports from "../lib/usePublishedReports";
import { CATEGORIES } from "../lib/labels";
import "./Home.css";
import "./ReportsPage.css";

const PAGE = 12;
const LEVELS = ["clean", "light", "moderate", "heavy"];

// Every published beach report, newest first, a page at a time.
export default function ReportsPage() {
  const { reports, error } = usePublishedReports();
  const [level, setLevel] = useState("");
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEVELS.map((k) => [k, 0]));
    for (const r of reports ?? []) if (r.aiAnalysis?.category in c) c[r.aiAnalysis.category] += 1;
    return c;
  }, [reports]);

  const list = useMemo(
    () => (reports ?? []).filter((r) => !level || r.aiAnalysis?.category === level),
    [reports, level],
  );

  const pick = (next) => {
    setLevel(next);
    setShown(PAGE);
  };

  return (
    <div className="reports-page">
      <header className="reports-head">
        <h1>Beach reports</h1>
        <p>
          Every published report, newest first. Open one to see it on the beach map, or{" "}
          <Link to="/report" viewTransition>
            report a beach
          </Link>{" "}
          yourself.
        </p>
      </header>

      <div className="toolbar-chips" role="group" aria-label="Debris level">
        <button type="button" className="toolbar-chip" aria-pressed={!level} onClick={() => pick("")}>
          All {reports ? `(${reports.length})` : ""}
        </button>
        {LEVELS.map((k) => (
          <button key={k} type="button" className="toolbar-chip" aria-pressed={level === k} onClick={() => pick(k)}>
            <span className="level-dot" data-tone={CATEGORIES[k].tone} />
            {CATEGORIES[k].label} ({counts[k]})
          </button>
        ))}
      </div>

      {error && <p className="report-meta">Couldn't load the reports. Refresh the page to try again.</p>}
      {!reports && !error && <p className="report-meta">Loading reports…</p>}
      {reports && list.length === 0 && <p className="report-meta">No reports at this level yet.</p>}

      <div className="latest reports-grid">
        {list.slice(0, shown).map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>

      {list.length > shown && (
        <div className="reports-more">
          <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
            Show more
          </button>
          <span className="report-meta">
            {shown} of {list.length}
          </span>
        </div>
      )}
    </div>
  );
}
