export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>Ocean Guardian is a Google Solution Challenge project for SDG 14, Life Below Water.</p>
        <p>
          Sea temperature: <a href="https://open-meteo.com/">Open-Meteo</a>. Coral bleaching:{" "}
          <a href="https://coralreefwatch.noaa.gov/">NOAA Coral Reef Watch</a>. Map:{" "}
          <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>. Hero photos: U.S. Fish and Wildlife
          Service, public domain, via Wikimedia Commons.
        </p>
      </div>
    </footer>
  );
}
