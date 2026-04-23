/* ── Auth middleware ───────────────────────────────────────
   Validates Supabase JWT using the service role client.
   Sets req.user = { id, email } on success.
   ──────────────────────────────────────────────────────── */
const { getSupabase } = require("../lib/supabase");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid or expired token" });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    res.status(401).json({ error: "Auth error", details: e.message });
  }
};
