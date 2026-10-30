// Which stretch of coast a point is on. Taiwan, the site's home coast, is
// split into its coasts and island groups by rough position; anywhere else is
// grouped by country.
// Taiwan and its outlying islands, by a rough box around them.
export const isInTaiwan = (lat, lng) => lat > 21.7 && lat < 26.5 && lng > 118 && lng < 122.6;

export function coastOf(lat, lng, country) {
  if (country && country !== "Taiwan") return country;
  if (!isInTaiwan(lat, lng)) return country ?? "Elsewhere";
  if (lng < 119.9) return lat > 23.1 && lat < 23.9 ? "Penghu" : "Kinmen & Matsu";
  if (lng > 121.3 && lat < 22.8) return "Green & Orchid Islands";
  if (lat >= 24.95) return "North coast, Taiwan";
  if (lng >= 121) return "East coast, Taiwan";
  if (lat < 22.9) return "South coast, Taiwan";
  return "West coast, Taiwan";
}
