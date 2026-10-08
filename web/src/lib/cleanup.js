import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { ensureSignedIn } from "./reports";
import { distanceKm } from "./usePublishedReports";
import { BEACH_RADIUS_KM } from "./beaches";

// The function waits on Gemini, which can take a while when it's busy.
const planCleanupFn = httpsCallable(functions, "planCleanup", { timeout: 300_000 });

export const MIN_REPORTS_FOR_PLAN = 2;
// Matches PLAN_VERSION in functions/planCleanup.js; older plans lack team splits.
export const PLAN_VERSION = 2;

// Same selection the planCleanup function makes, so "is this plan out of date?"
// is answered the same way on both sides.
export function planInputs(allReports, beach) {
  return (allReports ?? []).filter(
    (r) => r.type === "trash" && r.aiAnalysis && distanceKm(beach, r.location) <= BEACH_RADIUS_KM,
  );
}

export async function requestPlan(beach) {
  await ensureSignedIn();
  const { data } = await planCleanupFn({ beachId: beach.id, name: beach.name, lat: beach.lat, lng: beach.lng });
  return data;
}

// Asks the AI to plan a cleanup at `beach`. The request is remembered per
// beach, so switching to another beach doesn't show this one's result.
export function usePlanRequest(beach) {
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
  return { ...mine, run };
}

// The debris items the AI spotted most often across these reports.
export function topItems(reports, max = 4) {
  const counts = new Map();
  for (const r of reports) {
    for (const item of new Set(r.aiAnalysis?.items ?? [])) counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([item]) => item);
}

// The last plan generated for this beach, kept live so a refresh elsewhere shows up here.
export function useStoredPlan(beachId) {
  const [state, setState] = useState({ beachId: null, plan: undefined });
  useEffect(
    () =>
      onSnapshot(
        doc(db, "cleanupPlans", beachId),
        (snap) => setState({ beachId, plan: snap.exists() ? snap.data() : null }),
        () => setState({ beachId, plan: null }),
      ),
    [beachId],
  );
  return state.beachId === beachId ? state.plan : undefined;
}

// Which beaches have an AI cleanup plan, as a set of beach ids (a small
// collection, read live). Null if it can't be read.
export function usePlanIds() {
  const [ids, setIds] = useState(undefined);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "cleanupPlans"),
        (snap) => setIds(new Set(snap.docs.map((d) => d.id))),
        () => setIds(null),
      ),
    [],
  );
  return ids;
}

export function usePlanCount() {
  const ids = usePlanIds();
  return ids ? ids.size : ids;
}

// The most recently generated plan anywhere, used as a live example on the home page.
export function useLatestPlan() {
  const [record, setRecord] = useState(undefined);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "cleanupPlans"), orderBy("generatedAt", "desc"), limit(1)),
        (snap) => setRecord(snap.docs[0]?.data() ?? null),
        () => setRecord(null),
      ),
    [],
  );
  return record;
}
