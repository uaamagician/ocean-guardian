const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// TODO: analyzeReport — Gemini-based analysis of citizen photo reports
// (trash classification / coral bleaching severity), with a confidence
// threshold that marks low-confidence results as "pending review".
// Needs the Firestore report schema finalized before implementing.
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});
