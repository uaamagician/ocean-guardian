import { useDeferredValue, useId, useMemo, useState } from "react";
import { MapPin, Search, Waves, X } from "lucide-react";
import { isEnglish } from "../lib/english";

const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Beach names are searched locally: startsWith beats word-start beats contains.
function searchBeaches(beaches, term) {
  const q = fold(term.trim());
  if (q.length < 2 || !beaches) return [];
  const scored = [];
  for (const b of beaches) {
    const names = [fold(b.name), b.local ? fold(b.local) : ""];
    let score = 0;
    for (const n of names) {
      if (n.startsWith(q)) score = Math.max(score, 3);
      else if (n.includes(` ${q}`)) score = Math.max(score, 2);
      else if (n.includes(q)) score = Math.max(score, 1);
    }
    if (score) scored.push([score, b]);
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length)
    .slice(0, 8)
    .map(([, b]) => b);
}

// Nominatim's usage policy rules out search-as-you-type, so places are only
// looked up when the person asks (Enter or the "Search places" row).
async function searchPlaces(term) {
  const params = new URLSearchParams({ q: term, format: "jsonv2", limit: "5", "accept-language": "en" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  // Places without an English name still come back in the local script;
  // keep only the parts of the address written in English.
  return (await res.json())
    .map((p) => {
      const parts = p.display_name.split(",").map((x) => x.trim()).filter(isEnglish);
      const name = isEnglish(p.name) && p.name ? p.name : parts[0];
      return {
        id: `place-${p.place_id}`,
        name,
        detail: parts.join(", "),
        lat: Number(p.lat),
        lng: Number(p.lon),
      };
    })
    .filter((p) => p.name);
}

export default function MapSearch({ beaches, onBeach, onPlace }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [places, setPlaces] = useState({ term: "", items: null, loading: false, error: false });
  const listId = useId();

  // Filtering 15k names on every keystroke is cheap, but defer it so typing never stutters.
  const deferred = useDeferredValue(term);
  const beachHits = useMemo(() => searchBeaches(beaches, deferred), [beaches, deferred]);
  const placeHits = places.term === term ? places.items : null;

  const rows = [
    ...beachHits.map((b) => ({ type: "beach", item: b })),
    ...(placeHits ?? []).map((p) => ({ type: "place", item: p })),
    ...(term.trim().length >= 2 && !placeHits ? [{ type: "lookup" }] : []),
  ];

  const lookupPlaces = async () => {
    const q = term.trim();
    if (q.length < 2) return;
    setPlaces({ term, items: null, loading: true, error: false });
    try {
      setPlaces({ term, items: await searchPlaces(q), loading: false, error: false });
    } catch {
      setPlaces({ term, items: [], loading: false, error: true });
    }
  };

  const choose = (row) => {
    if (!row) return;
    if (row.type === "lookup") {
      lookupPlaces();
      return;
    }
    setOpen(false);
    setTerm(row.item.name);
    if (row.type === "beach") onBeach(row.item);
    else onPlace(row.item);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // With no beach match, Enter goes straight to a place search.
      choose(beachHits.length === 0 && !placeHits ? { type: "lookup" } : rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && term.trim().length >= 2;

  return (
    <div className="map-search">
      <div className="map-search-box">
        <Search aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && rows[active] ? `${listId}-${active}` : undefined}
          placeholder="Search beaches or places"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
        {term && (
          <button
            type="button"
            className="map-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
          >
            <X />
          </button>
        )}
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="map-search-list">
          {rows.map((row, i) => (
            <li
              key={row.type === "lookup" ? "lookup" : row.item.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "is-active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(row)}
            >
              {row.type === "beach" && (
                <>
                  <Waves aria-hidden="true" />
                  <span>
                    <strong>{row.item.name}</strong>
                    <small>{row.item.country || "Added by users"}</small>
                  </span>
                </>
              )}
              {row.type === "place" && (
                <>
                  <MapPin aria-hidden="true" />
                  <span>
                    <strong>{row.item.name}</strong>
                    <small>{row.item.detail}</small>
                  </span>
                </>
              )}
              {row.type === "lookup" && (
                <>
                  <Search aria-hidden="true" />
                  <span>
                    <strong>{places.loading ? "Searching places…" : `Search places for “${term.trim()}”`}</strong>
                    <small>Towns, harbors and coastlines from OpenStreetMap</small>
                  </span>
                </>
              )}
            </li>
          ))}
          {placeHits?.length === 0 && (
            <li className="map-search-empty">
              {places.error ? "Place search is unavailable right now." : "No places found."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
