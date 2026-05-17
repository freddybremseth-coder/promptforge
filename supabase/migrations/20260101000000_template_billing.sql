-- Migration: nextjs-subscription-payments template tables
-- Reason: Stripe-driven subscriptions, customers, products, prices

create extension if not exists moddatetime;
create extension if not exists pgcrypto;

do $$ begin
  create type pricing_type as enum ('one_time', 'recurring');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pricing_plan_interval as enum ('day', 'week', 'month', 'year');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'unpaid', 'paused'
  );
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb
);
alter table users enable row level security;
drop policy if exists "users_select_self" on users;
create policy "users_select_self" on users for select using (auth.uid() = id);
drop policy if exists "users_update_self" on users;
create policy "users_update_self" on users for update using (auth.uid() = id);

create table if not exists customers (
  id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text
);
alter table customers enable row level security;

create table if not exists products (
  id text primary key,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb
);
alter table products enable row level security;
drop policy if exists "products_select_public" on products;
create policy "products_select_public" on products for select using (true);

create table if not exists prices (
  id text primary key,
  product_id text references products,
  active boolean,
  description text,
  unit_amount bigint,
  currency text check (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb
);
alter table prices enable row level security;
drop policy if exists "prices_select_public" on prices;
create policy "prices_select_public" on prices for select using (true);

create table if not exists subscriptions (
  id text primary key,
  user_id uuid references auth.users not null,
  status subscription_status,
  metadata jsonb,
  price_id text references prices,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamptz default now(),
  current_period_start timestamptz default now(),
  current_period_end timestamptz default now(),
  ended_at timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz
);
alter table subscriptions enable row level security;
drop policy if exists "subscriptions_select_own" on subscriptions;
create policy "subscriptions_select_own" on subscriptions
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
