/* ── Auth middleware ───────────────────────────────────────
   Validates Supabase JWT using the service role client.
   Sets req.user = { id, email } on success.

   NOTE: We intentionally use supabase.auth.getUser() rather than
   jwt.verify() so that revoked/signed-out tokens are rejected
   immediately rather than remaining valid until expiry.
   ──────────────────────────────────────────────────────── */
const { getSupabase } = require("../lib/supabase");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("[Auth Middleware] Supabase client not initialised — check SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });

    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    console.error("[Auth Middleware] Token verification failed:", e.message);
    res.status(401).json({ error: "Unauthorized: Auth error" });
  }
};
