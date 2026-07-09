alter table public.memory_sources
  add column if not exists role text not null default 'chris';

create index if not exists memory_sources_role_idx on public.memory_sources(role);
create index if not exists memory_sources_role_platform_idx on public.memory_sources(role, platform);

update public.memory_sources
set role = coalesce(payload->>'role', role, 'chris')
where role is null or role = '';
