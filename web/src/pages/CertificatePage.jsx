import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import SignInGate from "../components/SignInGate";
import { isGoogleUser, useUser } from "../lib/auth";
import { englishName, isEnglish } from "../lib/english";
import { resultLine, useEvent, useSignups } from "../lib/events";
import "./CertificatePage.css";

// A wave drawn by hand, for the certificate's top and bottom edges.
function WaveRule() {
  return (
    <svg className="cert-wave" viewBox="0 0 600 16" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 9c25-7 50 6 75-1s50-7 75 0 50 7 75 0 50-6 75 1 50 6 75-1 50-7 75 0 50 6 73 0" />
    </svg>
  );
}

function Sheet({ event, name, organizing }) {
  const date = event.startsAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const r = event.results;
  return (
    <article className="cert" aria-label="Certificate">
      <WaveRule />
      <header className="cert-brand">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="16" cy="16" r="13" />
          <path d="M5 18c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2" strokeLinecap="round" />
        </svg>
        <span>
          <span className="wordmark-strong">Ocean</span> <span className="wordmark-light">Guardian</span>
        </span>
      </header>
      <h1 className="cert-title">Certificate of Thanks</h1>
      <p className="cert-to">presented to</p>
      <p className="cert-name">{name}</p>
      <p className="cert-for">
        {organizing ? "for organizing" : "for joining"} <strong>{event.title}</strong> at {event.beachName} on {date}
        {r ? (
          <>
            , where {r.attendees} {r.attendees === 1 ? "person" : "people"} collected <strong>{resultLine(r)}</strong> of
            debris from the shore.
          </>
        ) : (
          "."
        )}
      </p>
      <p className="cert-sdg">A citizen cleanup for UN Sustainable Development Goal 14, Life Below Water.</p>
      <footer className="cert-foot">
        <div>
          <span className="cert-sign">{isEnglish(event.organizer.name) ? event.organizer.name : "The organizer"}</span>
          <span className="cert-sign-label">Organizer</span>
        </div>
        <div>
          <span className="cert-sign">{date}</span>
          <span className="cert-sign-label">Date</span>
        </div>
      </footer>
      <WaveRule />
    </article>
  );
}

// A printable certificate for everyone who signed up for a cleanup, and one
// for the organizer, once the cleanup has started.
export default function CertificatePage() {
  const { eventId } = useParams();
  const event = useEvent(eventId);
  const signups = useSignups(eventId);
  const { ready, user } = useUser();
  const [now] = useState(() => Date.now());

  const back = (
    <Link to={`/events/${eventId}`} className="btn-text cert-back" viewTransition>
      <ArrowLeft aria-hidden="true" /> Back to the cleanup
    </Link>
  );

  let body;
  if (event === undefined || !ready || (isGoogleUser(user) && signups === undefined)) {
    body = <p className="report-meta">Loading…</p>;
  } else if (event === null) {
    body = <p className="report-meta">This cleanup doesn't exist, or it was removed.</p>;
  } else if (!isGoogleUser(user)) {
    body = <SignInGate title="Sign in to see your certificate" reason="Certificates go to the people who signed up." />;
  } else {
    const mine = signups?.find((s) => s.id === user.uid);
    const organizing = event.createdBy === user.uid;
    if (event.status === "cancelled") {
      body = <p className="report-meta">This cleanup was cancelled, so there's no certificate for it.</p>;
    } else if (!mine && !organizing) {
      body = <p className="report-meta">Certificates are for the people who signed up for this cleanup.</p>;
    } else if (event.startsAt.toMillis() > now) {
      body = <p className="report-meta">Your certificate appears here once the cleanup has started.</p>;
    } else {
      const name = mine?.name || englishName(user) || "Volunteer";
      body = (
        <>
          <Sheet event={event} name={name} organizing={organizing && !mine} />
          <div className="cert-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer aria-hidden="true" /> Print or save as PDF
            </button>
            {!event.results && (
              <span className="report-meta">The results appear on it once the organizer shares them.</span>
            )}
          </div>
        </>
      );
    }
  }

  return (
    <div className="page cert-page">
      {back}
      {body}
    </div>
  );
}
