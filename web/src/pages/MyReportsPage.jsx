import { useEffect, useState } from "react";
import { Link } from "react-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { currentUser, fromReportDoc } from "../lib/reports";
import ReportDetail from "../components/ReportDetail";

export default function MyReportsPage() {
  const [reports, setReports] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    // Don't create an anonymous account just to look at an empty list.
    currentUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        setReports([]);
        return;
      }
      unsubscribe = onSnapshot(
        query(collection(db, "reports"), where("reporterId", "==", user.uid), orderBy("createdAt", "desc")),
        (snap) => setReports(snap.docs.map(fromReportDoc)),
        (err) => {
          console.error(err);
          setLoadError(true);
        },
      );
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <div className="page">
      <div className="section">
        <h1>My reports</h1>
        <p className="page-intro">Every report sent from this device, including ones still being analyzed or waiting for review.</p>
      </div>

      {loadError && <p className="error-text">Couldn't load your reports. Refresh the page to try again.</p>}
      {!loadError && reports === null && <p className="report-meta">Loading…</p>}

      {reports?.length === 0 && (
        <div className="notice">
          <p>You haven't reported a beach yet. Next time you pass one, a single photo helps everyone see how it's doing.</p>
          <Link to="/report" className="btn btn-primary">
            Report a beach
          </Link>
        </div>
      )}

      {reports?.map((report) => (
        <div key={report.id} className="notice">
          <ReportDetail report={report} showStatus />
        </div>
      ))}
    </div>
  );
}
