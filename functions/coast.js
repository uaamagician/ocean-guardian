// How far a point is from the sea, measured to the Natural Earth 1:10m
// coastline (public domain, naturalearthdata.com). data/coastline.bin.gz holds
// it as little-endian int32s: the number of lines, then for each line its
// vertex count and lat/lng pairs in 1e-4 degrees. Lake shores are not in it.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const CELL = 0.5; // degrees per grid cell in the index
let index = null;

function load() {
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, "data", "coastline.bin.gz")));
  const ints = new Int32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  // Segments as [lat1, lng1, lat2, lng2] in degrees, bucketed by every cell their box touches.
  const segs = [];
  const cells = new Map();
  let i = 1;
  for (let line = 0; line < ints[0]; line += 1) {
    const n = ints[i++];
    for (let v = 0; v < n; v += 1, i += 2) {
      if (v === 0) continue;
      const s = [ints[i - 2] / 1e4, ints[i - 1] / 1e4, ints[i] / 1e4, ints[i + 1] / 1e4];
      const id = segs.push(s) - 1;
      const [la1, la2] = s[0] < s[2] ? [s[0], s[2]] : [s[2], s[0]];
      const [lo1, lo2] = s[1] < s[3] ? [s[1], s[3]] : [s[3], s[1]];
      for (let a = Math.floor(la1 / CELL); a <= Math.floor(la2 / CELL); a += 1) {
        for (let b = Math.floor(lo1 / CELL); b <= Math.floor(lo2 / CELL); b += 1) {
          const key = `${a},${b}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(id);
        }
      }
    }
  }
  return { segs, cells };
}

// Distance from p to segment s in km, on a flat projection around p (fine at
// the few-kilometre scale this is used for).
function segmentKm(p, s) {
  const kx = 111.32 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110.57;
  const ax = (s[1] - p.lng) * kx;
  const ay = (s[0] - p.lat) * ky;
  const bx = (s[3] - p.lng) * kx;
  const by = (s[2] - p.lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

// Kilometres to the nearest coast, or Infinity if none within about `maxKm`.
exports.coastKm = (p, maxKm = 30) => {
  index ??= load();
  const reach = Math.ceil(maxKm / 111 / CELL / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)));
  const a0 = Math.floor(p.lat / CELL);
  const b0 = Math.floor(p.lng / CELL);
  let best = Infinity;
  for (let a = a0 - reach; a <= a0 + reach; a += 1) {
    for (let b = b0 - reach; b <= b0 + reach; b += 1) {
      for (const id of index.cells.get(`${a},${b}`) ?? []) best = Math.min(best, segmentKm(p, index.segs[id]));
    }
  }
  return best;
};
