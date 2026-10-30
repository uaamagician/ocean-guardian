import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, Clock, Trash2, Users } from "lucide-react";
import { useAllBeaches } from "../lib/beaches";
import { planInputs, useStoredPlan } from "../lib/cleanup";
import usePublishedReports from "../lib/usePublishedReports";
import { Level } from "../components/ReportDetail";
import { AiSaw, Snapshots } from "../components/Snapshots";
import { ORGANIZER_TYPES, createEvent } from "../lib/events";
import { TOOL_BY_ID } from "../lib/guide";
import { isGoogleUser, useUser } from "../lib/auth";
import { ENGLISH_ONLY, englishName, hasCjk } from "../lib/english";
import SignInGate from "../components/SignInGate";
import { isInTaiwan } from "../lib/regions";
import { LEAD_DAYS } from "../components/TaiwanRegistration";
import "./Events.css";

const span = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

function StepTitle({ n, id, children }) {
  return (
    <h2 className="create-step" id={id}>
      <span className="cl-step-num" aria-hidden="true">
        {n}
      </span>
      {children}
    </h2>
  );
}

// Next Saturday at 8:00, before the midday sun.
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return { date: d.toLocaleDateString("en-CA"), time: "08:00" };
}

function EventForm({ beach, record, user }) {
  const navigate = useNavigate();
  const plan = record.plan;
  const [now] = useState(() => Date.now());
  const [form, setForm] = useState(() => ({
    title: `Cleanup at ${beach.name}`.slice(0, 100),
    ...defaultStart(),
    durationHours: Math.max(0.5, Math.ceil(plan.hours * 2) / 2),
    meetingPoint: "",
    organizerName: englishName(user).slice(0, 80),
    organizerType: "individual",
    capacity: Math.min(500, Math.max(plan.volunteers.max, 1)),
    description: "",
    contact: user.email ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startsAt = new Date(`${form.date}T${form.time}`);
  const inFuture = startsAt.getTime() > now + 60_000;
  const notEnglish = [form.title, form.meetingPoint, form.organizerName, form.description].some(hasCjk);
  const valid =
    form.title.trim().length >= 3 &&
    form.organizerName.trim().length >= 2 &&
    inFuture &&
    form.capacity >= 1 &&
    !notEnglish;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const id = await createEvent({
        beach,
        planRecord: record,
        form: { ...form, startsAt, durationHours: Number(form.durationHours), capacity: Math.round(Number(form.capacity)) },
      });
      navigate(`/events/${id}`, { viewTransition: true });
    } catch (err) {
      console.error(err);
      setError("Couldn't create the cleanup. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <form className="create-form" onSubmit={submit}>
      <fieldset className="create-block" aria-labelledby="step-when">
        <StepTitle n={2} id="step-when">
          When and where
        </StepTitle>
        <label className="field">
          <span>Title</span>
          <input value={form.title} maxLength={100} onChange={set("title")} required />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} min={new Date(now).toLocaleDateString("en-CA")} onChange={set("date")} required />
          </label>
          <label className="field">
            <span>Start time</span>
            <input type="time" value={form.time} onChange={set("time")} required />
          </label>
          <label className="field">
            <span>Hours</span>
            <input type="number" min={0.5} max={12} step={0.5} value={form.durationHours} onChange={set("durationHours")} />
          </label>
        </div>
        {!inFuture && <p className="error-text">Pick a date and time in the future.</p>}
        {isInTaiwan(beach.lat, beach.lng) && (
          <p className="tw-note">
            In Taiwan, register the cleanup on the Ministry of Environment's coastal platform about {LEAD_DAYS} days
            ahead, so the local cleaning team can collect the bags.
            {inFuture && startsAt.getTime() - now < LEAD_DAYS * 86400e3 && " This date is sooner than that, so register as soon as it's created."}{" "}
            Once the cleanup is created, its page lists every answer the form asks for, ready to copy.
          </p>
        )}

        <label className="field">
          <span>
            Meeting point <span className="report-meta">(optional)</span>
          </span>
          <input
            value={form.meetingPoint}
            maxLength={200}
            placeholder="For example: car park at the north end, by the lifeguard tower"
            onChange={set("meetingPoint")}
          />
        </label>
      </fieldset>

      <fieldset className="create-block" aria-labelledby="step-who">
        <StepTitle n={3} id="step-who">
          Who's organizing
        </StepTitle>

        <div className="field-row">
          <label className="field">
            <span>Organizer name</span>
            <input value={form.organizerName} maxLength={80} placeholder="You, your club or company" onChange={set("organizerName")} required />
          </label>
          <label className="field">
            <span>Spots</span>
            <input type="number" min={1} max={500} value={form.capacity} onChange={set("capacity")} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Organized by</legend>
          <div className="kind-options">
            {Object.entries(ORGANIZER_TYPES).map(([value, label]) => (
              <label key={value} className="kind-option">
                <input type="radio" name="orgType" checked={form.organizerType === value} onChange={() => setForm((f) => ({ ...f, organizerType: value }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>
            Message to volunteers <span className="report-meta">(optional)</span>
          </span>
          <textarea rows={3} maxLength={1000} value={form.description} onChange={set("description")} />
        </label>

        <label className="field">
          <span>
            Your phone or email <span className="report-meta">(optional, only you see it)</span>
          </span>
          <input value={form.contact} maxLength={120} onChange={set("contact")} />
        </label>
      </fieldset>

      {notEnglish && <p className="error-text">{ENGLISH_ONLY}</p>}
      {error && <p className="error-text">{error}</p>}
      <p className="bp-note">
        The work order is copied from the AI plan now, so later updates to the plan won't change this cleanup. The event
        and the names people sign up with are public.
      </p>
      <button type="submit" className="btn btn-primary" disabled={!valid || saving}>
        {saving ? "Creating…" : "Create cleanup and work order"}
      </button>
    </form>
  );
}

export default function CreateEventPage() {
  const [params] = useSearchParams();
  const beachId = params.get("b") ?? "";
  const { beaches } = useAllBeaches();
  const beach = beaches?.find((b) => b.id === beachId);
  const record = useStoredPlan(beachId || "none");
  const { ready, user } = useUser();
  const { reports } = usePublishedReports();

  if (!beaches || record === undefined) {
    return (
      <div className="page">
        <p className="report-meta">Loading…</p>
      </div>
    );
  }
  if (!beach || !record) {
    return (
      <div className="page">
        <h1>Plan the cleanup first</h1>
        <p className="page-intro">
          A cleanup starts from the beach's AI plan, which sets the crew size and gear for the work order.
        </p>
        <Link to={beach ? `/map?b=${encodeURIComponent(beach.id)}&t=cleanup` : "/action?tab=organize"} className="btn btn-primary" viewTransition>
          {beach ? "Open the beach's cleanup plan" : "See beaches that need a cleanup"}
        </Link>
      </div>
    );
  }

  const plan = record.plan;
  const evidence = planInputs(reports, beach);
  return (
    <div className="page page-wide create-page">
      <div className="section">
        <Link to="/action?tab=organize" className="btn-text create-back" viewTransition>
          Back to beaches
        </Link>
        <h1>Organize a cleanup at {beach.name}</h1>
        <p className="page-intro">
          Check what the AI saw, then set a time and place. Volunteers sign up on the cleanup's page and say what gear
          they can bring.
        </p>
      </div>

      <div className="create-layout">
        <section className="create-ai" aria-labelledby="create-ai-title">
          <StepTitle n={1} id="create-ai-title">
            What the AI saw
          </StepTitle>
          <Snapshots reports={evidence} max={3} />
          <div className="create-ai-head">
            <Level category={plan.severity} />
            <span className="report-meta">
              From {record.reportCount} photo report{record.reportCount === 1 ? "" : "s"}
            </span>
          </div>
          <AiSaw reports={evidence} />
          <p>{plan.summary}</p>
          <div className="plan-stats">
            <div>
              <Users aria-hidden="true" />
              <strong>{span(plan.volunteers)}</strong>
              <span>volunteers</span>
            </div>
            <div>
              <Clock aria-hidden="true" />
              <strong>{plan.hours} h</strong>
              <span>estimated</span>
            </div>
            <div>
              <Trash2 aria-hidden="true" />
              <strong>{span(plan.bags)}</strong>
              <span>full bags</span>
            </div>
          </div>
          <div>
            <span className="report-label">Gear volunteers will be asked to bring</span>
            <ul className="report-items">
              {plan.gear.map((g) => (
                <li key={g.tool}>{TOOL_BY_ID[g.tool]?.name}</li>
              ))}
            </ul>
          </div>
          {plan.hazards?.length > 0 && (
            <p className="create-hazards">
              <AlertTriangle aria-hidden="true" />
              {plan.hazards.join(" ")}
            </p>
          )}
        </section>

        {!ready ? (
          <p className="report-meta">Loading…</p>
        ) : isGoogleUser(user) ? (
          <EventForm key={user.uid} beach={beach} record={record} user={user} />
        ) : (
          <div className="create-form">
            <StepTitle n={2}>Sign in to continue</StepTitle>
            <SignInGate
              title="Sign in with Google"
              reason="Volunteers need to know who is running the cleanup, and you'll manage sign-ups from any device with the same account."
            />
          </div>
        )}
      </div>
    </div>
  );
}
