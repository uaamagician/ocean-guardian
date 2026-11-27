import { useEffect, useState } from "react";
import { BEACH_KINDS, addBeach, checkBeachSpot, findNearby } from "../lib/beaches";
import { ENGLISH_ONLY, hasCjk } from "../lib/english";

const NAME_MAX = 80;
const NOTES_MAX = 280;

export default function AddBeachForm({ point, beaches, onAdded, onOpenBeach, onCancel }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("sand");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Beaches on the map are by the sea; a spot inland is turned away here
  // (the server hides one that gets through). If the check can't run, saving
  // isn't held up over it.
  const [inland, setInland] = useState(null);
  useEffect(() => {
    if (!point) return undefined;
    let cancelled = false;
    checkBeachSpot(point).then(
      (spot) => !cancelled && setInland(spot.ok ? null : { point, coastKm: spot.coastKm }),
      () => !cancelled && setInland(null),
    );
    return () => {
      cancelled = true;
    };
  }, [point]);
  const inlandHere = inland && inland.point === point ? inland : null;

  const nearby = point ? findNearby(beaches, point) : null;
  const notEnglish = hasCjk(name) || hasCjk(notes);
  const canSave = point && !inlandHere && name.trim().length >= 2 && !notEnglish && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const id = await addBeach({ name, kind, notes, location: point });
      onAdded(id);
    } catch (err) {
      console.error(err);
      setError("Couldn't add the beach. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <form className="bp add-beach" onSubmit={submit}>
      <header className="bp-header">
        <div className="bp-tags">
          <span className="bp-tag bp-tag-community">New beach</span>
        </div>
        <h2 className="beach-name">Add a missing beach</h2>
        <p className="report-meta">
          Fishing harbors, river mouths and rocky coves collect debris too. Add any shore where a cleanup could help.
        </p>
      </header>

      <div className="bp-body">
        <div className="add-beach-point">
          <span className="report-label">Location</span>
          {point ? (
            <p>
              {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
              <span className="report-meta"> Click the map again to move it.</span>
            </p>
          ) : (
            <p className="report-meta">Click the shoreline on the map where the beach is.</p>
          )}
        </div>

        {inlandHere && (
          <p className="add-beach-warning" role="alert">
            {inlandHere.coastKm == null
              ? "This spot is far from the sea."
              : `This spot is ${inlandHere.coastKm} km from the sea.`}{" "}
            Beaches on the map are on the coast, so click the shoreline where the beach is.
          </p>
        )}

        {nearby && (
          <p className="add-beach-warning">
            {nearby.beach.name} is already listed {Math.round(nearby.km * 1000)} m away.{" "}
            <button type="button" className="btn-text" onClick={() => onOpenBeach(nearby.beach.id)}>
              Open it instead
            </button>
          </p>
        )}

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            maxLength={NAME_MAX}
            placeholder="For example: Badouzi fishing harbor north shore"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <fieldset className="field">
          <legend>Shore type</legend>
          <div className="kind-options">
            {Object.entries(BEACH_KINDS).map(([value, label]) => (
              <label key={value} className="kind-option">
                <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>
            Notes <span className="report-meta">(optional)</span>
          </span>
          <textarea
            value={notes}
            maxLength={NOTES_MAX}
            rows={3}
            placeholder="How to get there, hazards, what tends to wash up"
            onChange={(e) => setNotes(e.target.value)}
          />
          <span className="field-count">
            {notes.length}/{NOTES_MAX}
          </span>
        </label>

        {notEnglish && <p className="error-text">{ENGLISH_ONLY}</p>}
        {error && <p className="error-text">{error}</p>}
        <p className="bp-note">Beaches you add are public and can't be edited afterward.</p>
      </div>

      <div className="bp-footer bp-footer-split">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canSave}>
          {saving ? "Adding…" : "Add beach"}
        </button>
      </div>
    </form>
  );
}
