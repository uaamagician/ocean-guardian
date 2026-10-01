import { Link } from "react-router";

export default function ActionPage() {
  return (
    <div className="page">
      <div className="section">
        <h1>淨灘行動</h1>
        <p className="page-intro">
          同一片海灘累積足夠的回報後，AI 會估算需要多少人、多少時間、要帶哪些工具，讓社團、企業和學校可以直接揪團出發。
        </p>
      </div>

      <section className="notice">
        <h2>近期淨灘活動</h2>
        <p>目前還沒有淨灘活動。活動報名功能開發中。</p>
      </section>

      <section className="notice">
        <h2>還沒有足夠回報的海灘</h2>
        <p>AI 需要同一片海灘的多筆回報才能估算淨灘規模。你常去的海灘，也可以由你來補上第一筆。</p>
        <Link to="/report" className="btn btn-primary">
          回報海灘現況
        </Link>
      </section>
    </div>
  );
}
