const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenAI } = require("@google/genai");

initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-flash-latest";
const CONFIDENCE_THRESHOLD = 0.5;

const PROMPTS = {
  trash: {
    categories: ["clean", "light", "moderate", "heavy", "not_beach"],
    instruction:
      "You are analyzing a citizen-submitted photo of a beach or coastline for a marine debris map. " +
      "Rate the overall debris level as one of: clean, light, moderate, heavy. " +
      "If the photo does not show a beach or coastline, use not_beach. " +
      "In labels, list the specific debris types you can see (e.g. plastic bottle, fishing net, styrofoam, cigarette butt). " +
      "confidence is your confidence in the category, from 0 to 1.",
  },
  coral: {
    categories: ["healthy", "partially_bleached", "severely_bleached", "dead", "not_coral"],
    instruction:
      "You are analyzing a citizen-submitted underwater photo of coral for a reef health map. " +
      "Rate the coral condition as one of: healthy, partially_bleached, severely_bleached, dead. " +
      "If the photo does not show coral, use not_coral. " +
      "In labels, list what you observe (e.g. coral types, algae cover, visible damage). " +
      "confidence is your confidence in the category, from 0 to 1.",
  },
};

const IRRELEVANT = new Set(["not_beach", "not_coral"]);

async function analyzeImage(apiKey, type, imageBytes, mimeType) {
  const { categories, instruction } = PROMPTS[type];
  // Gemini returns transient 429/503 under load; the SDK only retries when
  // retryOptions is set explicitly. ~2+4+8+16s of backoff fits the 120s timeout.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 5, initialDelay: 2, maxDelay: 20 } },
  });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBytes.toString("base64") } },
          { text: instruction },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          category: { type: "string", enum: categories },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          labels: { type: "array", items: { type: "string" } },
        },
        required: ["category", "confidence", "labels"],
      },
    },
  });

  const result = JSON.parse(response.text);
  if (!categories.includes(result.category)) {
    throw new Error(`Unexpected category from model: ${result.category}`);
  }
  return {
    category: result.category,
    confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0)),
    rawLabels: Array.isArray(result.labels) ? result.labels.map(String) : [],
  };
}

exports.analyzeReport = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "us-central1",
    secrets: [GEMINI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 120,
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
      const file = getStorage().bucket().file(report.photoPath);
      const [[metadata], [imageBytes]] = await Promise.all([file.getMetadata(), file.download()]);

      const analysis = await analyzeImage(
        GEMINI_API_KEY.value(),
        report.type,
        imageBytes,
        metadata.contentType,
      );

      const publishable =
        analysis.confidence >= CONFIDENCE_THRESHOLD && !IRRELEVANT.has(analysis.category);

      await snap.ref.update({
        aiAnalysis: { ...analysis, analyzedAt: FieldValue.serverTimestamp() },
        status: publishable ? "published" : "pending_review",
      });
      logger.info("Report analyzed", { reportId, ...analysis, publishable });
    } catch (err) {
      logger.error("Report analysis failed", { reportId, error: err.message });
      await snap.ref.update({ status: "pending_review", aiError: err.message });
    }
  },
);
