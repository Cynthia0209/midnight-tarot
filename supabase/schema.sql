create table if not exists public.reading_sessions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id_hash text,
  spread_id text not null,
  question text default '',
  context text,
  cards jsonb not null,
  reading jsonb not null,
  created_at timestamptz not null default now(),
  constraint reading_sessions_owner_check check (user_id is not null or client_id_hash is not null)
);

alter table public.reading_sessions alter column user_id drop not null;
alter table public.reading_sessions add column if not exists client_id_hash text;

create table if not exists public.credit_packages (
  id text primary key,
  title text not null,
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  active boolean not null default true
);

insert into public.credit_packages (id, title, credits, amount_cents, active)
values
  ('single-question', '追问 1 次', 1, 100, true),
  ('five-questions', '追问 5 次', 5, 300, true)
on conflict (id) do update set
  title = excluded.title,
  credits = excluded.credits,
  amount_cents = excluded.amount_cents,
  active = excluded.active;

create table if not exists public.payment_orders (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id_hash text,
  package_id text not null references public.credit_packages(id),
  provider text not null,
  provider_order_id text unique,
  channel text not null check (channel in ('alipay', 'wechat')),
  amount_cents integer not null,
  credits integer not null,
  status text not null check (status in ('pending', 'paid', 'expired', 'cancelled', 'failed')),
  payment_url text,
  qr_code_url text,
  recovery_code_hash text,
  raw jsonb,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_orders_owner_check check (user_id is not null or client_id_hash is not null)
);

alter table public.payment_orders alter column user_id drop not null;
alter table public.payment_orders add column if not exists client_id_hash text;
alter table public.payment_orders add column if not exists recovery_code_hash text;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id_hash text,
  order_id uuid references public.payment_orders(id),
  followup_id uuid,
  delta integer not null,
  reason text not null check (reason in ('purchase', 'followup_hold', 'followup_spent', 'followup_refund', 'expiry_adjustment')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint credit_ledger_owner_check check (user_id is not null or client_id_hash is not null)
);

alter table public.credit_ledger alter column user_id drop not null;
alter table public.credit_ledger add column if not exists client_id_hash text;

create table if not exists public.followup_questions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id_hash text,
  reading_id uuid not null references public.reading_sessions(id) on delete cascade,
  question text not null,
  answer text,
  status text not null check (status in ('pending', 'answered', 'failed')),
  credit_cost integer not null default 1,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  constraint followup_questions_owner_check check (user_id is not null or client_id_hash is not null)
);

alter table public.followup_questions alter column user_id drop not null;
alter table public.followup_questions add column if not exists client_id_hash text;

create index if not exists reading_sessions_client_idx on public.reading_sessions(client_id_hash, created_at desc);
create index if not exists credit_ledger_client_expires_idx on public.credit_ledger(client_id_hash, expires_at);
create index if not exists followup_questions_client_reading_idx on public.followup_questions(client_id_hash, reading_id, created_at desc);
create index if not exists payment_orders_client_status_idx on public.payment_orders(client_id_hash, status, created_at desc);
create index if not exists payment_orders_user_status_idx on public.payment_orders(user_id, status, created_at desc);

create or replace function public.available_credits(p_client_id_hash text)
returns integer
language sql
stable
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where client_id_hash = p_client_id_hash
    and (expires_at is null or expires_at > now());
$$;

create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_provider_order_id text,
  p_raw jsonb
)
returns table(order_id uuid, client_id_hash text, credits integer)
language plpgsql
security definer
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select * into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    return query select v_order.id, v_order.client_id_hash, v_order.credits;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order_not_pending';
  end if;

  update public.payment_orders
  set status = 'paid',
      provider_order_id = coalesce(provider_order_id, p_provider_order_id),
      raw = coalesce(raw, '{}'::jsonb) || coalesce(p_raw, '{}'::jsonb),
      paid_at = now(),
      updated_at = now()
  where id = p_order_id;

  insert into public.credit_ledger (user_id, client_id_hash, order_id, delta, reason, expires_at)
  values (v_order.user_id, v_order.client_id_hash, v_order.id, v_order.credits, 'purchase', now() + interval '30 days');

  return query select v_order.id, v_order.client_id_hash, v_order.credits;
end;
$$;

create or replace function public.consume_credit_for_followup(
  p_client_id_hash text,
  p_followup_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_available integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_client_id_hash));

  select public.available_credits(p_client_id_hash) into v_available;
  if v_available < 1 then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger (client_id_hash, followup_id, delta, reason)
  values (p_client_id_hash, p_followup_id, -1, 'followup_hold');

  return v_available - 1;
end;
$$;

create or replace function public.refund_followup_credit(
  p_client_id_hash text,
  p_followup_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if exists (
    select 1 from public.credit_ledger
    where client_id_hash = p_client_id_hash
      and followup_id = p_followup_id
      and reason = 'followup_refund'
  ) then
    return;
  end if;

  insert into public.credit_ledger (client_id_hash, followup_id, delta, reason, expires_at)
  values (p_client_id_hash, p_followup_id, 1, 'followup_refund', now() + interval '30 days');
end;
$$;
