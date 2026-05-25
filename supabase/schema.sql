-- Jianliya auth, credits, and payment schema.
-- Run this in the Supabase SQL editor before enabling paid AI features.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  feature text,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_ledger_ref_id_unique
  on public.credit_ledger (ref_id)
  where ref_id is not null;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null,
  amount_cents integer not null,
  credits integer not null,
  status text not null default 'pending',
  provider text not null default 'zpay',
  provider_trade_no text,
  pay_type text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payment_orders enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "credit_accounts_select_own" on public.credit_accounts;
create policy "credit_accounts_select_own" on public.credit_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own" on public.payment_orders
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_credits integer := 20;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.credit_accounts (user_id, balance)
  values (new.id, initial_credits)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, feature, ref_id)
  values (new.id, initial_credits, initial_credits, 'signup_bonus', 'signup', 'signup:' || new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_feature text,
  p_ref_id text,
  p_reason text default 'ai_usage',
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  next_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  insert into public.credit_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.credit_accounts
  where user_id = p_user_id
  for update;

  if current_balance < p_amount then
    raise exception 'insufficient_credits';
  end if;

  next_balance := current_balance - p_amount;

  update public.credit_accounts
  set balance = next_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, feature, ref_id, metadata)
  values (p_user_id, -p_amount, next_balance, p_reason, p_feature, p_ref_id, p_metadata);

  return next_balance;
end;
$$;

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_feature text,
  p_ref_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  insert into public.credit_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_accounts
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id
  returning balance into next_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, feature, ref_id, metadata)
  values (p_user_id, p_amount, next_balance, p_reason, p_feature, p_ref_id, p_metadata);

  return next_balance;
end;
$$;
