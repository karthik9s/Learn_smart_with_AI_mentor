/* ── Daily usage rate limiter (Supabase-backed) ────────────
   Authenticated users: plan + usage stored in Supabase.
   Guest users: in-memory fallback (resets on server restart).
   ──────────────────────────────────────────────────────── */
const { getSupabase } = require("../lib/supabase");

const PLAN_LIMITS = { free: 5, pro: 50, premium: Infinity };

// In-memory fallback for guests
const guestStore = new Map();

function today() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function guestCount(key) {
  const e = guestStore.get(key);
  return e?.date === today() ? e.count : 0;
}

function guestIncrement(key) {
  const d = today();
  const e = guestStore.get(key) || { date: d, count: 0 };
  if (e.date !== d) { e.date = d; e.count = 0; }
  e.count += 1;
  guestStore.set(key, e);
  return e.count;
}

async function rateLimitMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  // ── Authenticated path ──────────────────────────────────
  if (token) {
    try {
      const sb = getSupabase();

      // Validate token + get user
      const { data: { user }, error: authErr } = await sb.auth.getUser(token);
      if (authErr || !user) throw new Error("invalid token");

      const userId = user.id;
      const date   = today();

      // Fetch profile (plan + expiry)
      let { data: profile } = await sb
        .from("profiles")
        .select("plan, expiry_date")
        .eq("id", userId)
        .single();

      // Auto-create profile if missing
      if (!profile) {
        await sb.from("profiles").upsert({ id: userId, email: user.email, plan: "free" });
        profile = { plan: "free", expiry_date: null };
      }

      // Auto-downgrade expired plan
      if (profile.plan !== "free" && profile.expiry_date && new Date() > new Date(profile.expiry_date)) {
        await sb.from("profiles").update({ plan: "free", expiry_date: null }).eq("id", userId);
        profile.plan = "free";
      }

      const plan  = profile.plan || "free";
      const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      if (limit === Infinity) {
        res.setHeader("X-Usage-Used",      "0");
        res.setHeader("X-Usage-Limit",     "unlimited");
        res.setHeader("X-Usage-Remaining", "unlimited");
        res.setHeader("X-User-Plan",       plan);
        return next();
      }

      // Fetch today's usage
      const { data: usageRow } = await sb
        .from("user_usage")
        .select("id, count")
        .eq("user_id", userId)
        .eq("date", date)
        .single();

      const current = usageRow?.count ?? 0;

      if (current >= limit) {
        return res.status(403).json({
          error:   "daily_limit_reached",
          message: `Daily limit reached (${limit}/${limit}). Upgrade to continue.`,
          limit, used: current, plan,
        });
      }

      // Upsert usage count
      if (usageRow) {
        await sb.from("user_usage").update({ count: current + 1 }).eq("id", usageRow.id);
      } else {
        await sb.from("user_usage").insert({ user_id: userId, date, count: 1 });
      }

      const used = current + 1;
      res.setHeader("X-Usage-Used",      used);
      res.setHeader("X-Usage-Limit",     limit);
      res.setHeader("X-Usage-Remaining", Math.max(0, limit - used));
      res.setHeader("X-User-Plan",       plan);
      return next();

    } catch (e) {
      // Token invalid or Supabase error — fall through to guest
      console.warn("[rateLimit] Auth failed, using guest limits:", e.message);
    }
  }

  // ── Guest / unauthenticated path ────────────────────────
  const guestKey = req.headers["x-user-id"] || req.ip || "anonymous";
  const plan     = "free";
  const limit    = PLAN_LIMITS.free;

  const current = guestCount(guestKey);
  if (current >= limit) {
    return res.status(403).json({
      error:   "daily_limit_reached",
      message: `Daily limit reached (${limit}/${limit}). Log in and upgrade to continue.`,
      limit, used: current, plan,
    });
  }

  const used = guestIncrement(guestKey);
  res.setHeader("X-Usage-Used",      used);
  res.setHeader("X-Usage-Limit",     limit);
  res.setHeader("X-Usage-Remaining", Math.max(0, limit - used));
  next();
}

module.exports = rateLimitMiddleware;
