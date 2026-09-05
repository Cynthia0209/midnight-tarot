-- Midnight Tarot stores private readings behind trusted server routes.
-- Browser clients never access these tables directly.

create table if not exists public.reading_sessions (
  id uuid primary key,
  client_id_hash text not null,
  spread_id text not null,
  question text not null default '',
  context text,
  cards jsonb not null,
  reading jsonb not null,
  locale text not null default 'zh' check (locale in ('en', 'zh')),
  created_at timestamptz not null default now()
);

create table if not exists public.followup_questions (
  id uuid primary key,
  client_id_hash text not null,
  reading_id uuid not null references public.reading_sessions(id) on delete cascade,
  question text not null,
  answer text,
  status text not null check (status in ('pending', 'answered', 'failed')),
  credit_cost integer not null default 0,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- Product analytics deliberately exclude question text, context, card names,
-- and generated reading content.
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  client_id_hash text not null,
  name text not null,
  reading_id uuid,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reading_sessions_client_idx
  on public.reading_sessions(client_id_hash, created_at desc);
create index if not exists followup_questions_client_reading_idx
  on public.followup_questions(client_id_hash, reading_id, created_at asc);
create index if not exists app_events_client_idx
  on public.app_events(client_id_hash, created_at);
create index if not exists app_events_name_idx
  on public.app_events(name, created_at desc);

alter table public.reading_sessions enable row level security;
alter table public.followup_questions enable row level security;
alter table public.app_events enable row level security;

revoke all on table public.reading_sessions from public, anon, authenticated;
revoke all on table public.followup_questions from public, anon, authenticated;
revoke all on table public.app_events from public, anon, authenticated;

grant all on table public.reading_sessions to service_role;
grant all on table public.followup_questions to service_role;
grant all on table public.app_events to service_role;
