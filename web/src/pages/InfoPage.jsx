import { Link } from "react-router";
import LiveOcean from "../components/LiveOcean";
import { BLEACHING_LEVELS } from "../lib/ocean";
import "./Home.css";
import "./InfoPage.css";

const LEVEL_MEANING = [
  "Water temperature is normal. No heat stress.",
  "Warmer than coral tolerates, but no damage has built up yet.",
  "Heat stress is building. Scattered bleaching is possible.",
  "4 °C-weeks of heat stress or more. Significant bleaching is likely.",
  "8 °C-weeks or more. Widespread bleaching and some coral death are likely.",
];

const SOURCES = [
  {
    name: "Open-Meteo Marine",
    href: "https://open-meteo.com/en/docs/marine-weather-api",
    what: "Sea temperature, waves and tides",
    when: "Hourly",
  },
  {
    name: "Open-Meteo Forecast",
    href: "https://open-meteo.com/en/docs",
    what: "Weather, wind and UV on cleanup days",
    when: "Hourly, up to 16 days ahead",
  },
  {
    name: "NOAA Coral Reef Watch",
    href: "https://coralreefwatch.noaa.gov/",
    what: "Coral bleaching heat stress (5 km satellite data)",
    when: "Daily",
  },
  {
    name: "Wikidata and OpenStreetMap",
    href: "https://www.wikidata.org/",
    what: "The list of 15,000+ named beaches",
    when: "Rebuilt with each release",
  },
  {
    name: "Wikipedia",
    href: "https://en.wikipedia.org/",
    what: "Short beach descriptions",
    when: "When you open a beach",
  },
  {
    name: "Ocean Guardian reports",
    href: "/map",
    what: "Debris levels and items, analyzed by Gemini from your photos",
    when: "As reports come in",
  },
];

export default function InfoPage() {
  return (
    <div className="info-page">
      <header className="info-header">
        <div className="info-header-inner">
          <h1>Ocean data</h1>
          <p>Live conditions around Taiwan, how to read a coral bleaching alert, and where every number on this site comes from.</p>
          <nav className="info-toc" aria-label="On this page">
            <a href="#conditions">Sea temperature</a>
            <a href="#bleaching">Bleaching alerts</a>
            <a href="#background">Background</a>
            <a href="#sources">Data sources</a>
          </nav>
        </div>
      </header>

      <div id="conditions">
        <LiveOcean title="Sea temperature around Taiwan" />
      </div>

      <section className="info-section" id="bleaching">
        <h2>Reading a bleaching alert</h2>
        <p className="info-lead">
          Coral gets its color and most of its food from algae living inside it. When the water stays too warm, the
          algae leave and the coral turns white. If the heat lasts, the coral starves.
        </p>
        <table className="sketch-table">
          <thead>
            <tr>
              <th scope="col">Alert level</th>
              <th scope="col">What it means</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_MEANING.map((meaning, level) => (
              <tr key={BLEACHING_LEVELS[level].label}>
                <th scope="row">
                  <span className="level">
                    <span className="level-dot" data-tone={BLEACHING_LEVELS[level].tone} />
                    {BLEACHING_LEVELS[level].label}
                  </span>
                </th>
                <td>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="report-meta">
          Heat stress is counted in degree heating weeks (°C-weeks): how far the water rose above what coral tolerates,
          times how many weeks it stayed there, over the past 12 weeks. Levels are defined by NOAA Coral Reef Watch.
        </p>
      </section>

      <section className="info-section" id="background">
        <h2>Background</h2>
        <div className="info-facts">
          <article>
            <h3>The ocean takes most of the heat</h3>
            <p>
              The ocean has absorbed more than 90% of the extra heat trapped by greenhouse gases, which means warmer
              water and more frequent coral bleaching.
            </p>
            <small>Source: IPCC Sixth Assessment Report</small>
          </article>
          <article>
            <h3>Most beach debris starts on land</h3>
            <p>
              Plastic reaches the coast through rivers, storm drains and activity along the shore. Every single-use item
              skipped is one less for the tide to bring back.
            </p>
            <Link to="/report" className="btn btn-small" viewTransition>
              Report a beach
            </Link>
          </article>
        </div>
      </section>

      <section className="info-section" id="sources">
        <h2>Data sources</h2>
        <table className="sketch-table">
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Used for</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.name}>
                <th scope="row">
                  {s.href.startsWith("/") ? <Link to={s.href}>{s.name}</Link> : <a href={s.href}>{s.name}</a>}
                </th>
                <td>{s.what}</td>
                <td>{s.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
