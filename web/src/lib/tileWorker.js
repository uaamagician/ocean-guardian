import { recolour } from "./tileRecolour";

// Fetches and recolours map tiles off the main thread, so zooming and panning
// stay smooth while new tiles come in. Replies with a finished bitmap, or with
// `failed` so the page can fall back to doing it itself.
self.onmessage = async ({ data: { id, url, size } }) => {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`Tile ${res.status}`);
    const image = await createImageBitmap(await res.blob());
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, size, size);
    image.close();
    const pixels = ctx.getImageData(0, 0, size, size);
    recolour(pixels.data);
    ctx.putImageData(pixels, 0, 0);
    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ id, bitmap }, [bitmap]);
  } catch {
    self.postMessage({ id, failed: true });
  }
};
