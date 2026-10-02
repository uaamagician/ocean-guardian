import { useState } from "react";
import { Minus, Plus, UserCheck } from "lucide-react";
import { TOOL_BY_ID } from "../lib/guide";
import { saveSignup, withdraw } from "../lib/events";

export default function SignupForm({ event, mySignup, myContact, full }) {
  const [editing, setEditing] = useState(!mySignup);
  const [name, setName] = useState(mySignup?.name ?? "");
  const [groupSize, setGroupSize] = useState(mySignup?.groupSize ?? 1);
  const [bringing, setBringing] = useState(mySignup?.bringing ?? []);
  const [contact, setContact] = useState(myContact ?? "");
  const [note, setNote] = useState(mySignup?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tools = event.workOrder.gear.map((g) => TOOL_BY_ID[g.tool]).filter(Boolean);
  const toggle = (id) => setBringing((list) => (list.includes(id) ? list.filter((t) => t !== id) : [...list, id]));

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await saveSignup(event.id, { name, groupSize, bringing, note, contact });
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
            {mySignup.groupSize === 1 ? "Just you" : `You and ${mySignup.groupSize - 1} more`}
            {mySignup.bringing.length > 0 &&
              `, bringing ${mySignup.bringing.map((t) => TOOL_BY_ID[t]?.name.toLowerCase()).filter(Boolean).join(", ")}`}
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

      <div className="field">
        <span id="group-label">How many people, including you?</span>
        <div className="stepper" role="group" aria-labelledby="group-label">
          <button type="button" aria-label="Fewer" onClick={() => setGroupSize((n) => Math.max(1, n - 1))} disabled={groupSize <= 1}>
            <Minus />
          </button>
          <output aria-live="polite">{groupSize}</output>
          <button type="button" aria-label="More" onClick={() => setGroupSize((n) => Math.min(10, n + 1))} disabled={groupSize >= 10}>
            <Plus />
          </button>
        </div>
      </div>

      {tools.length > 0 && (
        <fieldset className="field">
          <legend>I can bring</legend>
          <div className="kind-options">
            {tools.map((t) => (
              <label key={t.id} className="kind-option">
                <input type="checkbox" checked={bringing.includes(t.id)} onChange={() => toggle(t.id)} />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="field">
        <span>
          Phone or email <span className="report-meta">(optional, only the organizer sees it)</span>
        </span>
        <input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} autoComplete="email" />
      </label>

      <label className="field">
        <span>
          Note to the organizer <span className="report-meta">(optional)</span>
        </span>
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
        {busy ? "Saving…" : mySignup ? "Save changes" : "Join this cleanup"}
      </button>
      {mySignup && (
        <button type="button" className="btn-text" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </form>
  );
}
