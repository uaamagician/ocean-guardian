import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Award, Camera, Mail, Minus, Plus } from "lucide-react";
import usePhotoUrls from "../lib/usePhotoUrls";
import { resizePhoto } from "../lib/reports";
import { headcount, resultLine, saveResults } from "../lib/events";
import { ENGLISH_ONLY, hasCjk } from "../lib/english";
import { Snapshots } from "./Snapshots";
import FadeImg from "./FadeImg";

const MAX_PHOTOS = 4;
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// How the cleanup went, for everyone: the numbers, the organizer's note, and
// the beach before (from the reports the plan was made from) and after.
export function ResultsView({ event, evidence }) {
  const r = event.results;
  const after = usePhotoUrls(r.photos);
  return (
    <section className="results" aria-labelledby="results-title">
      <span className="report-label">After the cleanup</span>
      <h2 id="results-title">How it went</h2>
      <dl className="results-stats">
        <div>
          <dt>Bags collected</dt>
          <dd>{r.bags}</dd>
        </div>
        {r.weightKg ? (
          <div>
            <dt>Weight</dt>
            <dd>
              {r.weightKg}
              <small> kg</small>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>People came</dt>
          <dd>{r.attendees}</dd>
        </div>
      </dl>
      {r.note && <p className="results-note">“{r.note}”</p>}
      <div className="results-compare">
        {/* Only the sides that have photos; an empty frame would look like a missing picture. */}
        {evidence.some((rep) => rep.photos?.[0]) && (
          <figure>
            <Snapshots reports={evidence} max={2} />
            <figcaption>Before, from the reports</figcaption>
          </figure>
        )}
        {after.length > 0 && (
          <figure>
            <div className="results-after" data-count={after.length}>
              {after.map((url) => (
                <FadeImg key={url} src={url} alt="The beach after the cleanup" loading="lazy" />
              ))}
            </div>
            <figcaption>After, from the organizer</figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

function Count({ label, value, onChange, max }) {
  return (
    <div className="party-row">
      <span className="party-label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Math.min(max, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Plus />
        </button>
      </div>
    </div>
  );
}

// The organizer's form once the cleanup has started: a few numbers, a note
// and up to four photos of the beach afterward. It can be sent again to fix it.
export function ResultsForm({ event, signups, onDone }) {
  const saved = event.results;
  const [bags, setBags] = useState(saved?.bags ?? 0);
  const [weight, setWeight] = useState(saved?.weightKg ? String(saved.weightKg) : "");
  const [attendees, setAttendees] = useState(saved?.attendees ?? headcount(signups));
  const [note, setNote] = useState(saved?.note ?? "");
  const [keep, setKeep] = useState(saved?.photos ?? []);
  const [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const keptUrls = usePhotoUrls(keep);
  const fileRef = useRef(null);
  const addedRef = useRef(added);
  useEffect(() => {
    addedRef.current = added;
  }, [added]);
  useEffect(() => () => addedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const room = MAX_PHOTOS - keep.length - added.length;
  const notEnglish = hasCjk(note);

  const addFiles = async (files) => {
    setError("");
    const next = [];
    for (const file of files.slice(0, room)) {
      try {
        const blob = await resizePhoto(file);
        next.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch (err) {
        setError(err.message);
      }
    }
    setAdded((list) => [...list, ...next]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (notEnglish) return;
    setBusy(true);
    setError("");
    try {
      const kg = Number(weight);
      await saveResults(event.id, {
        bags,
        weightKg: weight.trim() && kg > 0 ? Math.round(kg * 10) / 10 : null,
        attendees,
        note,
        keep,
        photos: added.map((p) => p.blob),
      });
      onDone?.();
    } catch (err) {
      console.error(err);
      setError("Couldn't save the results. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="signup results-form" onSubmit={submit}>
      <Count label="Bags collected" value={bags} onChange={setBags} max={5000} />
      <Count label="People who came" value={attendees} onChange={setAttendees} max={2000} />
      <label className="field">
        <span>
          Weight in kg <span className="report-meta">(optional, if you weighed it)</span>
        </span>
        <input type="number" inputMode="decimal" min={0} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </label>
      <label className="field">
        <span>A note for the volunteers</span>
        <textarea
          rows={3}
          maxLength={600}
          value={note}
          placeholder="What you found, what surprised you, thanks to the crew…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="field">
        <span>Photos of the beach afterward</span>
        <div className="results-thumbs">
          {keep.map((path, i) => (
            <figure key={path} className="picker-thumb">
              {keptUrls[i] && <img src={keptUrls[i]} alt={`Saved photo ${i + 1}`} />}
              <button type="button" onClick={() => setKeep((list) => list.filter((p) => p !== path))} aria-label={`Remove saved photo ${i + 1}`}>
                ×
              </button>
            </figure>
          ))}
          {added.map((p, i) => (
            <figure key={p.id} className="picker-thumb">
              <img src={p.url} alt={`New photo ${i + 1}`} />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  setAdded((list) => list.filter((x) => x.id !== p.id));
                }}
                aria-label={`Remove new photo ${i + 1}`}
              >
                ×
              </button>
            </figure>
          ))}
          {room > 0 && (
            <button type="button" className="results-add-photo" onClick={() => fileRef.current.click()}>
              <Camera aria-hidden="true" />
              Add
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) addFiles(files);
          }}
        />
      </div>

      {notEnglish && <p className="error-text">{ENGLISH_ONLY}</p>}
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || notEnglish}>
        {busy ? "Saving…" : saved ? "Update the results" : "Share the results"}
      </button>
    </form>
  );
}

// A thank-you the organizer sends from their own Gmail, to everyone who left
// an email, blind-copied so volunteers don't see each other's addresses.
export function ThankVolunteers({ event, contacts }) {
  const emails = Object.values(contacts ?? {}).filter(looksLikeEmail);
  const link = `${window.location.origin}/events/${event.id}`;
  const date = event.startsAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const subject = `Thank you for cleaning ${event.beachName}`;
  const body = [
    "Hi everyone,",
    "",
    `Thank you for joining ${event.title} at ${event.beachName} on ${date}.` +
      (event.results ? ` Together we collected ${resultLine(event.results)} of debris.` : ""),
    "",
    "The before-and-after photos are on the cleanup page, and you can download your certificate there:",
    link,
    "",
    event.organizer.name,
  ].join("\n");
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(emails.join(","))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (emails.length === 0) {
    return <p className="report-meta">No volunteer left an email, so there's no one to send a thank-you to.</p>;
  }
  return (
    <div className="thank-you">
      <p className="report-meta">
        {emails.length} {emails.length === 1 ? "volunteer" : "volunteers"} left an email. This opens a ready-made
        thank-you in Gmail with them blind-copied; read it over, then send.
      </p>
      <div className="thank-you-actions">
        <a className="btn btn-primary" href={gmail} target="_blank" rel="noreferrer">
          <Mail aria-hidden="true" /> Write the thank-you in Gmail
        </a>
        <a className="btn-text" href={mailto}>
          Use another mail app
        </a>
      </div>
    </div>
  );
}

export function CertificateLink({ eventId, label = "Your certificate" }) {
  return (
    <Link to={`/events/${eventId}/certificate`} className="btn certificate-link" viewTransition>
      <Award aria-hidden="true" /> {label}
    </Link>
  );
}
