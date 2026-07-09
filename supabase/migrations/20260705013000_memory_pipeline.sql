create table if not exists public.memory_sources (
  id text primary key,
  platform text not null,
  status text not null default 'active',
  priority integer not null default 50,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_content_items (
  id text primary key,
  source_id text references public.memory_sources(id) on delete set null,
  platform text not null,
  external_id text not null,
  url text not null,
  published_at timestamptz,
  status text not null default 'discovered',
  transcript_status text not null default 'missing',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_id)
);

create table if not exists public.memory_raw_transcripts (
  id text primary key,
  content_item_id text references public.memory_content_items(id) on delete cascade,
  source_id text references public.memory_sources(id) on delete set null,
  source text not null,
  language text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_extractions (
  id text primary key,
  content_item_id text references public.memory_content_items(id) on delete cascade,
  source_id text references public.memory_sources(id) on delete set null,
  chunk_id text,
  kind text not null,
  topic text not null,
  status text not null default 'suggested',
  confidence numeric not null default 0.5,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_scan_runs (
  id text primary key,
  source_id text references public.memory_sources(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_sources_platform_idx on public.memory_sources(platform);
create index if not exists memory_sources_status_idx on public.memory_sources(status);
create index if not exists memory_content_source_idx on public.memory_content_items(source_id);
create index if not exists memory_content_platform_status_idx on public.memory_content_items(platform, status);
create index if not exists memory_content_transcript_status_idx on public.memory_content_items(transcript_status);
create index if not exists memory_raw_transcripts_content_idx on public.memory_raw_transcripts(content_item_id);
create index if not exists memory_extractions_content_idx on public.memory_extractions(content_item_id);
create index if not exists memory_extractions_status_idx on public.memory_extractions(status);
create index if not exists memory_extractions_topic_idx on public.memory_extractions(topic);
create index if not exists memory_scan_runs_source_idx on public.memory_scan_runs(source_id);
create index if not exists memory_scan_runs_status_idx on public.memory_scan_runs(status);

alter table public.memory_sources enable row level security;
alter table public.memory_content_items enable row level security;
alter table public.memory_raw_transcripts enable row level security;
alter table public.memory_extractions enable row level security;
alter table public.memory_scan_runs enable row level security;

do $$ begin
  create policy "service_role_memory_sources" on public.memory_sources for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_memory_content_items" on public.memory_content_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_memory_raw_transcripts" on public.memory_raw_transcripts for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_memory_extractions" on public.memory_extractions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "service_role_memory_scan_runs" on public.memory_scan_runs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;
