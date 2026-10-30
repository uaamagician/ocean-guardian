import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { isGoogleUser } from "./auth";

// Organizing and joining need a Google account (enforced by the rules too).
function requireGoogleUser() {
  const user = auth.currentUser;
  if (!isGoogleUser(user)) throw new Error("Sign in with Google first.");
  return user;
}

export const ORGANIZER_TYPES = {
  individual: "Individual",
  school: "School or club",
  ngo: "NGO",
  company: "Company",
};

// The work order is a frozen copy of the AI plan, so later plan updates don't
// change what volunteers already signed up for.
function workOrderFrom(record) {
  const p = record.plan;
  return {
    severity: p.severity,
    summary: p.summary,
    volunteers: p.volunteers,
    hours: p.hours,
    bags: p.bags,
    gear: p.gear,
    heavyMachinery: p.heavyMachinery,
    hazards: p.hazards,
    teams: p.teams ?? [],
    tips: p.tips,
    reportCount: record.reportCount,
  };
}

export async function createEvent({ beach, planRecord, form }) {
  const user = requireGoogleUser();
  const ref = doc(collection(db, "events"));
  await setDoc(ref, {
    beachId: beach.id,
    beachName: beach.name.slice(0, 120),
    location: { lat: beach.lat, lng: beach.lng },
    title: form.title.trim(),
    startsAt: Timestamp.fromDate(form.startsAt),
    durationHours: form.durationHours,
    meetingPoint: form.meetingPoint.trim(),
    organizer: { name: form.organizerName.trim(), type: form.organizerType },
    description: form.description.trim(),
    capacity: form.capacity,
    workOrder: workOrderFrom(planRecord),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    status: "open",
  });
  if (form.contact.trim()) await setDoc(doc(ref, "contacts", user.uid), { contact: form.contact.trim() });
  return ref.id;
}

export function useUid() {
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

function useSnapshot(makeRef, deps, map) {
  const [state, setState] = useState({ key: null, value: undefined });
  const key = JSON.stringify(deps);
  useEffect(() => {
    const ref = makeRef();
    if (!ref) {
      setState({ key, value: null });
      return undefined;
    }
    return onSnapshot(
      ref,
      (snap) => setState({ key, value: map(snap) }),
      (err) => {
        console.error(err);
        setState({ key, value: null });
      },
    );
    // makeRef and map close over the values `key` encodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state.value : undefined;
}

const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export function useEvent(eventId) {
  return useSnapshot(
    () => doc(db, "events", eventId),
    [eventId],
    (snap) => (snap.exists() ? { id: snap.id, ...snap.data() } : null),
  );
}

export function useSignups(eventId) {
  return useSnapshot(() => collection(db, "events", eventId, "signups"), [eventId], toList);
}

// Only the organizer's query is allowed by the rules, so only they subscribe.
export function useContacts(eventId, isOrganizer) {
  return useSnapshot(
    () => (isOrganizer ? collection(db, "events", eventId, "contacts") : null),
    [eventId, isOrganizer],
    (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data().contact])),
  );
}

export function useMyContact(eventId, uid) {
  return useSnapshot(
    () => (uid ? doc(db, "events", eventId, "contacts", uid) : null),
    [eventId, uid],
    (snap) => (snap.exists() ? snap.data().contact : ""),
  );
}

// Cleanups that have already happened, most recent last.
export function usePastEvents(max = 12) {
  return useSnapshot(
    () =>
      query(
        collection(db, "events"),
        where("status", "==", "open"),
        where("startsAt", "<", Timestamp.now()),
        orderBy("startsAt"),
        limitToLast(max),
      ),
    ["past", max],
    toList,
  );
}

export function useUpcomingEvents(max = 30) {
  return useSnapshot(
    () =>
      query(
        collection(db, "events"),
        where("status", "==", "open"),
        where("startsAt", ">=", Timestamp.now()),
        orderBy("startsAt"),
        limit(max),
      ),
    ["upcoming", max],
    toList,
  );
}

export function useBeachEvents(beachId) {
  return useSnapshot(
    () => query(collection(db, "events"), where("beachId", "==", beachId), orderBy("startsAt")),
    ["beach", beachId],
    (snap) => toList(snap).filter((e) => e.status === "open" && e.startsAt.toMillis() > Date.now()),
  );
}

export async function saveSignup(eventId, { name, groupSize, kids, bringing, note, contact }) {
  const user = requireGoogleUser();
  const ref = doc(db, "events", eventId, "signups", user.uid);
  // uid is stored too, so the profile page can find sign-ups across events.
  // groupSize counts everyone, kids included; kids says how many of them are.
  const fields = { uid: user.uid, name: name.trim(), groupSize, kids, bringing, note: note.trim() };
  const existing = await getDoc(ref);
  // Edits leave createdAt untouched; the rules require it to stay as stored.
  if (existing.exists()) await updateDoc(ref, fields);
  else await setDoc(ref, { ...fields, createdAt: serverTimestamp() });

  const contactRef = doc(db, "events", eventId, "contacts", user.uid);
  if (contact.trim()) await setDoc(contactRef, { contact: contact.trim() });
  else await deleteDoc(contactRef);
}

export async function withdraw(eventId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await Promise.all([
    deleteDoc(doc(db, "events", eventId, "signups", uid)),
    deleteDoc(doc(db, "events", eventId, "contacts", uid)),
  ]);
}

// Every cleanup this person signed up for, newest event first.
export function useMySignups(uid) {
  const signups = useSnapshot(
    () => (uid ? query(collectionGroup(db, "signups"), where("uid", "==", uid)) : null),
    ["mine", uid],
    (snap) => snap.docs.map((d) => ({ id: d.id, eventId: d.ref.parent.parent.id, ...d.data() })),
  );
  // Which events to load, as a string so equal lists don't refetch.
  const ids = signups ? signups.map((s) => s.eventId).join(",") : undefined;
  const [events, setEvents] = useState({ ids: null, byId: {} });
  useEffect(() => {
    if (ids === undefined) return undefined;
    let cancelled = false;
    const list = ids ? ids.split(",") : [];
    Promise.all(list.map((id) => getDoc(doc(db, "events", id)))).then((snaps) => {
      if (cancelled) return;
      const byId = Object.fromEntries(snaps.filter((d) => d.exists()).map((d) => [d.id, { id: d.id, ...d.data() }]));
      setEvents({ ids, byId });
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (signups === null) return [];
  if (signups === undefined || events.ids !== ids) return undefined;
  return signups
    .filter((s) => events.byId[s.eventId])
    .map((s) => ({ ...events.byId[s.eventId], mySignup: s }))
    .sort((a, b) => b.startsAt.toMillis() - a.startsAt.toMillis());
}

export function useMyEvents(uid) {
  return useSnapshot(
    () => (uid ? query(collection(db, "events"), where("createdBy", "==", uid), orderBy("startsAt", "desc")) : null),
    ["organized", uid],
    toList,
  );
}

// After the cleanup the organizer records how it went: the "after" photos,
// what was collected and who came. Volunteers see it on the event page and on
// their certificate. `keep` are photos already saved; `photos` are new blobs.
export async function saveResults(eventId, { bags, weightKg, attendees, note, keep, photos }) {
  const user = requireGoogleUser();
  const added = await Promise.all(
    photos.map(async (blob, i) => {
      const path = `events/${eventId}/${user.uid}/${Date.now()}_${i}.jpg`;
      await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      return path;
    }),
  );
  await updateDoc(doc(db, "events", eventId), {
    results: { bags, weightKg, attendees, note: note.trim(), photos: [...keep, ...added], postedAt: serverTimestamp() },
  });
}

// "12 bags, 40 kg": what a cleanup collected, in a few words.
export function resultLine(results) {
  const parts = [`${results.bags} ${results.bags === 1 ? "bag" : "bags"}`];
  if (results.weightKg) parts.push(`${results.weightKg} kg`);
  return parts.join(", ");
}

export function cancelEvent(eventId) {
  return updateDoc(doc(db, "events", eventId), { status: "cancelled" });
}

export const headcount = (signups) => (signups ?? []).reduce((n, s) => n + s.groupSize, 0);

// Sign-ups made before kids were counted have no kids field.
export const kidsIn = (signups) => (signups ?? []).reduce((n, s) => n + (s.kids ?? 0), 0);

export const kidCount = (n) => `${n} ${n === 1 ? "kid" : "kids"}`;

// "You and 2 more (1 kid)": who a sign-up brings along, as the person sees it.
export function describeParty(signup) {
  const more = signup.groupSize - 1;
  if (more === 0) return "Just you";
  return `You and ${more} more${signup.kids ? ` (${kidCount(signup.kids)})` : ""}`;
}
