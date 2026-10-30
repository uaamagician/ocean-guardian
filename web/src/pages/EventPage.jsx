import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Ban, CalendarDays, MapPin } from "lucide-react";
import WorkOrder from "../components/WorkOrder";
import SignupForm from "../components/SignupForm";
import SignInGate from "../components/SignInGate";
import { CertificateLink, ResultsForm, ResultsView, ThankVolunteers } from "../components/CleanupResults";
import TaiwanRegistration from "../components/TaiwanRegistration";
import PhotoHistory, { NowPhoto } from "../components/PhotoHistory";
import PhotoViewer from "../components/PhotoViewer";
import { useNearbyReports } from "../lib/usePublishedReports";
import { BEACH_RADIUS_KM } from "../lib/beaches";
import { reportTime } from "../lib/reports";
import { isInTaiwan } from "../lib/regions";
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
  resultLine,
  useContacts,
  useEvent,
  useMyContact,
  useSignups,
} from "../lib/events";
import "./Events.css";

// The join card sticks beside the work order. When it's taller than the screen
// (its options open), a fixed top would hide its bottom until the page ends, so
// it scrolls along with the page first and sticks once its bottom is in view.
// Used as a ref callback, since the card only appears once the event loads.
function stickyFit(el) {
  if (!el) return undefined;
  const fit = () => {
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 72;
    el.style.setProperty("--stick-top", `${Math.min(nav + 16, window.innerHeight - el.offsetHeight - 16)}px`);
  };
  const observer = new ResizeObserver(fit);
  observer.observe(el);
  window.addEventListener("resize", fit);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", fit);
  };
}

// The join card once the cleanup has started: thanks and a certificate for
// those who took part, the results for everyone.
function AfterCleanup({ event, joined, isOrganizer }) {
  const results = event.results;
  if (!joined && !isOrganizer) {
    return (
      <p className="report-meta">
        This cleanup has already happened.{results && ` The crew collected ${resultLine(results)}.`}
      </p>
    );
  }
  return (
    <div className="after-cleanup">
      <strong>{isOrganizer ? "Thanks for organizing" : "Thanks for joining"}</strong>
      <p className="report-meta">
        {results
          ? `Together you collected ${resultLine(results)}.`
          : isOrganizer
            ? "Share how it went below, and everyone who came gets the results with their certificate."
            : "The organizer hasn't shared the results yet. Your certificate is ready either way."}
      </p>
      <CertificateLink eventId={event.id} label={isOrganizer ? "Organizer certificate" : "Your certificate"} />
    </div>
  );
}

// The beach in photos: the latest report large, then every earlier one by
// year, from all the reports around it rather than only the newest few hundred.
// A photo opens large on this page; the report itself is a further step.
function BeachOverTime({ event }) {
  const nearby = useNearbyReports(event.location, BEACH_RADIUS_KM);
  const navigate = useNavigate();
  const [viewing, setViewing] = useState(null);
  const photos = nearby
    .filter((r) => r.type === "trash" && r.photos?.[0])
    .sort((a, b) => reportTime(b).toMillis() - reportTime(a).toMillis());
  if (photos.length === 0) return null;
  const view = (r) => setViewing(photos.findIndex((p) => p.id === r.id));
  return (
    <section className="beach-over-time" aria-labelledby="bot-title">
      <span className="report-label">{event.beachName}</span>
      <h2 id="bot-title">The beach over time</h2>
      <NowPhoto reports={photos} onOpen={view} />
      <PhotoHistory reports={photos} onOpen={view} />
      {viewing !== null && viewing >= 0 && (
        <PhotoViewer
          reports={photos}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          onOpenReport={(r) =>
            navigate(`/map?b=${encodeURIComponent(event.beachId)}&r=${r.id}`, { viewTransition: true })
          }
        />
      )}
    </section>
  );
}

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
  const [editingResults, setEditingResults] = useState(false);
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
          {event.results && !cancelled && <ResultsView event={event} evidence={evidence} />}
          {isOrganizer && !cancelled && !started && isInTaiwan(event.location.lat, event.location.lng) && (
            <TaiwanRegistration event={event} signups={signups} user={user} />
          )}
          <WorkOrder event={event} signups={signups} />

          {isOrganizer && started && !cancelled && (
            <section className="event-organizer-tools">
              <h2>{event.results ? "Results" : "Share how it went"}</h2>
              {event.results && !editingResults ? (
                <p className="report-meta">
                  Shared: {resultLine(event.results)}, {event.results.attendees} people.{" "}
                  <button type="button" className="btn-text" onClick={() => setEditingResults(true)}>
                    Edit
                  </button>
                </p>
              ) : (
                <>
                  <p className="report-meta">
                    Volunteers see this on the cleanup page and on their certificates. Add photos of the beach
                    afterward for the before-and-after.
                  </p>
                  <ResultsForm event={event} signups={signups} onDone={() => setEditingResults(false)} />
                </>
              )}
              <h3>Thank your volunteers</h3>
              <ThankVolunteers event={event} contacts={contacts} />
            </section>
          )}
          {isOrganizer && started && !cancelled && isInTaiwan(event.location.lat, event.location.lng) && (
            <TaiwanRegistration event={event} signups={signups} user={user} />
          )}

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

        <aside className="event-side" ref={stickyFit}>
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
            {cancelled ? (
              <p className="report-meta">Sign-ups are closed.</p>
            ) : started ? (
              <AfterCleanup event={event} joined={Boolean(mySignup)} isOrganizer={isOrganizer} />
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
          <BeachOverTime event={event} />
        </aside>
      </div>
    </div>
  );
}
