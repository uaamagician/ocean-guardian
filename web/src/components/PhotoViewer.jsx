import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import usePhotoUrls from "../lib/usePhotoUrls";
import { reportTime } from "../lib/reports";
import { CATEGORIES } from "../lib/labels";
import { commonsCredit, creditLine } from "../lib/commonsReports";

// A photo of a beach shown large over the page, with the ones before and after
// it a swipe, an arrow key or a button away. Leaving for the report itself is
// a separate, deliberate step.
export default function PhotoViewer({ reports, index, onIndex, onClose, onOpenReport }) {
  const report = reports[index];
  const [url] = usePhotoUrls(report ? [report.photos[0]] : []);
  // Fetch the neighbours too, so stepping through doesn't wait on each one.
  usePhotoUrls([reports[index - 1], reports[index + 1]].filter(Boolean).map((r) => r.photos[0]));
  const drag = useRef(null);
  const [dx, setDx] = useState(0);
  const closeRef = useRef(null);

  const go = (step) => {
    const next = index + step;
    if (next >= 0 && next < reports.length) onIndex(next);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  if (!report) return null;
  const level = CATEGORIES[report.aiAnalysis?.category];
  const items = report.aiAnalysis?.items ?? [];
  const credit = commonsCredit(report);
  const date = reportTime(report)
    .toDate()
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const onPointerDown = (e) => {
    if (e.target.closest("button")) return; // the arrows take their own clicks
    drag.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
  };
  const onPointerUp = (e) => {
    if (drag.current?.id !== e.pointerId) return;
    const moved = e.clientX - drag.current.x;
    drag.current = null;
    setDx(0);
    if (moved > 60) go(-1);
    else if (moved < -60) go(1);
  };

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Beach photos" onClick={onClose}>
      <div className="viewer-inner" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="viewer-close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div
          className="viewer-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {url && (
            <img
              key={url}
              src={url}
              alt={`The beach on ${date}`}
              draggable={false}
              style={{ translate: `${dx}px 0`, transition: dx ? "none" : undefined }}
            />
          )}
          <button type="button" className="viewer-arrow is-prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Newer photo">
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="viewer-arrow is-next"
            onClick={() => go(1)}
            disabled={index === reports.length - 1}
            aria-label="Older photo"
          >
            <ChevronRight />
          </button>
        </div>
        <div className="viewer-caption">
          <div>
            <p className="viewer-title">
              {level && <span className="level-dot" data-tone={level.tone} />}
              {level?.label ?? "Not analyzed"}, {date}
            </p>
            {items.length > 0 && <p className="report-meta">AI spotted {items.slice(0, 5).join(", ")}</p>}
            {credit && <p className="report-meta">{creditLine(credit)}</p>}
          </div>
          <div className="viewer-side">
            <span className="report-meta">
              {index + 1} of {reports.length}
            </span>
            <button type="button" className="btn btn-small" onClick={() => onOpenReport(report)}>
              <MapPin aria-hidden="true" /> See it on the map
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
