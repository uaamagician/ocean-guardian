import { Link } from "react-router";
import { Level } from "./ReportDetail";
import FadeImg from "./FadeImg";
import usePhotoUrls from "../lib/usePhotoUrls";
import { formatTime } from "../lib/labels";
import { commonsCredit } from "../lib/commonsReports";

// One beach report as an instant photo: the picture, the AI's rating and what
// it found. Opens the report on the beach map.
export default function ReportCard({ report }) {
  const [cover] = usePhotoUrls(report.photos?.slice(0, 1) ?? []);
  const credit = commonsCredit(report);
  return (
    <Link to={`/map?r=${report.id}`} className="latest-card" viewTransition>
      <span className="latest-photo">{cover && <FadeImg src={cover} alt="" loading="lazy" decoding="async" />}</span>
      <Level category={report.aiAnalysis?.category} />
      <span className="report-meta">{formatTime(report.createdAt)}</span>
      {credit && <span className="latest-credit">Photo: {credit.artist}, via Wikimedia Commons</span>}
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
