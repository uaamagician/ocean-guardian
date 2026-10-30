import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { LogOut } from "lucide-react";
import EventCard from "../components/EventCard";
import SignInGate from "../components/SignInGate";
import { Avatar } from "../components/UserMenu";
import { isGoogleUser, signOutUser, useUser } from "../lib/auth";
import { englishName } from "../lib/english";
import { kidCount, resultLine, useMyEvents, useMySignups } from "../lib/events";
import { CertificateLink } from "../components/CleanupResults";
import { TOOL_BY_ID } from "../lib/guide";
import "./Events.css";
import "./ProfilePage.css";

function JoinedList({ events, now }) {
  if (events === undefined) return <p className="report-meta">Loading…</p>;
  if (events.length === 0) {
    return (
      <div className="notice">
        <p>You haven't joined a cleanup yet.</p>
        <Link to="/action" className="btn btn-primary" viewTransition>
          Find a cleanup
        </Link>
      </div>
    );
  }
  const upcoming = events.filter((e) => e.startsAt.toMillis() > now).reverse();
  const past = events.filter((e) => e.startsAt.toMillis() <= now);
  const row = (e) => (
    <li key={e.id} className="joined-item">
      <EventCard event={e} />
      <p className="joined-note">
        {e.status === "cancelled" ? "Cancelled by the organizer. " : ""}
        You signed up {e.mySignup.groupSize === 1 ? "yourself" : `${e.mySignup.groupSize} people`}
        {e.mySignup.kids > 0 && ` (${kidCount(e.mySignup.kids)})`}
        {e.mySignup.bringing.length > 0 &&
          `, bringing ${e.mySignup.bringing.map((t) => TOOL_BY_ID[t]?.name.toLowerCase()).filter(Boolean).join(", ")}`}
        .
      </p>
      {e.status !== "cancelled" && e.startsAt.toMillis() <= now && (
        <div className="joined-after">
          <span>{e.results ? `Results are in: ${resultLine(e.results)}, ${e.results.attendees} people.` : "Waiting for the organizer's results."}</span>
          <CertificateLink eventId={e.id} label="Certificate" />
        </div>
      )}
    </li>
  );
  return (
    <>
      {upcoming.length > 0 && (
        <>
          <h3 className="profile-sub">Coming up</h3>
          <ul className="event-list">{upcoming.map(row)}</ul>
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 className="profile-sub">Past</h3>
          <ul className="event-list profile-past">{past.map(row)}</ul>
        </>
      )}
    </>
  );
}

function SignedIn({ user }) {
  const joined = useMySignups(user.uid);
  const organized = useMyEvents(user.uid);
  const { hash } = useLocation();
  const [now] = useState(() => Date.now());

  // The menu's "My cleanups" link lands on that section.
  useEffect(() => {
    if (hash !== "#cleanups") return;
    const el = document.getElementById("cleanups");
    if (el) window.scrollTo({ top: el.offsetTop - 96 });
  }, [hash, joined]);

  return (
    <>
      <header className="profile-head">
        <Avatar user={user} size={72} />
        <div>
          <h1>{englishName(user) || "Your cleanups"}</h1>
          <p className="report-meta">{user.email}</p>
        </div>
        <button type="button" className="btn profile-signout" onClick={() => signOutUser()}>
          <LogOut aria-hidden="true" /> Sign out
        </button>
      </header>

      <section className="profile-section" id="cleanups">
        <h2>Cleanups I joined</h2>
        <JoinedList events={joined} now={now} />
      </section>

      <section className="profile-section">
        <h2>Cleanups I organize</h2>
        {organized === undefined && <p className="report-meta">Loading…</p>}
        {organized?.length === 0 && (
          <p className="report-meta">
            None yet. <Link to="/action?tab=organize">Pick a beach</Link> the AI has looked at to organize one.
          </p>
        )}
        {organized?.length > 0 && (
          <ul className="event-list">
            {organized.map((e) => (
              <li key={e.id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section">
        <h2>My reports</h2>
        <p className="report-meta">Beaches you reported, with the AI's analysis and any retake suggestions.</p>
        <Link to="/mine" className="btn" viewTransition>
          See my reports
        </Link>
      </section>
    </>
  );
}

export default function ProfilePage() {
  const { ready, user } = useUser();
  return (
    <div className="page profile-page">
      {!ready ? (
        <p className="report-meta">Loading…</p>
      ) : isGoogleUser(user) ? (
        <SignedIn user={user} />
      ) : (
        <>
          <div className="section">
            <h1>Your cleanups</h1>
            <p className="page-intro">Sign in to join cleanups, organize your own, and see them all in one place.</p>
          </div>
          <div className="notice">
            <SignInGate
              title="Sign in with Google"
              reason="Your sign-ups and the cleanups you organize follow your account to any device."
            />
          </div>
          <p className="report-meta">
            Reported a beach without signing in? <Link to="/mine">See the reports from this device</Link>. If you sign
            in on this device, they stay linked to your account.
          </p>
        </>
      )}
    </div>
  );
}
