/* ── Lesson cache (Supabase-backed) ────────────────────────
   Caches AI-generated content keyed by SHA-256(topic+level).
   TTL: 7 days. Writes are fire-and-forget (never block response).
   ──────────────────────────────────────────────────────── */
const crypto = require("crypto");
const { getSupabase } = require("./supabase");

const TTL_DAYS = 7;

/** SHA-256 hex of "<topic>|<level>" (lowercased + trimmed) */
function makeHash(topic, level) {
  const key = `${topic.trim().toLowerCase()}|${(level || "").trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Look up a cached entry.
 * Returns the parsed content_json object, or null on miss / expiry / error.
 */
async function getCache(topic, level) {
  try {
    const sb        = getSupabase();
    const hash      = makeHash(topic, level);
    const cutoff    = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb
      .from("lesson_cache")
      .select("content_json, created_at")
      .eq("topic_hash", hash)
      .eq("level", (level || "").trim().toLowerCase())
      .gte("created_at", cutoff)   // ignore entries older than TTL
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.content_json;      // already a JS object (jsonb column)
  } catch (e) {
    console.warn("[cache] getCache error:", e.message);
    return null;
  }
}

/**
 * Store a new cache entry.
 * Fire-and-forget — never throws, never blocks the response.
 */
async function setCache(topic, level, contentObj) {
  try {
    const sb   = getSupabase();
    const hash = makeHash(topic, level);

    await sb.from("lesson_cache").insert({
      topic_hash:   hash,
      level:        (level || "").trim().toLowerCase(),
      content_json: contentObj,   // Supabase accepts plain JS objects for jsonb
    });
  } catch (e) {
    console.warn("[cache] setCache error:", e.message);
  }
}

/**
 * Delete expired entries (older than TTL_DAYS).
 * Call this from a maintenance route or a cron job.
 */
async function purgeExpired() {
  try {
    const sb     = getSupabase();
    const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("lesson_cache")
      .delete()
      .lt("created_at", cutoff)
      .select("id", { count: "exact", head: true });
    console.log(`[cache] purged ${count ?? "?"} expired entries`);
  } catch (e) {
    console.warn("[cache] purgeExpired error:", e.message);
  }
}

module.exports = { getCache, setCache, purgeExpired, makeHash };
