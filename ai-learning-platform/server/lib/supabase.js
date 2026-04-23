/* ── Supabase admin client (service role) ──────────────────
   Used ONLY on the backend. Never expose SUPABASE_SERVICE_KEY
   to the frontend.
   ──────────────────────────────────────────────────────── */
const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_KEY not set");
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

module.exports = { getSupabase };
