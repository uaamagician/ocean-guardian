const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GEMINI_API_KEY, makeAi, generateWithFallback, downloadPhoto, inlinePhoto } = require("./gemini");

// Must match the tool ids in web/src/lib/guide.js, which the plan links to.
const TOOLS = [
  "gloves",
  "pickers",
  "bags",
  "buckets",
  "sieves",
  "netCutters",
  "shovels",
  "carts",
  "sharpsContainer",
  "scale",
  "firstAid",
  "sunWater",
  "boots",
];
const SEVERITIES = ["clean", "light", "moderate", "heavy"];

// Bump when the plan's shape changes so stored plans are regenerated once.
const PLAN_VERSION = 2;
const MIN_REPORTS = 2;
const RADIUS_KM = 3;
const PHOTO_REPORTS = 3;

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function validate(data) {
  const { beachId, name, lat, lng } = data ?? {};
  const ok =
    typeof beachId === "string" &&
    /^[A-Za-z0-9_-]{1,100}$/.test(beachId) &&
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 120 &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180;
  if (!ok) throw new HttpsError("invalid-argument", "beachId, name, lat and lng are required.");
  return { beachId, name, location: { lat, lng } };
}

// Turns every report near the beach into compact text the model can weigh.
function summarize(reports) {
  const levels = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  const items = new Map();
  const uncertain = [];
  for (const r of reports) {
    const a = r.aiAnalysis ?? {};
    if (a.category in levels) levels[a.category] += 1;
    for (const item of new Set(a.items ?? [])) items.set(item, (items.get(item) ?? 0) + 1);
    uncertain.push(...(a.uncertainItems ?? []));
  }
  const dates = reports.map((r) => (r.takenAt ?? r.createdAt).toDate());
  return [
    `${reports.length} reports between ${dates.at(-1).toISOString().slice(0, 10)} and ${dates[0].toISOString().slice(0, 10)}.`,
    `Debris level per report (newest first): ${reports.map((r) => r.aiAnalysis?.category).join(", ")}.`,
    `Level counts: ${SEVERITIES.map((s) => `${s} ${levels[s]}`).join(", ")}.`,
    `Items identified (number of reports that mention each): ${
      [...items.entries()].map(([k, v]) => `${k} ×${v}`).join(", ") || "none"
    }.`,
    uncertain.length ? `Unclear items: ${uncertain.slice(0, 10).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const INSTRUCTION = `You plan volunteer beach cleanups. Using the citizen reports summarized above and the most
recent photos, estimate what a one-session cleanup of this beach needs.
- severity: overall debris level now (clean, light, moderate, heavy). Weigh recent reports more.
- volunteers: realistic min and max people for a cleanup of about 2 hours or less.
- hours: expected duration in hours (0.5 to 6).
- bags: estimated number of full 60-litre bags of debris (min and max).
- gear: tools to bring, chosen ONLY from the allowed ids. For each, a quantity phrase (e.g. "1 per person",
  "2 to 3") and a short reason tied to what was reported. Always include gloves, bags and firstAid.
  Include sieves only for small fragments or pellets, netCutters only for nets or rope, sharpsContainer only
  for glass, needles or sharp metal, carts or shovels only when loads are heavy or items are buried.
- heavyMachinery: needed only for items people can't safely carry (tires, drums, large nets, furniture).
- hazards: concrete risks from the reports (sharp glass, tangled nets, slippery rocks), at most 4.
- teams: split the crew into 1 to 4 teams for the work order. Each has a short name, a number of people,
  and one sentence describing its task (e.g. tideline sweep, net removal, sorting and weighing). The people
  in all teams should add up to roughly volunteers.max.
- tips: at most 3 short practical tips (timing, sorting for recycling, where to start).
- summary: one or two plain sentences for organizers.
- confidence: 0 to 1, lower when reports are few, old or disagree.
If the beach is clean, say so: few volunteers, short time, no heavy machinery.
Write in plain English.`;

const SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: SEVERITIES },
    volunteers: {
      type: "object",
      properties: { min: { type: "integer" }, max: { type: "integer" } },
      required: ["min", "max"],
    },
    hours: { type: "number" },
    bags: {
      type: "object",
      properties: { min: { type: "integer" }, max: { type: "integer" } },
      required: ["min", "max"],
    },
    gear: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tool: { type: "string", enum: TOOLS },
          quantity: { type: "string" },
          reason: { type: "string" },
        },
        required: ["tool", "quantity", "reason"],
      },
    },
    heavyMachinery: {
      type: "object",
      properties: { needed: { type: "boolean" }, reason: { type: ["string", "null"] } },
      required: ["needed", "reason"],
    },
    hazards: { type: "array", items: { type: "string" } },
    teams: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, people: { type: "integer" }, task: { type: "string" } },
        required: ["name", "people", "task"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    confidence: { type: "number" },
  },
  required: [
    "severity",
    "volunteers",
    "hours",
    "bags",
    "gear",
    "heavyMachinery",
    "hazards",
    "teams",
    "tips",
    "summary",
    "confidence",
  ],
};

const clampInt = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)));

// The model's numbers are sanity-checked rather than trusted as-is.
function clean(plan) {
  const range = (r, lo, hi) => {
    const min = clampInt(r?.min, lo, hi);
    return { min, max: Math.max(min, clampInt(r?.max, lo, hi)) };
  };
  const seen = new Set();
  return {
    severity: SEVERITIES.includes(plan.severity) ? plan.severity : "light",
    volunteers: range(plan.volunteers, 1, 500),
    hours: Math.min(6, Math.max(0.5, Math.round((Number(plan.hours) || 1) * 2) / 2)),
    bags: range(plan.bags, 0, 2000),
    gear: (plan.gear ?? [])
      .filter((g) => TOOLS.includes(g.tool) && !seen.has(g.tool) && seen.add(g.tool))
      .map((g) => ({ tool: g.tool, quantity: String(g.quantity ?? ""), reason: String(g.reason ?? "") })),
    heavyMachinery: {
      needed: Boolean(plan.heavyMachinery?.needed),
      reason: plan.heavyMachinery?.reason ? String(plan.heavyMachinery.reason) : null,
    },
    hazards: (plan.hazards ?? []).slice(0, 4).map(String),
    teams: (plan.teams ?? []).slice(0, 4).map((t) => ({
      name: String(t.name ?? "Team"),
      people: clampInt(t.people, 1, 200),
      task: String(t.task ?? ""),
    })),
    tips: (plan.tips ?? []).slice(0, 3).map(String),
    summary: String(plan.summary ?? ""),
    confidence: Math.min(1, Math.max(0, Number(plan.confidence) || 0)),
  };
}

exports.planCleanup = onCall(
  // Callable functions must be invocable by anyone at the Cloud Run layer; the
  // request.auth check below is what actually gates access.
  { region: "us-central1", invoker: "public", secrets: [GEMINI_API_KEY], memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {
    // Signed-in (anonymous is fine) so plans can't be farmed by unauthenticated scripts.
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to request a cleanup plan.");
    const { beachId, name, location } = validate(request.data);
    const db = getFirestore();

    // Every report in a band of latitude around the beach, however old, then
    // trimmed to the radius. Newest first by when the photo was taken, so an
    // old photo sent in today doesn't stand in for the beach as it is now.
    const band = RADIUS_KM / 111;
    const snap = await db
      .collection("reports")
      .where("status", "==", "published")
      .where("location.lat", ">=", location.lat - band)
      .where("location.lat", "<=", location.lat + band)
      .get();
    const when = (r) => (r.takenAt ?? r.createdAt).toMillis();
    const reports = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.type === "trash" && r.aiAnalysis && distanceKm(location, r.location) <= RADIUS_KM)
      .sort((x, y) => when(y) - when(x));

    if (reports.length < MIN_REPORTS) {
      return { status: "needs_reports", reportCount: reports.length, minReports: MIN_REPORTS };
    }

    // Reuse the stored plan until a new report arrives near this beach.
    const planRef = db.collection("cleanupPlans").doc(beachId);
    const cached = await planRef.get();
    if (
      cached.exists &&
      cached.get("version") === PLAN_VERSION &&
      cached.get("latestReportId") === reports[0].id &&
      cached.get("reportCount") === reports.length
    ) {
      return { status: "ok", cached: true, ...serialize(cached.data()) };
    }

    const photoPaths = reports
      .slice(0, PHOTO_REPORTS)
      .map((r) => r.photos?.[0])
      .filter(Boolean);
    const photos = await Promise.all(photoPaths.map(downloadPhoto));

    const parts = [
      { text: `Beach: ${name} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` },
      { text: summarize(reports) },
      ...photos.flatMap((p, i) => [{ text: `Photo from report ${i + 1} (newest first):` }, inlinePhoto(p)]),
      { text: INSTRUCTION },
    ];

    const { response, model } = await generateWithFallback(makeAi({ attempts: 2 }), {
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    });
    const plan = clean(JSON.parse(response.text));

    const record = {
      beachId,
      name,
      location,
      plan,
      reportCount: reports.length,
      latestReportId: reports[0].id,
      version: PLAN_VERSION,
      model,
      generatedAt: FieldValue.serverTimestamp(),
    };
    await planRef.set(record);
    logger.info("Cleanup plan generated", { beachId, reportCount: reports.length, model, severity: plan.severity });
    return { status: "ok", cached: false, ...serialize({ ...record, generatedAt: null }) };
  },
);

function serialize(doc) {
  return {
    plan: doc.plan,
    reportCount: doc.reportCount,
    latestReportId: doc.latestReportId,
    version: doc.version,
    model: doc.model,
    generatedAt: doc.generatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}
