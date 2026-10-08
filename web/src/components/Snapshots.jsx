import { Sparkles, Waves } from "lucide-react";
import usePhotoUrls from "../lib/usePhotoUrls";
import { topItems } from "../lib/cleanup";
import FadeImg from "./FadeImg";
import { Doodle } from "./Sketch";

// The photos people took at a beach, pinned on top of each other like
// snapshots: the newest on top, one photo per report.
export function Snapshots({ reports, max = 3, className = "" }) {
  const paths = reports
    .map((r) => r.photos?.[0])
    .filter(Boolean)
    .slice(0, max);
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
        <span key={p} className="snap" style={{ "--i": i }}>
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
  const path = reports.map((r) => r.photos?.[0]).find(Boolean);
  const [url] = usePhotoUrls(path ? [path] : []);
  return (
    <span className="thumb" aria-hidden="true">
      {url ? <FadeImg src={url} alt="" loading="lazy" /> : <Waves />}
    </span>
  );
}
