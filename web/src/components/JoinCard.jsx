import { Link } from "react-router";
import { ORGANIZER_TYPES, headcount, useSignups } from "../lib/events";
import { organizerLabel } from "../lib/english";
import { planInputs } from "../lib/cleanup";
import { AiSaw, Snapshots } from "./Snapshots";
// The tile styles live with the Cleanups page, where they started.
import "../pages/ActionPage.css";

// An upcoming cleanup as a card: the beach's latest photo, the date, what the
// AI saw there, and how many spots are left.
export default function JoinCard({ event, reports }) {
  const signups = useSignups(event.id);
  const joined = headcount(signups);
  const start = event.startsAt.toDate();
  const left = Math.max(0, event.capacity - joined);
  const evidence = planInputs(reports, event.location);
  return (
    <Link to={`/events/${event.id}`} className="join-tile" viewTransition>
      <div className="join-tile-photo">
        <Snapshots reports={evidence} max={1} />
        <span className="date-sticker" aria-hidden="true">
          <small>{start.toLocaleDateString("en-US", { month: "short" })}</small>
          <strong>{start.getDate()}</strong>
        </span>
      </div>
      <div className="join-tile-body">
        <strong className="join-tile-title">{event.title}</strong>
        <span className="report-meta">
          {start.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}, {event.beachName}
        </span>
        <span className="report-meta">
          {organizerLabel(event.organizer, ORGANIZER_TYPES)}
        </span>
        <AiSaw reports={evidence} max={3} />
        <div className="join-tile-spots">
          <div className="wo-bar">
            <span style={{ width: `${Math.min(100, (joined / event.capacity) * 100)}%` }} />
          </div>
          <span>{left === 0 ? "Full" : `${left} of ${event.capacity} spots left`}</span>
        </div>
        <span className="btn btn-primary btn-small join-tile-cta">{left === 0 ? "See details" : "Join this cleanup"}</span>
      </div>
    </Link>
  );
}
