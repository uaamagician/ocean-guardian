import { useEffect, useState } from "react";
import { Link } from "react-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { currentUser } from "../lib/reports";
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
        (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
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
        <h1>我的回報</h1>
        <p className="page-intro">這台裝置送出的回報都在這裡，包含還在分析和等待人工確認的。</p>
      </div>

      {loadError && <p className="error-text">回報載入失敗，請重新整理頁面。</p>}
      {!loadError && reports === null && <p className="report-meta">載入中…</p>}

      {reports?.length === 0 && (
        <div className="notice">
          <p>你還沒有回報過。下次經過海灘，拍一張就能幫大家更新現況。</p>
          <Link to="/report" className="btn btn-primary">
            回報海灘現況
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
