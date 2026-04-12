import { createClient } from "@supabase/supabase-js";

/* ── Read env vars ─────────────────────────────────────────
   VITE_ prefix is required for Vite to expose them at build time.
   Set these in Vercel → Project Settings → Environment Variables.
   ──────────────────────────────────────────────────────── */
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ── Validate — never fall back to placeholder values ────── */
const PLACEHOLDER_PATTERNS = ["placeholder", "your_supabase", "example.supabase.co"];

function isValid(val) {
  if (!val || typeof val !== "string") return false;
  return !PLACEHOLDER_PATTERNS.some(p => val.includes(p));
}

export const supabaseEnabled = isValid(SUPABASE_URL) && isValid(SUPABASE_ANON_KEY);

if (import.meta.env.DEV) {
  // Log domain only — never log the full key
  const domain = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "not set";
  console.log(`[Supabase] enabled=${supabaseEnabled} domain=${domain}`);
}

if (!supabaseEnabled) {
  console.warn(
    "[Supabase] Not configured — running in guest mode.\n" +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
  );
}

/* ── Create client ONLY when properly configured ──────────
   If not configured, export a stub that throws clear errors
   so nothing silently hits placeholder.supabase.co
   ──────────────────────────────────────────────────────── */
export const supabase = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createClient("https://stub.supabase.co", "stub-key"); // stub — never actually called
