// Where a photo was taken, read from the GPS block of its EXIF data. Phones
// often strip this from photos picked out of the library, so it is a hint the
// reporter can confirm or override, never the only way to place a report.
export async function photoLocation(file) {
  try {
    const view = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG
    let at = 2;
    while (at + 10 < view.byteLength) {
      const marker = view.getUint16(at);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null; // start of image data
      if (marker === 0xffe1 && view.getUint32(at + 4) === 0x45786966) return readGps(view, at + 10);
      at += 2 + view.getUint16(at + 2);
    }
  } catch {
    // Truncated or malformed EXIF: treat it as no location.
  }
  return null;
}

function readGps(view, tiff) {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o) => view.getUint16(tiff + o, little);
  const u32 = (o) => view.getUint32(tiff + o, little);
  const entry = (ifd, tag) => {
    const count = u16(ifd);
    for (let i = 0; i < count; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
    return null;
  };

  const pointer = entry(u32(4), 0x8825);
  if (pointer == null) return null;
  const gps = u32(pointer + 8);
  const ref = (tag) => {
    const e = entry(gps, tag);
    return e == null ? "" : String.fromCharCode(view.getUint8(tiff + e + 8));
  };
  // Degrees, minutes and seconds, each stored as a fraction.
  const degrees = (tag) => {
    const e = entry(gps, tag);
    if (e == null) return NaN;
    const values = u32(e + 8);
    const part = (k) => u32(values + k * 8) / u32(values + k * 8 + 4);
    return part(0) + part(1) / 60 + part(2) / 3600;
  };

  const lat = degrees(2) * (ref(1) === "S" ? -1 : 1);
  const lng = degrees(4) * (ref(3) === "W" ? -1 : 1);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null; // cameras without a fix write zeros
  return { lat, lng };
}
