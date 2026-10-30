import { useState } from "react";
import { Link, useParams } from "react-router";
import { Ban, CalendarDays, MapPin } from "lucide-react";
import WorkOrder from "../components/WorkOrder";
import SignupForm from "../components/SignupForm";
import SignInGate from "../components/SignInGate";
import { AiSaw, Snapshots } from "../components/Snapshots";
import { planInputs } from "../lib/cleanup";
import usePublishedReports from "../lib/usePublishedReports";
import { isGoogleUser, useUser } from "../lib/auth";
import { TOOL_BY_ID } from "../lib/guide";
import { isEnglish } from "../lib/english";
import {
  ORGANIZER_TYPES,
  cancelEvent,
  headcount,
  kidCount,
  useContacts,
  useEvent,
  useMyContact,
  useSignups,
} from "../lib/events";
import "./Events.css";

function Roster({ signups, contacts }) {
  if (!signups?.length) return <p className="report-meta">Nobody has signed up yet.</p>;
  return (
    <ul className="roster">
      {signups.map((s) => (
        <li key={s.id}>
          <div>
            <strong>{s.name}</strong>
            {s.groupSize > 1 && (
              <span className="report-meta">
                {" "}
                +{s.groupSize - 1}
                {s.kids > 0 && `, ${kidCount(s.kids)}`}
              </span>
            )}
          </div>
          {s.bringing.length > 0 && (
            <span className="report-meta">Bringing {s.bringing.map((t) => TOOL_BY_ID[t]?.name.toLowerCase()).filter(Boolean).join(", ")}</span>
          )}
          {s.note && <span className="roster-note">“{s.note}”</span>}
          {contacts?.[s.id] && <span className="roster-contact">{contacts[s.id]}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function EventPage() {
  const { eventId } = useParams();
  const event = useEvent(eventId);
  const signups = useSignups(eventId);
  const { ready, user } = useUser();
  const { reports } = usePublishedReports();
  const uid = user?.uid ?? null;
  const signedIn = isGoogleUser(user);
  const isOrganizer = Boolean(event && uid && event.createdBy === uid);
  const contacts = useContacts(eventId, isOrganizer);
  const myContact = useMyContact(eventId, uid);
  const [cancelling, setCancelling] = useState(false);
  // Read once per visit; whether the cleanup has started doesn't need a live clock.
  const [now] = useState(() => Date.now());

  if (event === undefined) {
    return (
      <div className="page">
        <p className="report-meta">Loading cleanup…</p>
      </div>
    );
  }
  if (event === null) {
    return (
      <div className="page">
        <h1>Cleanup not found</h1>
        <p className="page-intro">The link may be wrong, or the cleanup was removed.</p>
        <Link to="/action" className="btn" viewTransition>
          See upcoming cleanups
        </Link>
      </div>
    );
  }

  const joined = headcount(signups);
  const started = event.startsAt.toMillis() <= now;
  const cancelled = event.status === "cancelled";
  const mySignup = signups?.find((s) => s.id === uid);
  const full = joined >= event.capacity;
  const start = event.startsAt.toDate();
  // The photos the AI plan was made from.
  const evidence = planInputs(reports, event.location);

  const cancel = async () => {
    if (!window.confirm("Cancel this cleanup? Volunteers will see it as cancelled and can't sign up anymore.")) return;
    setCancelling(true);
    try {
      await cancelEvent(event.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="event-page">
      <header className="event-hero">
        <div className="event-hero-inner">
          <div className="event-hero-text">
            <span className="bp-tag bp-tag-community">{ORGANIZER_TYPES[event.organizer.type]}</span>
            <h1>{event.title}</h1>
            <p className="event-meta">
              <span>
                <CalendarDays aria-hidden="true" />
                {start.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              <span>
                <MapPin aria-hidden="true" />
                <Link to={`/map?b=${encodeURIComponent(event.beachId)}`} viewTransition>
                  {event.beachName}
                </Link>
              </span>
            </p>
            {isEnglish(event.organizer.name) && <p className="event-organizer">Organized by {event.organizer.name}</p>}
            {event.description && <p className="event-description">{event.description}</p>}
          </div>
          <figure className="event-hero-photos">
            <Snapshots reports={evidence} max={3} />
            <figcaption>
              <AiSaw reports={evidence} />
            </figcaption>
          </figure>
        </div>
      </header>

      <div className="event-body">
        <div className="event-main">
          {cancelled && (
            <p className="event-banner">
              <Ban aria-hidden="true" /> This cleanup was cancelled by the organizer.
            </p>
          )}
          <WorkOrder event={event} signups={signups} />

          {isOrganizer && (
            <section className="event-organizer-tools">
              <h2>Volunteers</h2>
              <p className="report-meta">Only you, as the organizer, can see contact details.</p>
              <Roster signups={signups} contacts={contacts} />
              {!cancelled && !started && (
                <button type="button" className="btn event-cancel" onClick={cancel} disabled={cancelling}>
                  {cancelling ? "Cancelling…" : "Cancel this cleanup"}
                </button>
              )}
            </section>
          )}
        </div>

        <aside className="event-side">
          <div className="join-card">
            <div className="join-count">
              <strong>{joined}</strong>
              <span>
                of {event.capacity} spots taken
                {signups && ` by ${signups.length} sign-up${signups.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="wo-bar">
              <span style={{ width: `${Math.min(100, (joined / event.capacity) * 100)}%` }} />
            </div>
            {cancelled || started ? (
              <p className="report-meta">{cancelled ? "Sign-ups are closed." : "This cleanup has already started."}</p>
            ) : !ready ? (
              <p className="report-meta">Loading…</p>
            ) : !signedIn ? (
              <SignInGate
                title="Sign in to join"
                reason="So the organizer knows who's coming, and you can change or cancel your sign-up from any device."
              />
            ) : signups === undefined || myContact === undefined ? (
              <p className="report-meta">Loading…</p>
            ) : (
              <SignupForm
                key={mySignup ? `edit-${uid}` : `new-${uid}`}
                event={event}
                user={user}
                mySignup={mySignup}
                myContact={myContact}
                full={full}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
