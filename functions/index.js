const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();

const { GEMINI_API_KEY, makeAi, generateWithFallback, downloadPhoto, inlinePhoto } = require("./gemini");
const { nearestBeachKm } = require("./beachCheck");
const { coastKm } = require("./coast");

const CONFIDENCE_THRESHOLD = 0.5;
// Reports further than this from every beach on the map wait for a person to
// look at them instead of going live: a pin dropped at home, or a beach that
// still needs adding. Matches BEACH_RADIUS_KM on the site.
const BEACH_RADIUS_KM = 3;
// A beach someone adds must be on the sea. The coastline data is simplified,
// a kilometre or two off in places, so this leaves room for that.
const COAST_KM = 3;

const round1 = (km) => Math.round(km * 10) / 10;

// Whether a spot is on a beach: near a listed one (lake beaches included), or
// near one people added that is itself by the sea.
async function beachCheck(location) {
  const km = await nearestBeachKm(getFirestore(), location);
  if (km.listed <= BEACH_RADIUS_KM) return { onBeach: true, km: km.listed };
  const coast = coastKm(location);
  if (km.added <= BEACH_RADIUS_KM && coast <= COAST_KM) return { onBeach: true, km: km.added };
  return {
    onBeach: false,
    reason: km.added <= BEACH_RADIUS_KM ? "inland" : "far_from_beach",
    km: Math.min(km.listed, km.added),
    coast,
  };
}

const SHARED_RULES =
  "Write items and uncertainItems in English, using short lowercase common names. " +
  "All photos come from the same report at the same place, possibly taken from different distances and angles; " +
  "combine them into one assessment and do not double-count an item that appears in several photos. " +
  "Only list items you can clearly identify. If something might be an item but you cannot tell for sure " +
  "(too far, blurry, partly hidden), put it in uncertainItems instead, describing where it is; " +
  'when there are several photos, say which one as "photo N". ' +
  "If a closer or wider photo would let you resolve uncertain items or rate the area more reliably, " +
  "set retakeSuggestion to one short instruction for the reporter, in plain English, " +
  'e.g. "Take a closer photo of the green clump on the left, from about 1-2 m away."; otherwise set it to null. ' +
  "confidence is your confidence in the category, from 0 to 1; lower it when important items are uncertain.";

const PROMPTS = {
  trash: {
    categories: ["clean", "light", "moderate", "heavy", "not_beach"],
    instruction:
      "You are analyzing citizen-submitted photos of a beach or coastline for a marine debris map. " +
      "Rate the overall man-made debris level as one of: clean, light, moderate, heavy. " +
      "If the photos do not show a beach or coastline, use not_beach. " +
      "In items, list only man-made debris (e.g. plastic bottle, fishing net, rope, styrofoam, cigarette butt). " +
      "Natural material is NOT debris: never list vegetation, seaweed, driftwood, shells, rocks or footprints. " +
      SHARED_RULES,
  },
};

const IRRELEVANT = new Set(["not_beach"]);

async function analyzePhotos(type, photos) {
  const { categories, instruction } = PROMPTS[type];
  const parts = photos.flatMap((photo, i) => [{ text: `Photo ${i + 1}:` }, inlinePhoto(photo)]);
  parts.push({ text: instruction });

  const { response } = await generateWithFallback(makeAi(), {
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          category: { type: "string", enum: categories },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          items: { type: "array", items: { type: "string" } },
          uncertainItems: { type: "array", items: { type: "string" } },
          retakeSuggestion: { type: ["string", "null"] },
        },
        required: ["category", "confidence", "items", "uncertainItems", "retakeSuggestion"],
      },
    },
  });

  const result = JSON.parse(response.text);
  if (!categories.includes(result.category)) {
    throw new Error(`Unexpected category from model: ${result.category}`);
  }
  const strings = (v) => (Array.isArray(v) ? v.map(String) : []);
  return {
    category: result.category,
    confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0)),
    items: strings(result.items),
    uncertainItems: strings(result.uncertainItems),
    retakeSuggestion: result.retakeSuggestion ? String(result.retakeSuggestion) : null,
  };
}

exports.analyzeReport = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "us-central1",
    secrets: [GEMINI_API_KEY],
    memory: "1GiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const report = snap.data();
    const reportId = event.params.reportId;

    // Triggers can be delivered more than once; only analyze fresh reports.
    if (report.status !== "processing") return;

    try {
      if (!PROMPTS[report.type]) {
        throw new Error(`Unknown report type: ${report.type}`);
      }
      const photos = await Promise.all(report.photos.map(downloadPhoto));
      const analysis = await analyzePhotos(report.type, photos);

      // If the beach list can't be loaded, don't hold the report back over it.
      const place = await beachCheck(report.location).catch((err) => {
        logger.warn("Beach check skipped", { reportId, error: err.message });
        return { onBeach: true };
      });
      const farFromBeach = !place.onBeach;

      const publishable =
        analysis.confidence >= CONFIDENCE_THRESHOLD && !IRRELEVANT.has(analysis.category) && !farFromBeach;

      await snap.ref.update({
        aiAnalysis: { ...analysis, analyzedAt: FieldValue.serverTimestamp() },
        status: publishable ? "published" : "pending_review",
        ...(farFromBeach && { reviewReason: place.reason, nearestBeachKm: round1(place.km) }),
      });
      logger.info("Report analyzed", { reportId, photoCount: photos.length, ...analysis, place, publishable });
    } catch (err) {
      logger.error("Report analysis failed", { reportId, error: err.message });
      await snap.ref.update({ status: "pending_review", aiError: err.message });
    }
  },
);

// A beach people add has to be by the sea or next to a listed beach; one
// that isn't stays in the database but is hidden from the map.
function beachSpot(location) {
  return nearestBeachKm(getFirestore(), location).then(({ listed }) => {
    const coast = coastKm(location);
    return { ok: coast <= COAST_KM || listed <= BEACH_RADIUS_KM, coastKm: coast };
  });
}

exports.screenBeach = onDocumentCreated({ document: "beaches/{beachId}", region: "us-central1" }, async (event) => {
  const snap = event.data;
  const location = snap?.get("location");
  if (!location) return;
  const spot = await beachSpot(location);
  if (spot.ok) return;
  await snap.ref.update({ hidden: true, reviewReason: "inland", coastKm: Number.isFinite(spot.coastKm) ? round1(spot.coastKm) : null });
  logger.info("Added beach hidden as inland", { beachId: event.params.beachId, coastKm: spot.coastKm });
});

// The add-a-beach form asks first, so it can explain instead of saving a beach
// that would only be hidden.
exports.checkBeachSpot = onCall({ region: "us-central1" }, async (request) => {
  const { lat, lng } = request.data ?? {};
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new HttpsError("invalid-argument", "lat and lng must be numbers");
  }
  const spot = await beachSpot({ lat, lng });
  return { ok: spot.ok, coastKm: Number.isFinite(spot.coastKm) ? round1(spot.coastKm) : null };
});

exports.planCleanup = require("./planCleanup").planCleanup;
