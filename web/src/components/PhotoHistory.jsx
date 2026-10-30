import { useMemo, useRef, useState } from "react";
import usePhotoUrls from "../lib/usePhotoUrls";
import { reportTime } from "../lib/reports";
import { CATEGORIES } from "../lib/labels";
import { commonsCredit, creditLine } from "../lib/commonsReports";
import FadeImg from "./FadeImg";

const PER_YEAR = 8;
const longDate = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const shortDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const withPhoto = (reports) => reports.filter((r) => r.photos?.[0]);

// The latest photo of a beach, large, with when it was taken and what the AI made of it.
export function NowPhoto({ reports, onOpen }) {
  const latest = withPhoto(reports)[0];
  const [url] = usePhotoUrls(latest ? [latest.photos[0]] : []);
  if (!latest) return null;
  const level = CATEGORIES[latest.aiAnalysis?.category];
  const credit = commonsCredit(latest);
  return (
    <figure className="now-photo">
      <button type="button" onClick={() => onOpen(latest)} aria-label="Open the latest report">
        {url ? <FadeImg src={url} alt="The beach in the latest report" /> : <span className="now-photo-blank" />}
        <span className="now-photo-tag">Latest</span>
      </button>
      <figcaption>
        {level && <span className="level-dot" data-tone={level.tone} />}
        <span>
          {level?.label ?? "Not analyzed"}, {longDate(reportTime(latest).toDate())}
          {credit && <small>{creditLine(credit)}</small>}
        </span>
      </figcaption>
    </figure>
  );
}

// A mouse can drag a row sideways as a finger would; a drag that moved more
// than a few pixels doesn't count as a click on the photo it ended on.
function useDragScroll() {
  const drag = useRef(null);
  const moved = useRef(false);
  return {
    onPointerDown: (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
      moved.current = false;
    },
    onPointerMove: (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 4) moved.current = true;
      e.currentTarget.scrollLeft = drag.current.left - dx;
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onPointerLeave: () => {
      drag.current = null;
    },
    onClickCapture: (e) => {
      if (moved.current) {
        e.stopPropagation();
        e.preventDefault();
        moved.current = false;
      }
    },
  };
}

function YearRow({ year, reports, onOpen }) {
  const [all, setAll] = useState(false);
  const shown = all ? reports : reports.slice(0, PER_YEAR);
  const urls = usePhotoUrls(shown.map((r) => r.photos[0]));
  const dragScroll = useDragScroll();
  return (
    <section className="photo-year">
      <h4>
        {year} <span>{reports.length}</span>
      </h4>
      <ul className="photo-strip" {...dragScroll}>
        {shown.map((r, i) => {
          const level = CATEGORIES[r.aiAnalysis?.category];
          const credit = commonsCredit(r);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r)}
                title={credit ? creditLine(credit) : undefined}
                aria-label={`${level?.label ?? "Report"}, ${longDate(reportTime(r).toDate())}`}
              >
                {urls[i] ? <FadeImg src={urls[i]} alt="" loading="lazy" draggable={false} /> : <span className="photo-blank" />}
                <span className="photo-strip-meta">
                  {level && <span className="level-dot" data-tone={level.tone} />}
                  {shortDate(reportTime(r).toDate())}
                </span>
              </button>
            </li>
          );
        })}
        {!all && reports.length > PER_YEAR && (
          <li>
            <button type="button" className="photo-strip-more" onClick={() => setAll(true)}>
              +{reports.length - PER_YEAR}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

// Every photo people sent of a beach, a row per year with the newest first,
// so its condition can be compared across the years at a glance.
export default function PhotoHistory({ reports, onOpen }) {
  const years = useMemo(() => {
    const byYear = new Map();
    for (const r of withPhoto(reports)) {
      const y = reportTime(r).toDate().getFullYear();
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(r);
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  }, [reports]);
  if (years.length === 0) return <p className="report-meta">No photos of this beach yet.</p>;
  return (
    <div className="photo-history">
      {years.map(([year, list]) => (
        <YearRow key={year} year={year} reports={list} onOpen={onOpen} />
      ))}
    </div>
  );
}
