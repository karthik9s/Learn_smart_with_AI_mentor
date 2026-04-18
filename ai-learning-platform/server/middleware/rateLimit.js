/* ── Daily usage rate limiter ──────────────────────────────
   Checks per-user daily request count against plan limits.
   Uses in-memory store (resets on server restart).
   For production: swap with Supabase user_usage table.
   ──────────────────────────────────────────────────────── */

const PLAN_LIMITS = {
  free:    5,
  pro:     50,
  premium: Infinity,
};

// In-memory store: { "userId_YYYY-MM-DD": count }
const usageStore = new Map();

function getTodayKey(userId) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${userId}_${today}`;
}

function getUsageCount(userId) {
  return usageStore.get(getTodayKey(userId)) || 0;
}

function incrementUsage(userId) {
  const key = getTodayKey(userId);
  const current = usageStore.get(key) || 0;
  usageStore.set(key, current + 1);
  return current + 1;
}

/* ── Middleware factory ────────────────────────────────── */
function rateLimitMiddleware(req, res, next) {
  // Extract user identity — use IP as fallback for unauthenticated users
  const userId = req.headers["x-user-id"] || req.ip || "anonymous";
  const plan   = req.headers["x-user-plan"] || "free";

  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // Premium / unlimited
  if (limit === Infinity) return next();

  const current = getUsageCount(userId);

  if (current >= limit) {
    return res.status(403).json({
      error: "daily_limit_reached",
      message: `Daily limit reached (${limit}/${limit}). Upgrade to continue.`,
      limit,
      used: current,
      plan,
    });
  }

  const used = incrementUsage(userId);

  // Attach usage info to response headers so frontend can read it
  res.setHeader("X-Usage-Used",  used);
  res.setHeader("X-Usage-Limit", limit);
  res.setHeader("X-Usage-Remaining", Math.max(0, limit - used));

  next();
}

module.exports = rateLimitMiddleware;
