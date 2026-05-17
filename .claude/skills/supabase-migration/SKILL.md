---
name: supabase-migration
description: Use when creating or modifying database tables, adding columns, writing RLS policies, or making any schema change. Triggers include "add table", "migration", "RLS", "policy", "alter table", and any mention of database schema. Provides naming conventions, RLS templates, and verification steps for Supabase migrations in this project.
---

# Supabase Migration Skill

## When to use this

Any time the user asks for a schema change. Trigger phrases: "lag tabell", "add column", "RLS", "policy", "migration", "alter table".

## File naming

Migrations live in `supabase/migrations/` med format:

```
YYYYMMDDHHMMSS_kort_beskrivelse.sql
```

Eksempel: `20260517143022_add_projects_table.sql`

Bruk denne kommandoen for å generere tidsstempel:

```bash
date -u +"%Y%m%d%H%M%S"
```

## Migration template

```sql
-- Migration: <hva endrer du>
-- Reason: <hvorfor>

-- 1. Lag tabell
create table if not exists <table_name> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  -- domene-spesifikke felter her
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Indekser
create index if not exists idx_<table>_user_id on <table_name>(user_id);

-- 3. RLS er obligatorisk
alter table <table_name> enable row level security;

-- 4. Policies (alltid named, aldri anonyme)
create policy "<table>_select_own" on <table_name>
  for select using (auth.uid() = user_id);

create policy "<table>_insert_own" on <table_name>
  for insert with check (auth.uid() = user_id);

create policy "<table>_update_own" on <table_name>
  for update using (auth.uid() = user_id);

create policy "<table>_delete_own" on <table_name>
  for delete using (auth.uid() = user_id);

-- 5. updated_at trigger
create trigger set_updated_at
  before update on <table_name>
  for each row execute function moddatetime(updated_at);
```

## Cross-table references

Hvis en tabell refererer til en annen som har user_id (eks: `prompt_packages` → `projects`), bruk subquery i policy:

```sql
create policy "prompt_packages_select_own" on prompt_packages
  for select using (
    project_id in (select id from projects where user_id = auth.uid())
  );
```

## Verification

Etter hver migrasjon, kjør disse:

```bash
# Apply lokalt
npx supabase db reset

# Verifiser RLS er på
npx supabase db dump --schema public | grep "alter table.*enable row level security"

# Test policies med en testbruker
npx supabase db query "set role anon; select * from <table_name>;"
# Skal returnere 0 rader (anon har ikke tilgang)
```

## Common mistakes to avoid

- ALDRI commit en tabell uten RLS — det er en sikkerhetsfeil
- ALDRI bruk `for all` i policies — del opp i select/insert/update/delete for å være eksplisitt
- ALDRI hardkod `auth.uid()` verdier — det gjør policies ubrukelige i testing
- ALDRI dropp `if not exists` på `create table` — det gjør migrasjoner ikke-idempotente
- Test alltid policies med både autentisert og anon role før merge

## Standardtabeller i PromptForge

Hovedtabellene er:

- `projects` — brukerens prosjekter (raw_goal, context, preset, status)
- `prompt_packages` — genererte pakker (project_id, files jsonb, model_used, token_cost)
- `usage_quotas` — månedlige kvoter (user_id, packages_this_month, plan, reset_at)

Templatens egne tabeller (`customers`, `subscriptions`, `prices`, `products`) endres ikke.
