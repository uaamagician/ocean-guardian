const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenAI } = require("@google/genai");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

// Gemini returns transient 429/503 under load; the SDK only retries when
// retryOptions is set explicitly. Someone waiting on screen wants fewer
// attempts and a quick switch to the fallback model.
function makeAi({ attempts = 4 } = {}) {
  return new GoogleGenAI({
    apiKey: GEMINI_API_KEY.value(),
    httpOptions: { retryOptions: { attempts, initialDelay: 2, maxDelay: 10 } },
  });
}

// Retries alone weren't enough: Flash stayed at 503 through a full minute of
// backoff, so fall back to Flash-Lite, which has separate capacity.
async function generateWithFallback(ai, request) {
  for (const [i, model] of GEMINI_MODELS.entries()) {
    try {
      const response = await ai.models.generateContent({ ...request, model });
      return { response, model };
    } catch (err) {
      const overloaded = err.status === 429 || err.status === 503;
      if (!overloaded || i === GEMINI_MODELS.length - 1) throw err;
      logger.warn("Gemini model overloaded, falling back", { model, status: err.status });
    }
  }
}

async function downloadPhoto(path) {
  const file = getStorage().bucket().file(path);
  const [[metadata], [bytes]] = await Promise.all([file.getMetadata(), file.download()]);
  return { mimeType: metadata.contentType, bytes };
}

const inlinePhoto = (photo) => ({
  inlineData: { mimeType: photo.mimeType, data: photo.bytes.toString("base64") },
});

module.exports = { GEMINI_API_KEY, makeAi, generateWithFallback, downloadPhoto, inlinePhoto };
