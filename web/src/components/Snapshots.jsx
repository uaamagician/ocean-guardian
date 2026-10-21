import { Sparkles, Waves } from "lucide-react";
import usePhotoUrls from "../lib/usePhotoUrls";
import { topItems } from "../lib/cleanup";
import FadeImg from "./FadeImg";
import { commonsCredit, creditLine } from "../lib/commonsReports";
import { Doodle } from "./Sketch";

// The photos people took at a beach, pinned on top of each other like
// snapshots: the newest on top, one photo per report.
export function Snapshots({ reports, max = 3, className = "" }) {
  const shown = reports.filter((r) => r.photos?.[0]).slice(0, max);
  const paths = shown.map((r) => r.photos[0]);
  const urls = usePhotoUrls(paths);
  if (paths.length === 0) {
    return (
      <div className={`snaps snaps-empty ${className}`}>
        <Doodle name="wave" boil={false} />
        <span>No photos yet</span>
      </div>
    );
  }
  return (
    <div className={`snaps ${className}`} data-count={paths.length}>
      {paths.map((p, i) => (
        <span key={p} className="snap" style={{ "--i": i }} title={commonsCredit(shown[i]) ? creditLine(commonsCredit(shown[i])) : undefined}>
          {urls[i] && <FadeImg src={urls[i]} alt="" loading="lazy" />}
        </span>
      ))}
    </div>
  );
}

// What the AI spotted in those photos, written in the margin.
export function AiSaw({ reports, max = 4 }) {
  const items = topItems(reports, max);
  if (items.length === 0) return null;
  return (
    <p className="ai-saw">
      <Sparkles aria-hidden="true" />
      <span>
        <span className="ai-saw-label">AI spotted </span>
        {items.join(", ")}
      </span>
    </p>
  );
}

// A single square photo of a beach, for list rows.
export function Thumb({ reports }) {
  const first = reports.find((r) => r.photos?.[0]);
  const path = first?.photos[0];
  const [url] = usePhotoUrls(path ? [path] : []);
  const credit = commonsCredit(first);
  return (
    <span className="thumb" aria-hidden="true" title={credit ? creditLine(credit) : undefined}>
      {url ? <FadeImg src={url} alt="" loading="lazy" /> : <Waves />}
    </span>
  );
}
