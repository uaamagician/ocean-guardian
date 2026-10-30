import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { fromReportDoc } from "./reports";

// The status filter is required: rules only allow reading published reports.
// This is the newest 500, enough for the map and the home page; a beach's full
// history comes from useNearbyReports.
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

// Every published report around a point, however old: a band of latitude
// (Firestore filters on one range field), trimmed to `km` by distance.
export function useNearbyReports(point, km) {
  const lat = point?.lat;
  const lng = point?.lng;
  const [state, setState] = useState({ key: null, reports: [] });
  const key = lat == null ? null : `${lat},${lng},${km}`;
  useEffect(() => {
    if (key === null) return undefined;
    const band = km / 111;
    const nearby = query(
      collection(db, "reports"),
      where("status", "==", "published"),
      where("location.lat", ">=", lat - band),
      where("location.lat", "<=", lat + band),
    );
    return onSnapshot(
      nearby,
      (snap) =>
        setState({
          key,
          reports: snap.docs.map(fromReportDoc).filter((r) => distanceKm({ lat, lng }, r.location) <= km),
        }),
      (err) => console.error(err),
    );
  }, [key, lat, lng, km]);
  return state.key === key ? state.reports : [];
}

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
