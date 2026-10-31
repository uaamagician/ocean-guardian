// Recolours a map tile's pixels: OpenStreetMap muted and warmed toward an old
// paper sea chart. Used by mutedTiles.js and, off the main thread, tileWorker.js.
//
// The colours match the CSS filter it replaces exactly:
//   saturate(0.4) sepia(0.22) brightness(1.03) contrast(0.92)
// Each step is the matrix or formula from the Filter Effects spec, applied in
// sRGB and clamped between steps, as browsers do.

const SATURATE = 0.4;
const SEPIA = 0.22;
const BRIGHTNESS = 1.03;
const CONTRAST = 0.92;

function multiply(a, b) {
  return a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
}

const s = SATURATE;
const saturate = [
  [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
];
const k = 1 - SEPIA;
const sepia = [
  [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k],
  [0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k],
  [0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k],
];
// saturate runs first, so it is applied to the pixel before sepia.
const [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]] = multiply(sepia, saturate);

// brightness then contrast act on each channel alone: a 256-entry table.
const TONE = new Uint8ClampedArray(256);
for (let v = 0; v < 256; v += 1) {
  const bright = Math.min(255, v * BRIGHTNESS);
  TONE[v] = bright * CONTRAST + 127.5 * (1 - CONTRAST);
}
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function recolour(px) {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    px[i] = TONE[clamp(m00 * r + m01 * g + m02 * b)];
    px[i + 1] = TONE[clamp(m10 * r + m11 * g + m12 * b)];
    px[i + 2] = TONE[clamp(m20 * r + m21 * g + m22 * b)];
  }
}

