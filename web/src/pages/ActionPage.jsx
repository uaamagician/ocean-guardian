import { Link } from "react-router";

export default function ActionPage() {
  return (
    <div className="page">
      <div className="section">
        <h1>Beach cleanups</h1>
        <p className="page-intro">
          Once a beach has enough reports, AI estimates the crew size, time, and tools a cleanup needs, so clubs, companies, and schools can head out together.
        </p>
      </div>

      <section className="notice">
        <h2>Upcoming cleanups</h2>
        <p>No cleanups scheduled yet. Event sign-up is in development.</p>
      </section>

      <section className="notice">
        <h2>Beaches that need more reports</h2>
        <p>The AI needs several reports from the same beach to size up a cleanup. If there's a beach you visit often, you can add the first one.</p>
        <Link to="/report" className="btn btn-primary">
          Report a beach
        </Link>
      </section>
    </div>
  );
}
