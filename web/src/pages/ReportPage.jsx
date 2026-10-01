import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { MAX_PHOTOS, getPosition, resizePhoto, submitReport } from "../lib/reports";
import { TYPES } from "../lib/labels";
import ReportDetail from "../components/ReportDetail";
import "./ReportPage.css";

function useGeoPosition() {
  const [state, setState] = useState({ status: "locating" });
  const request = useCallback(() => {
    getPosition()
      .then((value) => setState({ status: "ok", value }))
      .catch((error) => setState({ status: "error", message: error.message }));
  }, []);
  useEffect(request, [request]);
  const relocate = useCallback(() => {
    setState({ status: "locating" });
    request();
  }, [request]);
  return [state, relocate];
}

function PhotoPicker({ photos, onAdd, onRemove, busy, error }) {
  const inputRef = useRef(null);
  const remaining = MAX_PHOTOS - photos.length;

  const handleChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) onAdd(files);
  };

  return (
    <div className="section">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        onChange={handleChange}
        tabIndex={-1}
      />
      {photos.length === 0 ? (
        <button type="button" className="picker-empty" onClick={() => inputRef.current.click()} disabled={busy}>
          <strong>{busy ? "處理照片中…" : "拍照或選擇照片"}</strong>
          <span>最多 {MAX_PHOTOS} 張，可以一次選多張</span>
        </button>
      ) : (
        <div className="picker-grid">
          {photos.map((photo, i) => (
            <figure key={photo.id} className="picker-thumb">
              <img src={photo.url} alt={`第 ${i + 1} 張照片`} />
              <button type="button" onClick={() => onRemove(photo.id)} aria-label={`移除第 ${i + 1} 張照片`}>
                ×
              </button>
            </figure>
          ))}
          {remaining > 0 && (
            <button type="button" className="picker-add" onClick={() => inputRef.current.click()} disabled={busy}>
              {busy ? "處理中…" : "再加一張"}
            </button>
          )}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <ul className="tips">
        <li>退後一點，把整片沙灘拍進來，AI 比較能判斷髒亂範圍。</li>
        <li>看到垃圾可以再靠近 1-2 公尺多拍一張，辨識會更準。</li>
      </ul>
    </div>
  );
}

function LocationStatus({ state, onRetry }) {
  if (state.status === "locating") return <p className="location">正在取得你的位置…</p>;
  if (state.status === "error") {
    return (
      <div className="location">
        <p className="error-text">{state.message}</p>
        <button type="button" className="btn-text" onClick={onRetry}>
          重新定位
        </button>
      </div>
    );
  }
  return (
    <p className="location">
      已取得位置，誤差約 {Math.round(state.value.accuracy)} 公尺。{" "}
      <button type="button" className="btn-text" onClick={onRetry}>
        重新定位
      </button>
    </p>
  );
}

function Submitted({ reportId, onAgain }) {
  const [report, setReport] = useState(null);
  useEffect(
    () => onSnapshot(doc(db, "reports", reportId), (snap) => setReport(snap.data() ?? null)),
    [reportId],
  );

  const analyzing = !report || report.status === "processing";
  return (
    <div className="page">
      <h1>{analyzing ? "回報已送出" : "分析完成"}</h1>
      {analyzing ? (
        <div className="notice" role="status">
          <p>
            AI 正在看你的照片，通常 10 秒內完成，忙碌時可能要一分鐘。你可以先離開，結果會留在「我的回報」。
          </p>
          <span className="analyzing-bar" aria-hidden="true" />
        </div>
      ) : (
        <div className="notice" role="status">
          <ReportDetail report={report} showStatus />
        </div>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={onAgain}>
          再回報一筆
        </button>
        <Link to="/mine" className="btn">
          看我的回報
        </Link>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [type, setType] = useState("trash");
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [location, relocate] = useGeoPosition();
  const [submitting, setSubmitting] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [reportId, setReportId] = useState(null);

  // Free the thumbnail object URLs when leaving the page.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const addPhotos = async (files) => {
    setPhotoError("");
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setPhotoError(`最多 ${MAX_PHOTOS} 張，多選的 ${files.length - room} 張沒有加入。`);
    setPhotoBusy(true);
    const added = [];
    for (const file of files.slice(0, room)) {
      try {
        const blob = await resizePhoto(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch (err) {
        setPhotoError(err.message);
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setPhotoBusy(false);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const canSubmit = photos.length > 0 && location.status === "ok" && !photoBusy && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError("");
    setSubmitting({ done: 0, total: photos.length });
    try {
      const id = await submitReport({
        type,
        photos: photos.map((p) => p.blob),
        location: location.value,
        onProgress: (done, total) => setSubmitting({ done, total }),
      });
      setReportId(id);
    } catch (err) {
      console.error(err);
      setSubmitError("送出失敗，請確認網路連線後再試一次。照片都還在，不用重選。");
    } finally {
      setSubmitting(null);
    }
  };

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPhotoError("");
    setReportId(null);
    relocate();
  };

  if (reportId) return <Submitted reportId={reportId} onAgain={reset} />;

  return (
    <form className="page" onSubmit={handleSubmit}>
      <div className="section">
        <h1>回報海灘現況</h1>
        <p className="page-intro">拍下眼前的海灘，AI 會判讀垃圾狀況，更新到大家看得到的地圖上。</p>
      </div>

      <fieldset className="type-toggle">
        <legend className="visually-hidden">回報類型</legend>
        {Object.entries(TYPES).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="type"
              value={value}
              checked={type === value}
              onChange={() => setType(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <PhotoPicker
        photos={photos}
        onAdd={addPhotos}
        onRemove={removePhoto}
        busy={photoBusy}
        error={photoError}
      />

      <LocationStatus state={location} onRetry={relocate} />

      <div className="section">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? `上傳照片 ${submitting.done}/${submitting.total}` : "送出回報"}
        </button>
        {submitError && <p className="error-text">{submitError}</p>}
        {!submitting && photos.length === 0 && <p className="report-meta">先加一張照片就能送出。</p>}
      </div>
    </form>
  );
}
