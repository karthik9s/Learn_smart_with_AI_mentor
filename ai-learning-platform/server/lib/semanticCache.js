/* ── Semantic cache (Cohere embeddings + Supabase) ─────────
   Catches near-duplicate queries that the exact hash cache misses.
   e.g. "react hooks intermediate" ≈ "hooks in react intermediate"

   Optimizations applied:
     1. Query limited to MAX_CANDIDATES rows (no full-table scan)
     2. Cache key includes level → "react hooks-intermediate"
        prevents beginner/advanced cross-contamination
     3. TTL enforced on read via created_at cutoff (7 days)
     4. Best-match only: tracks highestScore, returns single winner
     5. Null-response guard: skips rows with missing response_json
     6. Graceful degradation: Cohere errors return null (cache miss)
   ──────────────────────────────────────────────────────── */

const { CohereClient } = require("cohere-ai");
const { getSupabase }  = require("./supabase");

const TTL_DAYS             = 7;
const SIMILARITY_THRESHOLD = 0.85;  // tune: lower = more hits, less precision
const MAX_CANDIDATES       = 200;   // max rows fetched per similarity scan

let _cohere = null;

function getCohere() {
  if (_cohere) return _cohere;
  const key = process.env.COHERE_API_KEY;
  if (!key) throw new Error("COHERE_API_KEY not set");
  _cohere = new CohereClient({ token: key });
  return _cohere;
}

/* ── Cosine similarity ─────────────────────────────────── */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/* ── Build level-scoped query key ──────────────────────── */
// FIX 2: include level in key so "react hooks-beginner" ≠ "react hooks-advanced"
function buildQueryKey(topic, level) {
  return `${topic.trim().toLowerCase()}-${(level || "").trim().toLowerCase()}`;
}

/* ── Get embedding from Cohere ─────────────────────────── */
async function getEmbedding(text) {
  const response = await getCohere().embed({
    texts:     [text.trim().toLowerCase()],
    model:     "embed-english-v3.0",
    inputType: "search_query",
  });
  const embeddings = response.embeddings;
  // SDK v2 shape
  if (Array.isArray(embeddings) && Array.isArray(embeddings[0])) return embeddings[0];
  // Older SDK shape
  if (embeddings?.float) return embeddings.float[0];
  throw new Error("Unexpected Cohere embedding response shape");
}

/* ── Check semantic cache ──────────────────────────────── */
/**
 * @param {string} topic    - topic text
 * @param {string} level    - difficulty level
 * @param {string} endpoint - route namespace ("learn", "quiz", etc.)
 * @returns {object|null}   - cached response_json or null on miss
 */
async function checkSemanticCache(topic, level, endpoint) {
  try {
    const sb       = getSupabase();
    // FIX 3: TTL cutoff — ignore entries older than 7 days
    const cutoff   = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    // FIX 2: level-scoped query key
    const queryKey = buildQueryKey(topic, level);

    // FIX 4: log the lookup attempt
    console.log(`[semantic cache] checking "${queryKey}" (${endpoint})`);

    // 1. Embed the incoming query
    const queryEmbedding = await getEmbedding(queryKey);

    // 2. FIX 1: fetch limited, time-bounded candidates scoped by endpoint + level
    const { data, error } = await sb
      .from("semantic_cache")
      .select("id, query_text, embedding, response_json")
      .eq("endpoint", endpoint)
      .eq("level", (level || "").trim().toLowerCase())   // FIX 2: level column filter
      .gte("created_at", cutoff)                         // FIX 3: TTL filter
      .order("created_at", { ascending: false })         // FIX 1: most recent first
      .limit(MAX_CANDIDATES);                            // FIX 1: cap scan size

    if (error || !data?.length) return null;

    // 3. FIX 5: find best cosine match, skip null responses
    let bestMatch  = null;
    let bestScore  = 0;

    for (const row of data) {
      // FIX 6: skip rows with missing or invalid response_json
      if (!row.response_json || !row.embedding) continue;

      const score = cosineSimilarity(queryEmbedding, row.embedding);

      // FIX 5: only track best match above threshold
      if (score > SIMILARITY_THRESHOLD && score > bestScore) {
        bestScore = score;
        bestMatch = row;
      }
    }

    if (bestMatch) {
      // FIX 4: structured cache HIT log
      console.log(`[Semantic Cache HIT] "${queryKey}" → "${bestMatch.query_text}" (score: ${bestScore.toFixed(3)})`);
      return bestMatch.response_json;
    }

    return null;
  } catch (e) {
    // FIX 6: degrade gracefully — Cohere error is not fatal
    console.warn("[semantic cache] checkSemanticCache error:", e.message);
    return null;
  }
}

/* ── Store in semantic cache ───────────────────────────── */
/**
 * Fire-and-forget. Never throws, never blocks the response.
 */
async function storeSemanticCache(topic, level, endpoint, responseObj) {
  // FIX 6: guard against storing null/undefined responses
  if (!responseObj) return;

  try {
    const sb       = getSupabase();
    const queryKey = buildQueryKey(topic, level);
    const embedding = await getEmbedding(queryKey);

    await sb.from("semantic_cache").insert({
      query_text:    queryKey,
      endpoint,
      level:         (level || "").trim().toLowerCase(),  // FIX 2: store level column
      embedding,
      response_json: responseObj,
    });
  } catch (e) {
    console.warn("[semantic cache] storeSemanticCache error:", e.message);
  }
}

/* ── Purge expired entries ─────────────────────────────── */
async function purgeSemanticExpired() {
  try {
    const sb     = getSupabase();
    const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("semantic_cache")
      .delete()
      .lt("created_at", cutoff)
      .select("id", { count: "exact", head: true });
    console.log(`[semantic cache] purged ${count ?? "?"} expired entries`);
  } catch (e) {
    console.warn("[semantic cache] purgeSemanticExpired error:", e.message);
  }
}

module.exports = {
  checkSemanticCache,
  storeSemanticCache,
  purgeSemanticExpired,
  cosineSimilarity,
  getEmbedding,
  buildQueryKey,
};
