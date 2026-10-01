const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenAI } = require("@google/genai");

initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const CONFIDENCE_THRESHOLD = 0.5;

const SHARED_RULES =
  "Write items and uncertainItems in Traditional Chinese (Taiwan), using short common names. " +
  "All photos come from the same report at the same place, possibly taken from different distances and angles; " +
  "combine them into one assessment and do not double-count an item that appears in several photos. " +
  "Only list items you can clearly identify. If something might be an item but you cannot tell for sure " +
  "(too far, blurry, partly hidden), put it in uncertainItems instead, describing where it is; " +
  'when there are several photos, say which one as "第 N 張" (never "Photo N"). ' +
  "If a closer or wider photo would let you resolve uncertain items or rate the area more reliably, " +
  "set retakeSuggestion to one short instruction for the reporter, written in Traditional Chinese (Taiwan), " +
  'e.g. "左側沙灘上有一團綠色物體看不清楚，請靠近 1-2 公尺拍一張"; otherwise set it to null. ' +
  "confidence is your confidence in the category, from 0 to 1; lower it when important items are uncertain.";

const PROMPTS = {
  trash: {
    categories: ["clean", "light", "moderate", "heavy", "not_beach"],
    instruction:
      "You are analyzing citizen-submitted photos of a beach or coastline for a marine debris map. " +
      "Rate the overall man-made debris level as one of: clean, light, moderate, heavy. " +
      "If the photos do not show a beach or coastline, use not_beach. " +
      "In items, list only man-made debris (e.g. 寶特瓶, 漁網, 繩索, 保麗龍, 菸蒂). " +
      "Natural material is NOT debris: never list vegetation, seaweed, driftwood, shells, rocks or footprints. " +
      SHARED_RULES,
  },
  coral: {
    categories: ["healthy", "partially_bleached", "severely_bleached", "dead", "not_coral"],
    instruction:
      "You are analyzing citizen-submitted underwater photos of coral for a reef health map. " +
      "Rate the coral condition as one of: healthy, partially_bleached, severely_bleached, dead. " +
      "If the photos do not show coral, use not_coral. " +
      "In items, list what you observe about the reef (e.g. 軸孔珊瑚, 白化區塊, 藻類覆蓋, 斷裂). " +
      SHARED_RULES,
  },
};

const IRRELEVANT = new Set(["not_beach", "not_coral"]);

// Retries alone weren't enough: Flash stayed at 503 through a full minute of
// backoff, so fall back to Flash-Lite, which has separate capacity.
async function generateWithFallback(ai, request) {
  for (const [i, model] of GEMINI_MODELS.entries()) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (err) {
      const overloaded = err.status === 429 || err.status === 503;
      if (!overloaded || i === GEMINI_MODELS.length - 1) throw err;
      logger.warn("Gemini model overloaded, falling back", { model, status: err.status });
    }
  }
}

async function analyzePhotos(apiKey, type, photos) {
  const { categories, instruction } = PROMPTS[type];
  // Gemini returns transient 429/503 under load; the SDK only retries when
  // retryOptions is set explicitly.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 4, initialDelay: 2, maxDelay: 10 } },
  });

  const parts = photos.flatMap((photo, i) => [
    { text: `第 ${i + 1} 張照片:` },
    { inlineData: { mimeType: photo.mimeType, data: photo.bytes.toString("base64") } },
  ]);
  parts.push({ text: instruction });

  const response = await generateWithFallback(ai, {
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
      const bucket = getStorage().bucket();
      const photos = await Promise.all(
        report.photos.map(async (path) => {
          const file = bucket.file(path);
          const [[metadata], [bytes]] = await Promise.all([file.getMetadata(), file.download()]);
          return { mimeType: metadata.contentType, bytes };
        }),
      );

      const analysis = await analyzePhotos(GEMINI_API_KEY.value(), report.type, photos);

      const publishable =
        analysis.confidence >= CONFIDENCE_THRESHOLD && !IRRELEVANT.has(analysis.category);

      await snap.ref.update({
        aiAnalysis: { ...analysis, analyzedAt: FieldValue.serverTimestamp() },
        status: publishable ? "published" : "pending_review",
      });
      logger.info("Report analyzed", { reportId, photoCount: photos.length, ...analysis, publishable });
    } catch (err) {
      logger.error("Report analysis failed", { reportId, error: err.message });
      await snap.ref.update({ status: "pending_review", aiError: err.message });
    }
  },
);
