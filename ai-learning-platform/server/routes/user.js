/* ── User info routes ──────────────────────────────────────
   GET /api/user/plan   → current plan + expiry
   GET /api/user/usage  → today's usage + limit
   ──────────────────────────────────────────────────────── */
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { getSupabase } = require("../lib/supabase");

const PLAN_LIMITS = { free: 5, pro: 50, premium: null }; // null = unlimited

// GET /api/user/plan
router.get("/plan", auth, async (req, res) => {
  try {
    const sb = getSupabase();
    let { data: profile } = await sb
      .from("profiles")
      .select("plan, expiry_date")
      .eq("id", req.user.id)
      .single();

    if (!profile) {
      await sb.from("profiles").upsert({ id: req.user.id, email: req.user.email, plan: "free" });
      return res.json({ plan: "free", expiry: null, limit: PLAN_LIMITS.free });
    }

    // Auto-downgrade
    if (profile.plan !== "free" && profile.expiry_date && new Date() > new Date(profile.expiry_date)) {
      await sb.from("profiles").update({ plan: "free", expiry_date: null }).eq("id", req.user.id);
      profile.plan = "free";
      profile.expiry_date = null;
    }

    res.json({
      plan:   profile.plan,
      expiry: profile.expiry_date,
      limit:  PLAN_LIMITS[profile.plan] ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/user/usage
router.get("/usage", auth, async (req, res) => {
  try {
    const sb   = getSupabase();
    const date = new Date().toISOString().split("T")[0];

    const [{ data: profile }, { data: usageRow }] = await Promise.all([
      sb.from("profiles").select("plan").eq("id", req.user.id).single(),
      sb.from("user_usage").select("count").eq("user_id", req.user.id).eq("date", date).single(),
    ]);

    const plan  = profile?.plan || "free";
    const limit = PLAN_LIMITS[plan];
    const used  = usageRow?.count || 0;

    res.json({
      plan,
      used,
      limit:     limit ?? "unlimited",
      remaining: limit === null ? "unlimited" : Math.max(0, limit - used),
      date,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
