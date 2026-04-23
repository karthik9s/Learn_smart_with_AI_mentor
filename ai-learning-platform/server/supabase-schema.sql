-- ═══════════════════════════════════════════════════════════
-- MentorAI — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. profiles (extends auth.users)
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  plan           text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  expiry_date    timestamptz,
  xp             int not null default 0,
  practice_count int not null default 0,
  created_at     timestamptz not null default now()
);

-- 2. user_usage (daily request counts)
create table if not exists public.user_usage (
  id      bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date    date not null,
  count   int  not null default 0,
  unique (user_id, date)
);

-- 3. payments
create table if not exists public.payments (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plan       text not null,
  amount     int  not null,  -- in paise
  payment_id text not null,
  order_id   text,
  created_at timestamptz not null default now()
);

-- 4. topics (learning history)
create table if not exists public.topics (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  topic      text not null,
  level      text,
  learned_at timestamptz not null default now(),
  unique (user_id, topic)
);

-- 5. quiz_history
create table if not exists public.quiz_history (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  topic      text not null,
  score      int  not null,
  total      int  not null,
  pct        int  not null,
  created_at timestamptz not null default now()
);

-- 6. weak_areas
create table if not exists public.weak_areas (
  id      bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  area    text not null,
  unique (user_id, area)
);

-- 7. lesson_cache (AI response cache, shared across all users)
create table if not exists public.lesson_cache (
  id           uuid primary key default gen_random_uuid(),
  topic_hash   text not null,          -- SHA-256 of "topic|level"
  level        text not null,
  content_json jsonb not null,
  created_at   timestamptz not null default now()
);

-- Fast lookup by hash + level
create index if not exists lesson_cache_lookup
  on public.lesson_cache (topic_hash, level, created_at desc);

-- lesson_cache is public read (no user-specific data)
alter table public.lesson_cache enable row level security;
create policy "lesson_cache: public read"
  on public.lesson_cache for select using (true);

-- 8. semantic_cache (embedding-based similarity cache)
-- Stores Cohere embeddings as jsonb float arrays (no pgvector required).
-- Scoped by endpoint AND level so different route types and difficulty
-- levels never cross-pollinate.
create table if not exists public.semantic_cache (
  id            uuid primary key default gen_random_uuid(),
  query_text    text not null,          -- normalized "topic-level" key
  endpoint      text not null,          -- route namespace: "learn", "quiz", etc.
  level         text not null default '',-- difficulty level for accurate scoping
  embedding     jsonb not null,         -- float[] from Cohere embed-english-v3.0
  response_json jsonb not null,         -- cached AI response
  created_at    timestamptz not null default now()
);

-- Index for fast endpoint + level + time-range scans
create index if not exists semantic_cache_endpoint_level_time
  on public.semantic_cache (endpoint, level, created_at desc);

-- Public read (no user-specific data); backend service role handles writes
alter table public.semantic_cache enable row level security;
create policy "semantic_cache: public read"
  on public.semantic_cache for select using (true);

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.user_usage  enable row level security;
alter table public.payments    enable row level security;
alter table public.topics      enable row level security;
alter table public.quiz_history enable row level security;
alter table public.weak_areas  enable row level security;

-- Profiles: users can read their own row
create policy "profiles: own read"  on public.profiles    for select using (auth.uid() = id);
create policy "usage: own read"     on public.user_usage  for select using (auth.uid() = user_id);
create policy "payments: own read"  on public.payments    for select using (auth.uid() = user_id);
create policy "topics: own read"    on public.topics      for select using (auth.uid() = user_id);
create policy "quiz: own read"      on public.quiz_history for select using (auth.uid() = user_id);
create policy "weak: own read"      on public.weak_areas  for select using (auth.uid() = user_id);

-- NOTE: Backend uses service role key which bypasses RLS — all writes go through the backend.

-- ── Auto-create profile on signup ──────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
