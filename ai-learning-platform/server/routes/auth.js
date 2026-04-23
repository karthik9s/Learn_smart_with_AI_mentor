/* ── Auth routes ───────────────────────────────────────────
   Supabase handles signup/login. These routes are thin wrappers
   that return the Supabase session token to the frontend.
   The frontend can also call Supabase directly — these exist
   for server-side flows and profile bootstrapping.
   ──────────────────────────────────────────────────────── */
const express = require("express");
const router  = express.Router();
const { getSupabase } = require("../lib/supabase");
const authMiddleware  = require("../middleware/auth");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) return res.status(400).json({ error: error.message });

    // Bootstrap profile row
    if (data.user) {
      await sb.from("profiles").upsert({
        id:    data.user.id,
        email: data.user.email,
        plan:  "free",
      });
    }

    res.json({
      token: data.session?.access_token,
      user:  { id: data.user?.id, email: data.user?.email, name },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    // Ensure profile exists
    await sb.from("profiles").upsert({
      id:    data.user.id,
      email: data.user.email,
    }, { onConflict: "id", ignoreDuplicates: true });

    res.json({
      token: data.session.access_token,
      user:  { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me — returns profile + plan
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: profile, error } = await sb
      .from("profiles")
      .select("id, email, plan, expiry_date, created_at")
      .eq("id", req.user.id)
      .single();

    if (error) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
