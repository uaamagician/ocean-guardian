import { useState } from "react";
import { Link } from "react-router";
import { CalendarPlus, Clock, RefreshCw, Sparkles, Trash2, Truck, Users } from "lucide-react";
import { MIN_REPORTS_FOR_PLAN, PLAN_VERSION, planInputs, requestPlan, useStoredPlan } from "../lib/cleanup";
import { TOOL_BY_ID } from "../lib/guide";
import { Level } from "./ReportDetail";
import EventCard from "./EventCard";
import { useBeachEvents } from "../lib/events";
import "../pages/Events.css";

const range = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

function hoursLabel(h) {
  if (h < 1) return `${h * 60} min`;
  return `${h} hour${h === 1 ? "" : "s"}`;
}

function PlanBody({ record }) {
  const { plan } = record;
  return (
    <div className="plan">
      <div className="plan-head">
        <Level category={plan.severity} />
        <span className="plan-confidence">AI confidence {Math.round(plan.confidence * 100)}%</span>
      </div>
      <p className="plan-summary">{plan.summary}</p>

      <div className="plan-stats">
        <div>
          <Users aria-hidden="true" />
          <strong>{range(plan.volunteers)}</strong>
          <span>volunteers</span>
        </div>
        <div>
          <Clock aria-hidden="true" />
          <strong>{hoursLabel(plan.hours)}</strong>
          <span>estimated</span>
        </div>
        <div>
          <Trash2 aria-hidden="true" />
          <strong>{range(plan.bags)}</strong>
          <span>full bags</span>
        </div>
      </div>

      <div className={plan.heavyMachinery.needed ? "plan-machinery is-needed" : "plan-machinery"}>
        <Truck aria-hidden="true" />
        <div>
          <strong>{plan.heavyMachinery.needed ? "Heavy equipment needed" : "No heavy equipment needed"}</strong>
          {plan.heavyMachinery.reason && <p>{plan.heavyMachinery.reason}</p>}
        </div>
      </div>

      <section>
        <h4>What to bring</h4>
        <ul className="plan-gear">
          {plan.gear.map((g) => {
            const tool = TOOL_BY_ID[g.tool];
            if (!tool) return null;
            const Icon = tool.icon;
            return (
              <li key={g.tool}>
                <Icon aria-hidden="true" />
                <div>
                  <Link to={`/guide#tool-${tool.id}`} viewTransition>
                    {tool.name}
                  </Link>
                  {g.quantity && <span className="plan-qty">{g.quantity}</span>}
                  <p>{g.reason}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {plan.hazards.length > 0 && (
        <section>
          <h4>Watch out for</h4>
          <ul className="plan-list plan-hazards">
            {plan.hazards.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      )}

      {plan.tips.length > 0 && (
        <section>
          <h4>Tips</h4>
          <ul className="plan-list">
            {plan.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Cleanups already scheduled here, and the way to organize one from this plan.
function BeachEvents({ beach }) {
  const events = useBeachEvents(beach.id);
  return (
    <section className="plan-events">
      <h4>Cleanups at this beach</h4>
      {events?.length > 0 ? (
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id}>
              <EventCard event={e} showBeach={false} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="report-meta">{events === undefined ? "Loading…" : "None scheduled yet."}</p>
      )}
      <Link to={`/events/new?b=${encodeURIComponent(beach.id)}`} className="btn plan-organize" viewTransition>
        <CalendarPlus aria-hidden="true" />
        Organize a cleanup from this plan
      </Link>
    </section>
  );
}

export default function CleanupPlan({ beach, allReports }) {
  const reports = planInputs(allReports, beach);
  const stored = useStoredPlan(beach.id);
  const [request, setRequest] = useState({ beachId: null, loading: false, error: "", result: null });
  const mine = request.beachId === beach.id ? request : { loading: false, error: "", result: null };

  const run = async () => {
    setRequest({ beachId: beach.id, loading: true, error: "", result: null });
    try {
      const result = await requestPlan(beach);
      setRequest({ beachId: beach.id, loading: false, error: "", result });
    } catch (err) {
      console.error(err);
      setRequest({
        beachId: beach.id,
        loading: false,
        error: "Couldn't create a plan right now. The AI may be busy; try again in a minute.",
        result: null,
      });
    }
  };

  if (reports.length < MIN_REPORTS_FOR_PLAN) {
    const missing = MIN_REPORTS_FOR_PLAN - reports.length;
    return (
      <div className="plan-empty">
        <Sparkles aria-hidden="true" />
        <p>
          The AI plans a cleanup from at least {MIN_REPORTS_FOR_PLAN} reports of the same beach. This one needs{" "}
          {missing} more.
        </p>
        <Link to="/report" className="btn btn-primary" viewTransition>
          Report this beach
        </Link>
      </div>
    );
  }

  // A fresh result wins; otherwise show the stored plan.
  const record = mine.result?.status === "ok" ? mine.result : stored;
  const outdated = record && record.version !== PLAN_VERSION;
  const stale =
    record &&
    (outdated || record.reportCount !== reports.length || (record.latestReportId && record.latestReportId !== reports[0].id));
  const newReports = record ? Math.max(0, reports.length - record.reportCount) : 0;
  const generated = record?.generatedAt?.toDate?.() ?? (record?.generatedAt ? new Date(record.generatedAt) : null);

  return (
    <div className="plan-wrap">
      {stored === undefined && !mine.result && <p className="report-meta">Loading plan…</p>}

      {record && <PlanBody record={record} />}

      {record && (
        <p className="bp-note">
          AI estimate from {record.reportCount} report{record.reportCount > 1 ? "s" : ""}
          {generated ? `, made ${generated.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.
          Check the tide and weather on the day; the Overview tab has both.
        </p>
      )}

      {mine.error && <p className="error-text">{mine.error}</p>}

      {record && !stale && <BeachEvents beach={beach} />}

      {stored !== undefined && (!record || stale) && (
        <button type="button" className="btn btn-primary plan-run" onClick={run} disabled={mine.loading}>
          {record ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {mine.loading
            ? "Planning… this can take up to a minute"
            : !record
              ? "Plan a cleanup with AI"
              : newReports > 0
                ? `Update plan with ${newReports} new report${newReports > 1 ? "s" : ""}`
                : "Update plan with team splits"}
        </button>
      )}
    </div>
  );
}
