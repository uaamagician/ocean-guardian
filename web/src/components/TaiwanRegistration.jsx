import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { englishName } from "../lib/english";
import { headcount } from "../lib/events";

export const PLATFORM_URL = "https://ecolife2.moenv.gov.tw/Coastal/SeaApply/SeaCleanupApply";
// Local environmental bureaus ask for cleanups to be registered this far ahead,
// so the cleaning team can plan the pickup and bring bags.
export const LEAD_DAYS = 14;

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// The platform's time pickers run from 05:00 to 20:00.
const clampTime = (d) => {
  const minutes = Math.min(20 * 60, Math.max(5 * 60, d.getHours() * 60 + d.getMinutes()));
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
};

const OUT_OF_HOURS = "The form only takes times from 05:00 to 20:00, so this is the nearest it allows.";

function storageKey(eventId) {
  return `og-tw-registration-${eventId}`;
}

// The organizer's own extra answers stay in this browser only: the phone
// number in particular shouldn't sit on the public event.
function useSaved(eventId) {
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(eventId))) ?? {};
    } catch {
      return {};
    }
  });
  const update = (patch) =>
    setSaved((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(storageKey(eventId), JSON.stringify(next));
      } catch {
        // Private mode: keep it for this visit only.
      }
      return next;
    });
  return [saved, update];
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="tw-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked; the value is on screen to copy by hand.
        }
      }}
      aria-label={`Copy ${text}`}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  );
}

// One answer of the form. `edit` makes it a field the organizer fills in here
// (kept in this browser), still with a copy button beside it.
function Row({ n, label, value, hint, edit }) {
  return (
    <li className="tw-row">
      <span className="tw-n">{n}</span>
      <span className="tw-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="tw-value">
        {edit ? (
          <input
            className="tw-input"
            type={edit.type ?? "text"}
            value={value ?? ""}
            placeholder={edit.placeholder}
            aria-label={label}
            onChange={(e) => edit.onChange(e.target.value)}
          />
        ) : (
          value && <strong>{value}</strong>
        )}
      </span>
      {value ? <CopyButton text={value} /> : <span />}
    </li>
  );
}

// Taiwan asks organizers to register a cleanup on the Ministry of
// Environment's coastal platform, about two weeks ahead, so the local cleaning
// team can collect the bags afterward. The form has a CAPTCHA and is the
// organizer's own application, so it can't be sent from here; instead every
// answer is laid out in the form's order, ready to copy across.
export default function TaiwanRegistration({ event, signups, user }) {
  const [saved, update] = useSaved(event.id);
  // Read once per visit, like the rest of the event page.
  const [now] = useState(() => Date.now());
  const start = event.startsAt.toDate();
  const end = new Date(start.getTime() + event.durationHours * 3600e3);
  const due = new Date(start.getTime() - LEAD_DAYS * 86400e3);
  const late = now > due.getTime();
  const started = now >= start.getTime();
  const coords = `${event.location.lat.toFixed(5)}, ${event.location.lng.toFixed(5)}`;
  const contactName = saved.name ?? englishName(user);
  const pickup = saved.pickup ?? event.meetingPoint ?? "";

  if (started) {
    return (
      <section className="tw-reg" aria-labelledby="tw-title">
        <h2 id="tw-title">Taiwan coastal platform: results</h2>
        <p className="report-meta">
          If you registered this cleanup, the platform asks for the results afterward. Log in on the platform and add
          these to your application.
        </p>
        {event.results ? (
          <ol className="tw-rows">
            <Row n="1" label="Bags collected" value={String(event.results.bags)} />
            {event.results.weightKg ? <Row n="2" label="Weight, kg" value={String(event.results.weightKg)} /> : null}
            <Row n={event.results.weightKg ? "3" : "2"} label="People who came" value={String(event.results.attendees)} />
          </ol>
        ) : (
          <p className="report-meta">Share the results above first; they appear here ready to copy.</p>
        )}
      </section>
    );
  }

  if (saved.done) {
    return (
      <section className="tw-reg is-done" aria-labelledby="tw-title">
        <h2 id="tw-title">
          <Check aria-hidden="true" /> Registered on Taiwan's coastal platform
        </h2>
        <p className="report-meta">
          The local cleaning team should contact you about the pickup spot and bags.{" "}
          <button type="button" className="btn-text" onClick={() => update({ done: false })}>
            Show the answers again
          </button>
        </p>
      </section>
    );
  }

  return (
    <section className="tw-reg" aria-labelledby="tw-title">
      <h2 id="tw-title">Register with Taiwan's coastal cleanup platform</h2>
      <p>
        Taiwan's Ministry of Environment asks organizers to register cleanups on its coastal platform, ideally{" "}
        {LEAD_DAYS} days ahead. The local environmental bureau reviews it, and the city or county cleaning team then
        contacts you to agree where to leave the full bags and to hand out bags. Below is every answer the form asks
        for, in the form's order.
      </p>
      <p className={late ? "tw-due is-late" : "tw-due"}>
        {late
          ? `Less than ${LEAD_DAYS} days to go: register now anyway, and phone the local cleaning team so they know about the pickup.`
          : `Register by ${due.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}.`}
      </p>

      <ol className="tw-rows">
        <Row
          n="1"
          label="Pick the coastline on the platform's map"
          hint="Paste these coordinates into its coordinate search, then click the coastline segment next to the pin. County and coastline name fill in by themselves."
          value={coords}
        />
        <Row n="2" label="Date" value={ymd(start)} />
        <Row n="3" label="Start time" value={clampTime(start)} hint={hm(start) !== clampTime(start) ? OUT_OF_HOURS : undefined} />
        <Row n="4" label="End time" value={clampTime(end)} hint={hm(end) !== clampTime(end) ? OUT_OF_HOURS : undefined} />
        <Row n="5" label="Organizing group" value={event.organizer.name} />
        <Row n="6" label="Contact person" value={contactName} edit={{ placeholder: "Your name", onChange: (v) => update({ name: v }) }} />
        <Row
          n="7"
          label="Phone"
          hint="The cleaning team calls this number. Kept in this browser only, never on the event."
          value={saved.phone}
          edit={{ type: "tel", placeholder: "0912-345-678", onChange: (v) => update({ phone: v }) }}
        />
        <Row n="8" label="Email" value={user.email} />
        <Row n="9" label="Number of people" hint={`${headcount(signups)} signed up so far; this is the cleanup's capacity.`} value={String(event.capacity)} />
        <Row n="10" label="Need help taking the garbage away?" value="Yes" />
        <Row
          n="11"
          label="Where the bags will be left"
          hint="Somewhere a truck can reach. The cleaning team may suggest a spot."
          value={pickup}
          edit={{ placeholder: "Car park by the beach entrance", onChange: (v) => update({ pickup: v }) }}
        />
        <Row n="12" label="Open to the public?" hint="Cleanups on Ocean Guardian are open to anyone." value="Yes" />
        <Row n="13" label="Is each gender at least a third of the group?" hint="A statistic the ministry collects; answer it as best you can." />
        <Row n="14" label="Share your contact in the ministry's marine-debris recycling section?" hint="Your choice; it doesn't affect approval." />
        <Row n="15" label="Type the verification code shown on the form, then send it" />
      </ol>

      <div className="tw-actions">
        <a className="btn btn-primary" href={PLATFORM_URL} target="_blank" rel="noreferrer">
          Open the registration form <ExternalLink aria-hidden="true" />
        </a>
        <label className="tw-done">
          <input type="checkbox" onChange={(e) => update({ done: e.target.checked })} /> I've registered it
        </label>
      </div>
      <p className="bp-note">
        Registration is how the cleaning team learns about your cleanup and collects what you gather; full bags left
        on the beach without a pickup arranged can be treated as dumped waste. Details differ between counties, so for
        anything unclear, ask the local environmental bureau.
      </p>
    </section>
  );
}
