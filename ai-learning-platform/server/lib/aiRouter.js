/* ── Smart AI Router ───────────────────────────────────────
   Classifies each query and routes to the best provider.
   Uses ProviderRegistry for key management, usage/failure
   tracking, and automatic cooldown.

   Routing table:
     real-time → Gemini  (enhanced prompt for current info)
     quiz      → Gemini  (structured output, reliable JSON)
     learning  → Groq    (fast, high quality for education)
     general   → Groq    (default)

   Fallback chain (any provider failure or cooldown):
     primary → next in [groq, gemini, mistral]
   ──────────────────────────────────────────────────────── */

const Groq                   = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Mistral }            = require("@mistralai/mistralai");
const { callProvider }       = require("./providerRegistry");

/* ── Lazy SDK singletons (key injected at call time) ───── */
let _groq    = null;
let _gemini  = null;
let _mistral = null;

function groqSDK(key) {
  if (!_groq || _groq.apiKey !== key) _groq = new Groq({ apiKey: key });
  return _groq;
}
function geminiSDK(key) {
  if (!_gemini) _gemini = new GoogleGenerativeAI(key);
  return _gemini;
}
function mistralSDK(key) {
  if (!_mistral) _mistral = new Mistral({ apiKey: key });
  return _mistral;
}

/* ── Shared system prompt ──────────────────────────────── */
const SYSTEM_PROMPT = `You are an expert AI tutor and mentor.
Your goal is to TEACH, not just explain.
Rules:
- Adapt to the student's level (basic / intermediate / advanced)
- Explain concepts step-by-step
- Use real-world examples + technical clarity
- Always explain WHY and HOW
- Be structured, clear, and slightly conversational
- Avoid shallow answers
You are guiding a student through learning, not dumping information.`;

function clean(text) {
  return (text || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

/* ══════════════════════════════════════════════════════════
   Provider call functions — all go through the registry
   ══════════════════════════════════════════════════════════ */

async function callGroq(prompt) {
  return callProvider("groq", async (key) => {
    const res = await groqSDK(key).chat.completions.create({
      model:       "llama-3.3-70b-versatile",
      messages:    [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens:  4096,
    });
    return clean(res.choices[0].message.content);
  });
}

async function callGemini(prompt) {
  return callProvider("gemini", async (key) => {
    const model  = geminiSDK(key).getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${prompt}`);
    return clean(result.response.text());
  });
}

async function callMistral(prompt) {
  return callProvider("mistral", async (key) => {
    const res = await mistralSDK(key).chat.complete({
      model:    "mistral-small-latest",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    });
    return clean(res.choices[0].message.content);
  });
}

/* ══════════════════════════════════════════════════════════
   Query classifier
   ══════════════════════════════════════════════════════════ */
function classifyQuery(query) {
  const q = query.toLowerCase();
  if (q.includes("latest") || q.includes("recent") || q.includes("news") ||
      q.includes("current") || q.includes("today") || q.includes("2024") || q.includes("2025")) {
    return "real-time";
  }
  if (q.includes("quiz") || q.includes("questions") || q.includes("test") ||
      q.includes("mcq")  || q.includes("interview")) {
    return "quiz";
  }
  if (q.includes("explain") || q.includes("what is") || q.includes("learn") ||
      q.includes("understand") || q.includes("teach") || q.includes("how does") ||
      q.includes("roadmap")   || q.includes("plan")) {
    return "learning";
  }
  return "general";
}

/* ══════════════════════════════════════════════════════════
   Build ordered provider chain
   ══════════════════════════════════════════════════════════ */
function buildChain(type) {
  const ALL = {
    groq:    { name: "Groq",    fn: callGroq    },
    gemini:  { name: "Gemini",  fn: callGemini  },
    mistral: { name: "Mistral", fn: callMistral },
  };

  const primaryMap = {
    "real-time": "gemini",
    "quiz":      "gemini",
    "learning":  "groq",
    "general":   "groq",
  };

  const primary = primaryMap[type] || "groq";

  // Fallbacks sorted by avgResponseTime ascending.
  // Providers with no timing data yet (null) go last — untested.
  const { getStatus } = require("./providerRegistry");
  const timings = Object.fromEntries(
    getStatus().map(s => [s.provider, s.avgResponseTime])
  );

  const fallbacks = ["groq", "gemini", "mistral"]
    .filter(p => p !== primary)
    .sort((a, b) => (timings[a] ?? Infinity) - (timings[b] ?? Infinity));

  const order = [primary, ...fallbacks];
  console.log(`[AI Router] chain: ${order.join(" → ")} (primary by type, fallbacks by avg latency)`);

  return order.map(k => ALL[k]);
}

/* ══════════════════════════════════════════════════════════
   Smart router with registry-aware fallback chain
   ══════════════════════════════════════════════════════════ */
async function routeAI(prompt, endpoint = "") {
  // Endpoint hint overrides keyword classification for known routes
  let type;
  if (endpoint === "quiz" || endpoint === "selfcheck") {
    type = "quiz";
  } else if (["learn","generate-all","roadmap","goal-roadmap","daily-plan","revision"].includes(endpoint)) {
    type = "learning";
  } else {
    type = classifyQuery(prompt);
  }

  console.log(`[AI Router] type="${type}" endpoint="${endpoint}"`);

  // Enhance prompt for real-time queries
  const routedPrompt = type === "real-time"
    ? `Give the most recent and up-to-date explanation about:\n"${prompt}"\n\nInclude:\n- latest trends and developments\n- current real-world use cases\n- recent examples from industry or research\n- what has changed compared to older approaches`
    : prompt;

  const chain      = buildChain(type);
  const MAX_RETRIES = Math.min(chain.length, 3);
  let   attempts   = 0;

  for (const { name, fn } of chain) {
    if (attempts >= MAX_RETRIES) break;
    attempts++;
    try {
      console.log(`[AI Router] Attempt ${attempts}/${MAX_RETRIES} — provider: ${name}`);
      const result = await fn(routedPrompt);
      console.log(`[AI Router] ✅ ${name} succeeded (attempt ${attempts})`);
      return result;
    } catch (e) {
      console.warn(`[AI Router] ⚠️  ${name} failed (attempt ${attempts}) — trying next...`);
    }
  }

  const err = new Error("All AI providers failed. Please try again later.");
  err.httpStatus = 503;
  err.code = "all_providers_failed";
  throw err;
}

module.exports = { routeAI, classifyQuery, callGroq, callGemini, callMistral };
