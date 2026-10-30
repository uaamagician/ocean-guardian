// Where and when a photo was taken, read from its EXIF data. Phones often
// strip the location from photos picked out of the library, and screenshots
// or edited copies may carry neither, so both are hints: the reporter can
// override the place, and a report without a capture time is dated by upload.
export async function readPhotoExif(file) {
  const none = { spot: null, takenAt: null };
  try {
    const view = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (view.getUint16(0) !== 0xffd8) return none; // not a JPEG
    let at = 2;
    while (at + 10 < view.byteLength) {
      const marker = view.getUint16(at);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return none; // start of image data
      if (marker === 0xffe1 && view.getUint32(at + 4) === 0x45786966) return readTiff(view, at + 10);
      at += 2 + view.getUint16(at + 2);
    }
  } catch {
    // Truncated or malformed EXIF: treat it as missing.
  }
  return none;
}

function readTiff(view, tiff) {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o) => view.getUint16(tiff + o, little);
  const u32 = (o) => view.getUint32(tiff + o, little);
  const entry = (ifd, tag) => {
    const count = u16(ifd);
    for (let i = 0; i < count; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
    return null;
  };
  // ASCII values longer than four bytes live at an offset, shorter ones inline.
  const text = (ifd, tag) => {
    const e = entry(ifd, tag);
    if (e == null) return "";
    const length = u32(e + 4);
    const start = length > 4 ? u32(e + 8) : e + 8;
    let s = "";
    for (let i = 0; i < length; i++) {
      const c = view.getUint8(tiff + start + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const ifd0 = u32(4);
  return { spot: readGps(ifd0, entry, u32, text), takenAt: readTakenAt(ifd0, entry, u32, text) };
}

function readGps(ifd0, entry, u32, text) {
  const pointer = entry(ifd0, 0x8825);
  if (pointer == null) return null;
  const gps = u32(pointer + 8);
  // Degrees, minutes and seconds, each stored as a fraction.
  const degrees = (tag) => {
    const e = entry(gps, tag);
    if (e == null) return NaN;
    const values = u32(e + 8);
    const part = (k) => u32(values + k * 8) / u32(values + k * 8 + 4);
    return part(0) + part(1) / 60 + part(2) / 3600;
  };
  const lat = degrees(2) * (text(gps, 1) === "S" ? -1 : 1);
  const lng = degrees(4) * (text(gps, 3) === "W" ? -1 : 1);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null; // cameras without a fix write zeros
  return { lat, lng };
}

// DateTimeOriginal is the camera's local clock ("2023:03:14 09:30:00"); newer
// phones add the UTC offset alongside it. Without one, read it as local time.
function readTakenAt(ifd0, entry, u32, text) {
  const pointer = entry(ifd0, 0x8769);
  if (pointer == null) return null;
  const exif = u32(pointer + 8);
  const m = text(exif, 0x9003).match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
  if (!m) return null;
  const offset = text(exif, 0x9011).match(/^[+-]\d\d:\d\d$/)?.[0] ?? "";
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`);
  const t = date.getTime();
  // Cameras with an unset clock report 1970 or 2000; ignore anything implausible.
  if (!Number.isFinite(t) || date.getFullYear() < 2001 || t > Date.now() + 86400e3) return null;
  return date;
}
