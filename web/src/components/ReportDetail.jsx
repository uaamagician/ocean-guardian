import { useEffect, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebase";
import { CATEGORIES, STATUS, TYPES, formatTime } from "../lib/labels";

function usePhotoUrls(paths) {
  const [urls, setUrls] = useState([]);
  // Join to a string so a new-but-equal array from Firestore doesn't refetch.
  const key = paths.join("|");
  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split("|") : [];
    const load = (p) =>
      getDownloadURL(ref(storage, p)).catch((err) => {
        console.warn("Photo URL failed", p, err.code);
        return null;
      });
    Promise.all(list.map(load)).then(
      (result) => !cancelled && setUrls(result.filter(Boolean)),
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  return urls;
}

export function Level({ category }) {
  const level = CATEGORIES[category] ?? { label: "未判讀", tone: "none" };
  return (
    <span className="level">
      <span className="level-dot" data-tone={level.tone} />
      {level.label}
    </span>
  );
}

export default function ReportDetail({ report, showStatus = false }) {
  const photoUrls = usePhotoUrls(report.photos ?? []);
  const analysis = report.aiAnalysis;

  return (
    <article className="report">
      <div className="report-head">
        {analysis ? <Level category={analysis.category} /> : <strong>{STATUS[report.status]}</strong>}
        <span className="report-meta">
          {TYPES[report.type]}，{formatTime(report.createdAt)}
          {showStatus && analysis && `，${STATUS[report.status]}`}
        </span>
      </div>

      {photoUrls.length > 0 && (
        <div className="report-photos">
          {photoUrls.map((url, i) => (
            <img key={url} src={url} alt={`回報照片 ${i + 1}`} loading="lazy" />
          ))}
        </div>
      )}

      {analysis?.items?.length > 0 && (
        <div className="section">
          <span className="report-label">AI 辨識到</span>
          <ul className="report-items">
            {analysis.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.uncertainItems?.length > 0 && (
        <div className="section">
          <span className="report-label">看不太清楚的東西</span>
          <ul className="report-uncertain">
            {analysis.uncertainItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {showStatus && analysis?.retakeSuggestion && (
        <p className="retake">
          <span className="report-label">AI 建議補拍</span>
          <br />
          {analysis.retakeSuggestion}
        </p>
      )}

      {showStatus && report.aiError && (
        <p className="report-meta">這筆回報 AI 沒有分析成功，會由人工確認。</p>
      )}
    </article>
  );
}
