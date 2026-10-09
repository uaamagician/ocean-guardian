import { Link } from "react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { ORGANIZER_TYPES, headcount, useSignups } from "../lib/events";
import { organizerLabel } from "../lib/english";

export default function EventCard({ event, showBeach = true }) {
  const signups = useSignups(event.id);
  const joined = headcount(signups);
  const start = event.startsAt.toDate();
  return (
    <Link to={`/events/${event.id}`} className="event-card" viewTransition>
      <div className="event-card-date" aria-hidden="true">
        <span>{start.toLocaleDateString("en-US", { month: "short" })}</span>
        <strong>{start.getDate()}</strong>
      </div>
      <div className="event-card-main">
        <strong>{event.title}</strong>
        <span className="report-meta">
          <CalendarDays aria-hidden="true" />
          {start.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}
          {showBeach && `, ${event.beachName}`}
        </span>
        <span className="report-meta">
          {organizerLabel(event.organizer, ORGANIZER_TYPES)}
        </span>
      </div>
      <div className="event-card-count">
        <strong>
          {joined}/{event.capacity}
        </strong>
        <div className="wo-bar">
          <span style={{ width: `${Math.min(100, (joined / event.capacity) * 100)}%` }} />
        </div>
        <span className="report-meta">{joined >= event.capacity ? "Full" : "joined"}</span>
      </div>
      <ChevronRight className="cl-chevron" aria-hidden="true" />
    </Link>
  );
}
