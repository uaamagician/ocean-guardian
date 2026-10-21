// Sends geotagged Wikimedia Commons photos of beach litter in as beach
// reports, through exactly the path a visitor's report takes: anonymous
// sign-in, photo upload, report document, then the analyzeReport function
// rates it with Gemini. Each photo goes at the place it was taken.
// Afterwards, add the report ids it prints to src/lib/commonsReports.js so the
// site credits the photographer and marks the report as a Commons photo.
//
// Usage: node scripts/upload-commons-reports.mjs picks.json results.json [first] [count]
//   picks.json: [{ file, lat, lng, title, artist, license, page }]
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";

const [picksPath, resultsPath, first = "0", count = "999"] = process.argv.slice(2);
const config = JSON.parse(readFileSync(new URL("../src/firebase-config.json", import.meta.url)));
const app = initializeApp(config);
const db = getFirestore(app);
const storage = getStorage(app);
const { user } = await signInAnonymously(getAuth(app));

const picks = JSON.parse(readFileSync(picksPath)).slice(Number(first), Number(first) + Number(count));
const results = [];
for (const p of picks) {
  const reportRef = doc(collection(db, "reports"));
  const path = `reports/${user.uid}/${reportRef.id}_0.jpg`;
  await uploadBytes(ref(storage, path), new Uint8Array(readFileSync(p.file)), { contentType: "image/jpeg" });
  await setDoc(reportRef, {
    type: "trash",
    photos: [path],
    location: { lat: p.lat, lng: p.lng },
    reporterId: user.uid,
    createdAt: serverTimestamp(),
    status: "processing",
  });
  // Wait for the AI to finish with it.
  let data;
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));
    data = (await getDoc(reportRef)).data();
    if (data.status !== "processing") break;
  }
  const result = {
    id: reportRef.id,
    status: data.status,
    category: data.aiAnalysis?.category ?? null,
    confidence: data.aiAnalysis?.confidence ?? null,
    items: data.aiAnalysis?.items ?? [],
    title: p.title,
    artist: p.artist,
    license: p.license,
    page: p.page,
  };
  results.push(result);
  console.log(`${result.status.padEnd(15)} ${String(result.category).padEnd(9)} ${result.id} ${p.title.slice(5, 60)}`);
}
const previous = (() => {
  try {
    return JSON.parse(readFileSync(resultsPath));
  } catch {
    return [];
  }
})();
writeFileSync(resultsPath, JSON.stringify(previous.concat(results), null, 1));
process.exit(0);
