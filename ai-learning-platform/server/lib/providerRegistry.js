/* ── Provider Registry ─────────────────────────────────────
   Centralized API key management with:
   - Usage tracking (per-provider call count)
   - Failure tracking (consecutive error count)
   - Automatic cooldown (1 min after 3 consecutive failures)
   - Status checks before routing
   - Structured logging on every call
   ──────────────────────────────────────────────────────── */

const COOLDOWN_MS        = 60 * 1000;  // 1 minute
const FAILURE_THRESHOLD  = 3;          // failures before cooldown

/* ── Centralized key config ────────────────────────────── */
const API_KEYS = {
  groq:    () => process.env.GROQ_API_KEY,
  gemini:  () => process.env.GEMINI_API_KEY,
  mistral: () => process.env.MISTRAL_API_KEY,
  cohere:  () => process.env.COHERE_API_KEY,
};

/* ── Per-provider state ────────────────────────────────── */
const state = {
  groq:    { usage: 0, failures: 0, cooldownUntil: null, totalTime: 0, lastResponseTime: null },
  gemini:  { usage: 0, failures: 0, cooldownUntil: null, totalTime: 0, lastResponseTime: null },
  mistral: { usage: 0, failures: 0, cooldownUntil: null, totalTime: 0, lastResponseTime: null },
  cohere:  { usage: 0, failures: 0, cooldownUntil: null, totalTime: 0, lastResponseTime: null },
};

/* ── Key access ────────────────────────────────────────── */
function getKey(provider) {
  const fn = API_KEYS[provider];
  if (!fn) throw new Error(`Unknown provider: ${provider}`);
  const key = fn();
  if (!key) throw new Error(`${provider.toUpperCase()}_API_KEY not set`);
  return key;
}

/* ── Status checks ─────────────────────────────────────── */
function isAvailable(provider) {
  const s = state[provider];
  if (!s) return false;

  // Check if key exists
  try { getKey(provider); } catch { return false; }

  // Check cooldown
  if (s.cooldownUntil && Date.now() < s.cooldownUntil) return false;

  // Auto-clear expired cooldown
  if (s.cooldownUntil && Date.now() >= s.cooldownUntil) {
    s.cooldownUntil = null;
    s.failures = 0;
    console.log(`[Registry] ✅ ${provider} cooldown expired — back online`);
  }

  return true;
}

function getCooldownRemaining(provider) {
  const s = state[provider];
  if (!s?.cooldownUntil) return 0;
  return Math.max(0, Math.ceil((s.cooldownUntil - Date.now()) / 1000));
}

/* ── Record success ────────────────────────────────────── */
function recordSuccess(provider, duration) {
  const s = state[provider];
  if (!s) return;
  s.usage++;
  s.failures = 0;
  s.lastResponseTime = duration;
  s.totalTime += duration;
  s.avgResponseTime = Math.round(s.totalTime / s.usage);
  console.log(`[Registry] ${provider} | usage=${s.usage} failures=${s.failures} time=${duration}ms avg=${s.avgResponseTime}ms`);
}

/* ── Classify error type ───────────────────────────────── */
function classifyError(e) {
  const status = e?.status ?? e?.response?.status ?? e?.statusCode ?? null;
  if (status === 429)                    return "rate_limit";
  if (status >= 500 && status < 600)     return "server_error";
  if (e?.message?.toLowerCase().includes("timeout")) return "timeout";
  return "unknown";
}

/* ── Record failure (error-type aware) ─────────────────── */
function recordFailure(provider, e) {
  const s       = state[provider];
  if (!s) return;
  const errType = classifyError(e);
  const errMsg  = e?.message ?? String(e);

  s.failures++;
  s.lastErrorType = errType;

  // Rate limit → always trigger cooldown immediately
  if (errType === "rate_limit") {
    s.cooldownUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[Registry] ⛔ ${provider} rate-limited — cooling down for ${COOLDOWN_MS / 1000}s`);
    return;
  }

  // Server error or timeout → count toward threshold
  if (s.failures >= FAILURE_THRESHOLD) {
    s.cooldownUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[Registry] ⛔ ${provider} hit ${s.failures} failures (${errType}) — cooling down for ${COOLDOWN_MS / 1000}s`);
  } else {
    console.warn(`[Registry] ⚠️  ${provider} failure ${s.failures}/${FAILURE_THRESHOLD} [${errType}] — ${errMsg}`);
  }
}

/* ── Wrapped call ──────────────────────────────────────── */
/**
 * Execute a provider call through the registry.
 * Handles availability check, usage/failure tracking, and logging.
 *
 * @param {string}   provider - "groq" | "gemini" | "mistral"
 * @param {Function} fn       - async (key: string) => string
 * @returns {string}          - raw response text
 */
async function callProvider(provider, fn) {
  if (!isAvailable(provider)) {
    const remaining = getCooldownRemaining(provider);
    const reason = remaining > 0
      ? `in cooldown (${remaining}s remaining)`
      : "key not configured";
    throw new Error(`${provider} unavailable: ${reason}`);
  }

  const key   = getKey(provider);
  const start = Date.now();
  try {
    const result   = await fn(key);
    const duration = Date.now() - start;
    recordSuccess(provider, duration);
    return result;
  } catch (e) {
    recordFailure(provider, e);
    throw e;
  }
}

/* ── Status snapshot (for /api/providers/status) ──────── */
function getStatus() {
  return Object.entries(state).map(([name, s]) => ({
    provider:         name,
    available:        isAvailable(name),
    usage:            s.usage,
    failures:         s.failures,
    cooldown:         getCooldownRemaining(name),
    hasKey:           !!API_KEYS[name]?.(),
    lastResponseTime: s.lastResponseTime,
    avgResponseTime:  s.avgResponseTime ?? null,
    lastErrorType:    s.lastErrorType   ?? null,
  }));
}

/* ── Reset (for testing) ───────────────────────────────── */
function resetProvider(provider) {
  if (state[provider]) {
    state[provider] = { usage: 0, failures: 0, cooldownUntil: null, totalTime: 0, lastResponseTime: null };
    console.log(`[Registry] ${provider} state reset`);
  }
}

module.exports = { callProvider, isAvailable, getKey, getStatus, resetProvider, API_KEYS };
