import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { fromReportDoc } from "./reports";

// The status filter is required: rules only allow reading published reports.
const publishedReports = query(
  collection(db, "reports"),
  where("status", "==", "published"),
  orderBy("createdAt", "desc"),
  limit(500),
);

export default function usePublishedReports() {
  const [state, setState] = useState({ reports: null, error: false });
  useEffect(
    () =>
      onSnapshot(
        publishedReports,
        (snap) => setState({ reports: snap.docs.map(fromReportDoc), error: false }),
        (err) => {
          console.error(err);
          setState((prev) => ({ ...prev, error: true }));
        },
      ),
    [],
  );
  return state;
}

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
