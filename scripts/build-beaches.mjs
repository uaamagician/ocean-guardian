// Builds web/public/beaches.json: named beaches worldwide (Wikidata, CC0) plus
// Taiwan's named beaches from OpenStreetMap (ODbL), which Wikidata barely covers.
// Run: cd scripts && npm install && npm run build:beaches
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pinyin } from "pinyin-pro";

const CACHE = new URL("./.cache/", import.meta.url);
const OUT = new URL("../web/public/beaches.json", import.meta.url);
const UA = "OceanGuardian/0.1 (student project)";
const refresh = process.argv.includes("--refresh");

const WIKIDATA_QUERY = `SELECT ?item ?label ?desc ?coord ?countryLabel ?article WHERE {
  ?item wdt:P31 wd:Q40080; wdt:P625 ?coord.
  OPTIONAL { ?item rdfs:label ?label. FILTER(LANG(?label) = "en") }
  OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc) = "en") }
  OPTIONAL { ?item wdt:P17 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel) = "en") }
  OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
}`;

const OVERPASS_QUERY = `[out:json][timeout:120];
area["ISO3166-1"="TW"][admin_level=2]->.tw;
nwr["natural"="beach"]["name"](area.tw);
out center tags;`;

async function cached(file, load) {
  const path = new URL(file, CACHE);
  if (!refresh && existsSync(path)) return JSON.parse(await readFile(path, "utf8"));
  await mkdir(CACHE, { recursive: true });
  const data = await load();
  await writeFile(path, JSON.stringify(data));
  return data;
}

async function fetchJson(url, init) {
  const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init?.headers } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

const wikidata = () =>
  fetchJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(WIKIDATA_QUERY)}`, {
    headers: { Accept: "application/sparql-results+json" },
  });

const overpass = () =>
  fetchJson("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: OVERPASS_QUERY }),
  });

// Taiwan uses Hanyu Pinyin for place names: "白沙灣" -> "Baisha Bay".
const SUFFIXES = [
  ["海水浴場", "Beach"],
  ["海灘", "Beach"],
  ["沙灘", "Beach"],
  ["灣", "Bay"],
  ["公園", "Park"],
  ["海岸", "Coast"],
];

function romanize(name) {
  let base = name.replace(/\s+/g, "");
  const tail = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (const [zh, en] of SUFFIXES) {
      if (base.length > zh.length && base.endsWith(zh)) {
        tail.unshift(en);
        base = base.slice(0, -zh.length);
        changed = true;
        break;
      }
    }
  }
  const syllables = pinyin(base, { toneType: "none", type: "array" }).map((s) => s.replace(/ü/g, "u"));
  // Long names read better as two-syllable words ("Chaishan Yueshijie"); a
  // leftover single syllable joins the word before it.
  const words = [];
  for (let i = 0; i < syllables.length; i += 2) words.push(syllables.slice(i, i + 2).join(""));
  if (syllables.length % 2 === 1 && words.length > 1) words[words.length - 2] += words.pop();
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  return [...words.map(cap), ...tail].join(" ").trim() || name;
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const round = (n) => Math.round(n * 10000) / 10000;

const wd = await cached("wikidata.json", wikidata);
const osm = await cached("osm_tw.json", overpass);

const byItem = new Map();
for (const r of wd.results.bindings) {
  const id = r.item.value.split("/").pop();
  if (!r.label || byItem.has(id)) continue;
  const m = r.coord.value.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  if (!m) continue;
  byItem.set(id, {
    id,
    // Some labels use a full-width space (U+3000); keep names plain English.
    name: r.label.value.split(/\s+/).join(" "),
    local: null,
    lat: round(Number(m[2])),
    lng: round(Number(m[1])),
    country: r.countryLabel?.value ?? null,
    desc: r.desc?.value ?? null,
    wiki: r.article ? decodeURIComponent(r.article.value.split("/wiki/").pop()) : null,
  });
}
const beaches = [...byItem.values()];
const taiwanWikidata = beaches.filter((b) => b.country === "Taiwan");

let merged = 0;
for (const el of osm.elements) {
  const lat = el.center?.lat ?? el.lat;
  const lng = el.center?.lon ?? el.lon;
  if (lat == null) continue;
  const point = { lat: round(lat), lng: round(lng) };
  const twin = taiwanWikidata.find((b) => distanceKm(b, point) < 1.5);
  if (twin) {
    twin.local = el.tags.name;
    merged += 1;
    continue;
  }
  beaches.push({
    id: `osm-${el.type}-${el.id}`,
    name: el.tags["name:en"] ?? romanize(el.tags.name),
    local: el.tags.name,
    ...point,
    country: "Taiwan",
    desc: null,
    wiki: null,
  });
}

const countries = [...new Set(beaches.map((b) => b.country).filter(Boolean))].sort();
const countryIndex = new Map(countries.map((c, i) => [c, i]));

// Compact rows keep the file small: [id, name, local, lat, lng, country, desc, wiki]
const out = {
  generated: new Date().toISOString().slice(0, 10),
  sources: ["Wikidata (CC0)", "OpenStreetMap contributors (ODbL)"],
  countries,
  beaches: beaches.map((b) => [
    b.id,
    b.name,
    b.local,
    b.lat,
    b.lng,
    b.country ? countryIndex.get(b.country) : null,
    b.desc,
    b.wiki,
  ]),
};
await writeFile(OUT, JSON.stringify(out));
const twCount = beaches.filter((b) => b.country === "Taiwan").length;
console.log(`${beaches.length} beaches (${twCount} in Taiwan, ${merged} Taiwan OSM entries merged into Wikidata)`);
