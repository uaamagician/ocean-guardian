import { Doodle } from "./Sketch";

export default function Footer() {
  return (
    <footer className="footer wave-edge">
      <span className="footer-sea" aria-hidden="true">
        <span className="footer-fish">
          <Doodle name="fish" boil={false} />
        </span>
      </span>
      <div className="footer-inner">
        <div>
          <p className="footer-sign">Ocean Guardian</p>
          <p>A Google Solution Challenge project for SDG 14, Life Below Water.</p>
        </div>
        <p>
          Sea temperature: <a href="https://open-meteo.com/">Open-Meteo</a>. Coral bleaching:{" "}
          <a href="https://coralreefwatch.noaa.gov/">NOAA Coral Reef Watch</a>. Map tiles: Esri. Beaches:{" "}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> and Wikidata. Photos via Wikimedia Commons, credited
          where they appear.
        </p>
      </div>
    </footer>
  );
}
