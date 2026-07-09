-- Chris Fact Radar — shared claim store
-- Run this once in the Supabase SQL editor.

-- Needed for transcript_chunks_text_trgm_idx in new projects.
create extension if not exists pg_trgm;

create table if not exists public.claims (
  id text primary key,
  payload jsonb not null,
  stage text not null default 'new',
  updated_at timestamptz not null default now()
);

create index if not exists claims_stage_idx on public.claims (stage);
create index if not exists claims_updated_idx on public.claims (updated_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists claims_touch on public.claims;
create trigger claims_touch before update on public.claims
  for each row execute function public.touch_updated_at();

alter table public.claims enable row level security;

-- Schwätzerkartei
create table if not exists public.creators (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists creators_updated_idx on public.creators (updated_at desc);
drop trigger if exists creators_touch on public.creators;
create trigger creators_touch before update on public.creators
  for each row execute function public.touch_updated_at();
alter table public.creators enable row level security;

-- Chris-Wissensbasis (Truth Base)
-- truths are extracted positions from transcript chunks, not hand-written loose notes.
create table if not exists public.truths (
  id text primary key,
  payload jsonb not null,
  topic text generated always as (payload->>'topic') stored,
  video_id text generated always as (payload->>'videoId') stored,
  chunk_id text generated always as (payload->>'chunkId') stored,
  confidence integer generated always as (coalesce((payload->>'confidence')::int, 0)) stored,
  updated_at timestamptz not null default now()
);
create index if not exists truths_updated_idx on public.truths (updated_at desc);
create index if not exists truths_topic_idx on public.truths (topic);
create index if not exists truths_video_id_idx on public.truths (video_id);
create index if not exists truths_chunk_id_idx on public.truths (chunk_id);
create index if not exists truths_confidence_idx on public.truths (confidence desc);
drop trigger if exists truths_touch on public.truths;
create trigger truths_touch before update on public.truths
  for each row execute function public.touch_updated_at();
alter table public.truths enable row level security;

-- Chris-Transkriptquellen: ein Eintrag pro Chris-Video/Longform/Podcast.
create table if not exists public.transcript_sources (
  id text primary key,
  video_id text not null,
  url text not null,
  title text not null,
  published_at date,
  source text not null default 'youtube-captions',
  raw_transcript text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists transcript_sources_video_id_idx on public.transcript_sources (video_id);
create index if not exists transcript_sources_updated_idx on public.transcript_sources (updated_at desc);
drop trigger if exists transcript_sources_touch on public.transcript_sources;
create trigger transcript_sources_touch before update on public.transcript_sources
  for each row execute function public.touch_updated_at();
alter table public.transcript_sources enable row level security;

-- Chris-Transkriptchunks: suchbare Bausteine fuer RAG und Claim-Matching.
create table if not exists public.transcript_chunks (
  id text primary key,
  source_id text not null references public.transcript_sources(id) on delete cascade,
  video_id text not null,
  chunk_index integer not null,
  start_seconds integer,
  end_seconds integer,
  text text not null,
  topics text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);
create index if not exists transcript_chunks_video_id_idx on public.transcript_chunks (video_id);
create index if not exists transcript_chunks_source_id_idx on public.transcript_chunks (source_id);
create index if not exists transcript_chunks_topics_idx on public.transcript_chunks using gin (topics);
create index if not exists transcript_chunks_text_trgm_idx on public.transcript_chunks using gin (text gin_trgm_ops);
drop trigger if exists transcript_chunks_touch on public.transcript_chunks;
create trigger transcript_chunks_touch before update on public.transcript_chunks
  for each row execute function public.touch_updated_at();
alter table public.transcript_chunks enable row level security;

-- Wissenschafts-Scanner
create table if not exists public.science_items (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists science_updated_idx on public.science_items (updated_at desc);
drop trigger if exists science_touch on public.science_items;
create trigger science_touch before update on public.science_items
  for each row execute function public.touch_updated_at();
alter table public.science_items enable row level security;

-- Schwätzer-Jäger: Suchprofile
create table if not exists public.hunter_profiles (
  id text primary key,
  payload jsonb not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists hunter_profiles_enabled_idx on public.hunter_profiles (enabled);
create index if not exists hunter_profiles_updated_idx on public.hunter_profiles (updated_at desc);
drop trigger if exists hunter_profiles_touch on public.hunter_profiles;
create trigger hunter_profiles_touch before update on public.hunter_profiles
  for each row execute function public.touch_updated_at();
alter table public.hunter_profiles enable row level security;

-- Schwätzer-Jäger: Rohkandidaten aus Plattformen
create table if not exists public.hunter_candidates (
  id text primary key,
  payload jsonb not null,
  status text not null default 'new',
  platform text not null,
  score integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists hunter_candidates_status_idx on public.hunter_candidates (status);
create index if not exists hunter_candidates_platform_idx on public.hunter_candidates (platform);
create index if not exists hunter_candidates_score_idx on public.hunter_candidates (score desc);
create index if not exists hunter_candidates_updated_idx on public.hunter_candidates (updated_at desc);
drop trigger if exists hunter_candidates_touch on public.hunter_candidates;
create trigger hunter_candidates_touch before update on public.hunter_candidates
  for each row execute function public.touch_updated_at();
alter table public.hunter_candidates enable row level security;

-- Schwätzer-Jäger: Laufprotokolle
create table if not exists public.hunter_runs (
  id text primary key,
  payload jsonb not null,
  ok boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists hunter_runs_ok_idx on public.hunter_runs (ok);
create index if not exists hunter_runs_updated_idx on public.hunter_runs (updated_at desc);
drop trigger if exists hunter_runs_touch on public.hunter_runs;
create trigger hunter_runs_touch before update on public.hunter_runs
  for each row execute function public.touch_updated_at();
alter table public.hunter_runs enable row level security;
