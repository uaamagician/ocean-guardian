import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Camera, Images } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { MAX_PHOTOS, fromReportDoc, getPosition, resizePhoto, submitReport } from "../lib/reports";
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

// Two ways in: the camera straight away (phones open it directly), or
// photos already on the device.
function PhotoPicker({ photos, onAdd, onRemove, busy, error }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const remaining = MAX_PHOTOS - photos.length;

  const handleChange = (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) onAdd(files);
  };

  return (
    <div className="section">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={handleChange}
        tabIndex={-1}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        onChange={handleChange}
        tabIndex={-1}
      />
      {photos.length === 0 ? (
        <div className="picker-choices">
          <button type="button" className="picker-choice is-camera" onClick={() => cameraRef.current.click()} disabled={busy}>
            <Camera aria-hidden="true" />
            <strong>{busy ? "Preparing photo…" : "Take a photo"}</strong>
            <span>Opens your camera</span>
          </button>
          <button type="button" className="picker-choice" onClick={() => libraryRef.current.click()} disabled={busy}>
            <Images aria-hidden="true" />
            <strong>Choose photos</strong>
            <span>Up to {MAX_PHOTOS} from your library</span>
          </button>
        </div>
      ) : (
        <div className="picker-grid">
          {photos.map((photo, i) => (
            <figure key={photo.id} className="picker-thumb">
              <img src={photo.url} alt={`Photo ${i + 1}`} />
              <button type="button" onClick={() => onRemove(photo.id)} aria-label={`Remove photo ${i + 1}`}>
                ×
              </button>
            </figure>
          ))}
          {remaining > 0 && (
            <div className="picker-add">
              <button type="button" onClick={() => cameraRef.current.click()} disabled={busy}>
                <Camera aria-hidden="true" /> {busy ? "Preparing…" : "Take another"}
              </button>
              <button type="button" onClick={() => libraryRef.current.click()} disabled={busy}>
                <Images aria-hidden="true" /> Add from library
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <ul className="tips">
        <li>Step back and fit the whole beach in, so the AI can judge how far the debris spreads.</li>
        <li>See something? Take another photo from 1–2 m away for a more accurate result.</li>
      </ul>
    </div>
  );
}

function LocationStatus({ state, onRetry }) {
  if (state.status === "locating") return <p className="location">Finding your location…</p>;
  if (state.status === "error") {
    return (
      <div className="location">
        <p className="error-text">{state.message}</p>
        <button type="button" className="btn-text" onClick={onRetry}>
          Locate again
        </button>
      </div>
    );
  }
  return (
    <p className="location">
      Location found, accurate to about {Math.round(state.value.accuracy)} m.{" "}
      <button type="button" className="btn-text" onClick={onRetry}>
        Locate again
      </button>
    </p>
  );
}

function Submitted({ reportId, onAgain }) {
  const [report, setReport] = useState(null);
  useEffect(
    () => onSnapshot(doc(db, "reports", reportId), (snap) => setReport(snap.exists() ? fromReportDoc(snap) : null)),
    [reportId],
  );

  const analyzing = !report || report.status === "processing";
  return (
    <div className="page">
      <h1>{analyzing ? "Report sent" : "Analysis complete"}</h1>
      {analyzing ? (
        <div className="notice" role="status">
          <p>
            The AI is looking at your photos. This usually takes under 10 seconds, or up to a minute when it's busy. You can leave this page; the result will be waiting in My Reports.
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
          Report another
        </button>
        <Link to="/mine" className="btn">
          Go to My Reports
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
    if (files.length > room) setPhotoError(`Up to ${MAX_PHOTOS} photos. ${files.length - room} of the ones you picked weren't added.`);
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
      setSubmitError("Couldn't send your report. Check your connection and try again. Your photos are still here.");
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
        <h1>Report a beach</h1>
        <p className="page-intro">Photograph the beach in front of you. AI checks it for debris and adds it to the map everyone can see.</p>
      </div>

      <fieldset className="type-toggle">
        <legend className="visually-hidden">What are you reporting?</legend>
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
          {submitting ? `Uploading photos ${submitting.done}/${submitting.total}` : "Send report"}
        </button>
        {submitError && <p className="error-text">{submitError}</p>}
        {!submitting && photos.length === 0 && <p className="report-meta">Add a photo to send your report.</p>}
      </div>
    </form>
  );
}
