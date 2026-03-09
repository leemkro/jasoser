create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_status text default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_key text,
  toss_customer_key text,
  current_period_end timestamptz,
  credits integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  tone text not null,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  usage_date date not null,
  used_count integer not null default 0,
  limit_count integer not null default 3,
  created_at timestamptz default now(),
  unique (user_id, feature, usage_date)
);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.daily_usage enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_upsert_own"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "generations_select_own"
on public.generations
for select
using (auth.uid() = user_id);

create policy "generations_insert_own"
on public.generations
for insert
with check (auth.uid() = user_id);

create policy "daily_usage_select_own"
on public.daily_usage
for select
using (auth.uid() = user_id);

create policy "daily_usage_modify_own"
on public.daily_usage
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
