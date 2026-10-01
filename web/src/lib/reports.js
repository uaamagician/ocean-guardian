import { signInAnonymously } from "firebase/auth";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";

// Must match firestore.rules / storage.rules.
export const MAX_PHOTOS = 4;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2048;

export async function currentUser() {
  await auth.authStateReady();
  return auth.currentUser;
}

export async function ensureSignedIn() {
  const user = await currentUser();
  if (user) return user;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
      "image/jpeg",
      quality,
    );
  });
}

// Phone photos are often 4-8MB; storage rules cap each photo at 3MB.
export async function resizePhoto(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`「${file.name}」這個格式無法讀取，請改用 JPG 或 PNG。`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size < MAX_BYTES) return blob;
  }
  throw new Error(`「${file.name}」壓縮後仍超過 3MB，請換一張照片。`);
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("這個瀏覽器不支援定位，請換用手機瀏覽器回報。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "定位權限被關閉了。請到瀏覽器設定允許這個網站使用位置，再按「重新定位」。"
              : "暫時抓不到位置，請到空曠處再按「重新定位」。",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

// Upload photos first, then create the doc; creating it triggers analyzeReport.
export async function submitReport({ type, photos, location, onProgress }) {
  const user = await ensureSignedIn();
  const reportRef = doc(collection(db, "reports"));

  let uploaded = 0;
  const paths = await Promise.all(
    photos.map(async (blob, i) => {
      const path = `reports/${user.uid}/${reportRef.id}_${i}.jpg`;
      await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      uploaded += 1;
      onProgress?.(uploaded, photos.length);
      return path;
    }),
  );

  await setDoc(reportRef, {
    type,
    photos: paths,
    location: { lat: location.lat, lng: location.lng },
    reporterId: user.uid,
    createdAt: serverTimestamp(),
    status: "processing",
  });
  return reportRef.id;
}
