-- ICM Phase 0 — base schema (single-user, local-first)
-- See docs/ICM-PRODUCT-PRD.md §D.4 and §F.1 (milestone M0.1).
-- Single-user: no user_id / no RLS. Every row is the owner's.
-- Apply via Supabase Studio SQL editor, or `supabase db push` with the CLI.

-- The one user's profile. Treated as a singleton (one active row).
create table if not exists profiles (
  id                     uuid primary key default gen_random_uuid(),
  display_name           text,
  target_role            text,
  experience_level       text,            -- new | junior | mid | senior
  known_languages        text[] not null default '{}',
  tech_stack             text[] not null default '{}',
  goal                   text,
  north_star             text,
  hours_per_week         numeric,
  timezone               text,
  default_teaching_style text default 'real-world-examples',
  resume_insights        jsonb,           -- latest extractProfile output (role/skills/projects/strengths/gaps)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Which AI engine to use + (optional, encrypted) API key.
create table if not exists ai_settings (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'claude_code',  -- claude_code | api
  api_key_encrypted text,
  model_prefs      jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

-- Uploaded resumes (parsed to markdown) + extracted insights.
create table if not exists resumes (
  id          uuid primary key default gen_random_uuid(),
  filename    text,
  content_md  text,
  chars       integer,
  insights    jsonb,                       -- extractProfile: skills / projects / strengths / gaps
  uploaded_at timestamptz not null default now()
);

-- Gamification counters (single row, like profile).
create table if not exists user_stats (
  id               uuid primary key default gen_random_uuid(),
  xp               integer not null default 0,
  level            integer not null default 1,
  streak_current   integer not null default 0,
  streak_best      integer not null default 0,
  freezes          integer not null default 0,
  last_active_date date,
  updated_at       timestamptz not null default now()
);
