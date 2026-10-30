import { useState } from "react";
import { Minus, Plus, UserCheck } from "lucide-react";
import { TOOL_BY_ID } from "../lib/guide";
import { describeParty, saveSignup, withdraw } from "../lib/events";
import { ENGLISH_ONLY, englishName, hasCjk } from "../lib/english";

const MAX_GROUP = 10;

function Stepper({ label, hint, value, min, max, onChange }) {
  return (
    <div className="party-row">
      <span className="party-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
        >
          <Minus />
        </button>
        <output aria-live="polite">{value}</output>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}

// Joining should take a name and a tap. Who comes along is a quick count, and
// gear, contact details and notes are all optional extras folded away.
export default function SignupForm({ event, user, mySignup, myContact, full }) {
  const [editing, setEditing] = useState(!mySignup);
  // New sign-ups start from the Google profile; people can change both.
  const [name, setName] = useState(mySignup?.name ?? englishName(user).slice(0, 40));
  const [kids, setKids] = useState(mySignup?.kids ?? 0);
  const [adults, setAdults] = useState(mySignup ? mySignup.groupSize - (mySignup.kids ?? 0) : 1);
  const [bringing, setBringing] = useState(mySignup?.bringing ?? []);
  const [contact, setContact] = useState(mySignup ? (myContact ?? "") : myContact || user.email || "");
  const [note, setNote] = useState(mySignup?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Open the optional parts only if they already hold something of the person's.
  const [startOpen] = useState(() => ({
    gear: bringing.length > 0,
    note: Boolean(note),
  }));

  const notEnglish = hasCjk(name) || hasCjk(note);
  const tools = event.workOrder.gear.map((g) => TOOL_BY_ID[g.tool]).filter(Boolean);
  const toggle = (id) => setBringing((list) => (list.includes(id) ? list.filter((t) => t !== id) : [...list, id]));
  const groupSize = adults + kids;

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || notEnglish) return;
    setBusy(true);
    setError("");
    try {
      await saveSignup(event.id, {
        name,
        groupSize,
        kids,
        bringing,
        note,
        contact,
      });
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your sign-up. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await withdraw(event.id);
      setEditing(true);
    } catch (err) {
      console.error(err);
      setError("Couldn't withdraw. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  if (mySignup && !editing) {
    return (
      <div className="signup-done">
        <UserCheck aria-hidden="true" />
        <div>
          <strong>You're in</strong>
          <p className="report-meta">
            {describeParty(mySignup)}
            {mySignup.bringing.length > 0 &&
              `, bringing ${mySignup.bringing
                .map((t) => TOOL_BY_ID[t]?.name.toLowerCase())
                .filter(Boolean)
                .join(", ")}`}
            .
          </p>
        </div>
        <div className="signup-done-actions">
          <button type="button" className="btn-text" onClick={() => setEditing(true)}>
            Change
          </button>
          <button type="button" className="btn-text signup-withdraw" onClick={leave} disabled={busy}>
            Withdraw
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  if (full && !mySignup) {
    return <p className="report-meta">This cleanup is full. Check the other upcoming cleanups.</p>;
  }

  return (
    <form className="signup" onSubmit={submit}>
      <label className="field">
        <span>Your name or nickname</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required />
      </label>

      <fieldset className="field party">
        <legend>Who's coming?</legend>
        <Stepper
          label="Adults"
          hint="including you"
          value={adults}
          min={1}
          max={MAX_GROUP - kids}
          onChange={setAdults}
        />
        <Stepper label="Kids" hint="under 12" value={kids} min={0} max={MAX_GROUP - adults} onChange={setKids} />
        {kids > 0 && (
          <p className="party-note">
            Kids are welcome with an adult. Keep them to sorting and light litter, away from glass, hooks and heavy
            nets.
          </p>
        )}
      </fieldset>

      {tools.length > 0 && (
        <details className="signup-more" open={startOpen.gear}>
          <summary>
            Have gear to share? <span>Optional</span>
          </summary>
          <p className="report-meta">You can come empty-handed. Tick anything you can bring, so the organizer knows.</p>
          <div className="kind-options">
            {tools.map((t) => (
              <label key={t.id} className="kind-option">
                <input type="checkbox" checked={bringing.includes(t.id)} onChange={() => toggle(t.id)} />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </details>
      )}

      <details className="signup-more" open={startOpen.note}>
        {/* The contact is filled in from the Google account, so say so even folded. */}
        <summary>
          {contact.trim() ? (
            <>
              Organizer can reach you at <strong>{contact.trim()}</strong>
            </>
          ) : (
            "Contact and a note"
          )}{" "}
          <span>Change</span>
        </summary>
        <label className="field">
          <span>Phone or email, only the organizer sees it. Leave empty to share none.</span>
          <input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>Note to the organizer</span>
          <input
            value={note}
            maxLength={200}
            placeholder="Coming with my class, arriving a bit late…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </details>

      {notEnglish && <p className="error-text">{ENGLISH_ONLY}</p>}
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || !name.trim() || notEnglish}>
        {busy
          ? "Saving…"
          : mySignup
            ? "Save changes"
            : groupSize === 1
              ? "Join this cleanup"
              : `Join with ${groupSize} people`}
      </button>
      {mySignup && (
        <button type="button" className="btn-text" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </form>
  );
}
