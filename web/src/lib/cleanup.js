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
