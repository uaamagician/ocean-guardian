import L from "leaflet";
import { recolour } from "./tileRecolour";

// The beach maps show OpenStreetMap muted and warmed toward an old paper sea
// chart, so the condition markers carry the colour. That used to be a CSS
// filter, but Safari paints the tiles in their raw blue first and only applies
// a filter seconds later. Instead each tile is recoloured once, as it loads
// (see tileRecolour.js), so only the finished colour ever reaches the screen.

// One worker serves every muted tile layer on the page. Browsers without
// OffscreenCanvas in workers recolour on the main thread instead, as before.
let worker = null;
let nextId = 0;
const waiting = new Map();
function tileWorker() {
  if (worker !== null) return worker;
  try {
    if (typeof OffscreenCanvas === "undefined") throw new Error("No OffscreenCanvas");
    worker = new Worker(new URL("./tileWorker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      waiting.get(data.id)?.(data);
      waiting.delete(data.id);
    };
  } catch {
    worker = false;
  }
  return worker;
}

function recolourHere(url, tile, done) {
  const img = new Image();
  // OSM serves tiles with CORS, so their pixels can be read back.
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const ctx = tile.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, tile.width, tile.height);
    try {
      const data = ctx.getImageData(0, 0, tile.width, tile.height);
      recolour(data.data);
      ctx.putImageData(data, 0, 0);
    } catch {
      // Unreadable pixels: show the tile as it came rather than nothing.
    }
    done(null, tile);
  };
  img.onerror = (err) => done(err, tile);
  img.src = url;
}

export const MutedTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement("canvas");
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    tile.setAttribute("role", "presentation");
    const url = this.getTileUrl(coords);

    const w = tileWorker();
    if (!w) {
      recolourHere(url, tile, done);
      return tile;
    }
    const id = nextId++;
    waiting.set(id, ({ bitmap, failed }) => {
      if (failed) {
        recolourHere(url, tile, done);
        return;
      }
      tile.getContext("bitmaprenderer").transferFromImageBitmap(bitmap);
      done(null, tile);
    });
    w.postMessage({ id, url, size: size.x });
    return tile;
  },
});
