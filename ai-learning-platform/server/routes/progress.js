/* ── Progress routes (Supabase-backed) ─────────────────────
   Stores topics, quiz results, and practice counts in Supabase.
   ──────────────────────────────────────────────────────── */
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { getSupabase } = require("../lib/supabase");

// POST /api/progress/topic
router.post("/topic", auth, async (req, res) => {
  const { topic, level, xpEarned = 50 } = req.body;
  if (!topic) return res.status(400).json({ error: "topic required" });

  try {
    const sb = getSupabase();

    // Upsert topic (update learnedAt if exists)
    await sb.from("topics").upsert(
      { user_id: req.user.id, topic, level, learned_at: new Date().toISOString() },
      { onConflict: "user_id,topic" }
    );

    // Increment XP in profile
    const { data: profile } = await sb
      .from("profiles")
      .select("xp")
      .eq("id", req.user.id)
      .single();

    const newXp = (profile?.xp || 0) + xpEarned;
    await sb.from("profiles").update({ xp: newXp }).eq("id", req.user.id);

    res.json({ ok: true, xp: newXp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/progress/quiz
router.post("/quiz", auth, async (req, res) => {
  const { topic, score, total, weakAreas } = req.body;
  const pct = Math.round((score / total) * 100);

  try {
    const sb = getSupabase();

    await sb.from("quiz_history").insert({
      user_id: req.user.id,
      topic, score, total, pct,
    });

    // Upsert weak areas
    if (weakAreas?.length) {
      const rows = weakAreas.map(area => ({ user_id: req.user.id, area }));
      await sb.from("weak_areas").upsert(rows, { onConflict: "user_id,area", ignoreDuplicates: true });
    }

    // Increment XP
    const { data: profile } = await sb.from("profiles").select("xp").eq("id", req.user.id).single();
    const newXp = (profile?.xp || 0) + score * 20;
    await sb.from("profiles").update({ xp: newXp }).eq("id", req.user.id);

    res.json({ ok: true, xp: newXp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/progress/practice
router.post("/practice", auth, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: profile } = await sb
      .from("profiles")
      .select("xp, practice_count")
      .eq("id", req.user.id)
      .single();

    await sb.from("profiles").update({
      xp:             (profile?.xp || 0) + 30,
      practice_count: (profile?.practice_count || 0) + 1,
    }).eq("id", req.user.id);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
