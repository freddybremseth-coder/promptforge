-- Migration: PromptForge core tables
-- Reason: projects, generated packages, and per-user quotas with RLS

-- 1. projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  raw_goal text not null,
  context jsonb not null default '{}'::jsonb,
  preset text not null check (preset in (
    'next-supabase-vercel',
    'astro-sqlite-cloudflare',
    'python-fastapi-postgres'
  )),
  status text not null default 'interview' check (status in (
    'interview', 'generating', 'ready', 'archived'
  )),
  plan jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_projects_status on projects(status);

alter table projects enable row level security;

create policy "projects_select_own" on projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_own" on projects
  for delete using (auth.uid() = user_id);

create trigger projects_set_updated_at
  before update on projects
  for each row execute function moddatetime(updated_at);

-- 2. prompt_packages
create table if not exists prompt_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects on delete cascade not null,
  files jsonb not null,
  model_used text not null,
  token_cost int,
  generated_at timestamptz default now()
);

create index if not exists idx_packages_project_id on prompt_packages(project_id);

alter table prompt_packages enable row level security;

create policy "prompt_packages_select_own" on prompt_packages
  for select using (
    project_id in (select id from projects where user_id = auth.uid())
  );
create policy "prompt_packages_insert_own" on prompt_packages
  for insert with check (
    project_id in (select id from projects where user_id = auth.uid())
  );
create policy "prompt_packages_update_own" on prompt_packages
  for update using (
    project_id in (select id from projects where user_id = auth.uid())
  );
create policy "prompt_packages_delete_own" on prompt_packages
  for delete using (
    project_id in (select id from projects where user_id = auth.uid())
  );

-- 3. usage_quotas
create table if not exists usage_quotas (
  user_id uuid primary key references auth.users on delete cascade,
  packages_this_month int not null default 0,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  packages_per_month int not null default 1,
  reset_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz default now()
);

alter table usage_quotas enable row level security;

create policy "usage_quotas_select_own" on usage_quotas
  for select using (auth.uid() = user_id);
create policy "usage_quotas_update_own" on usage_quotas
  for update using (auth.uid() = user_id);

create trigger usage_quotas_set_updated_at
  before update on usage_quotas
  for each row execute function moddatetime(updated_at);

-- 4. Increment helper (called from server with service-role key)
create or replace function public.increment_quota(p_user_id uuid)
returns void as $$
begin
  insert into usage_quotas (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update usage_quotas
     set packages_this_month = packages_this_month + 1
   where user_id = p_user_id;
end;
$$ language plpgsql security definer;
