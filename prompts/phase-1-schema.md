# Fase 1: Database-skjema (uke 1, slutten)

## Mål

Utvide Vercel-templatens skjema med PromptForge-tabellene: `projects`, `prompt_packages`, og `usage_quotas`. Alle med RLS-policies som faktisk er testet.

## Forutsetninger

- Fase 0 er fullført
- Supabase-prosjektet kjører lokalt med `npx supabase start`
- Templatens egne tabeller (`customers`, `subscriptions`, `products`, `prices`) er allerede på plass

## Prompt å lime inn i Claude Code

```
think hard

EXPLORE først:
1. Les .claude/skills/supabase-migration/SKILL.md grundig
2. Les eksisterende migrasjoner i supabase/migrations/
3. Identifiser hvordan templaten kobler subscriptions til auth.users

PLAN:
Lag en migrasjon som legger til disse tabellene:

1. `projects`
   - id uuid pk
   - user_id uuid refs auth.users
   - raw_goal text not null
   - context jsonb default '{}'
   - preset text not null (verdier: 'next-supabase-vercel',
     'astro-sqlite-cloudflare', 'python-fastapi-postgres')
   - status text default 'interview' (check: 'interview',
     'generating', 'ready', 'archived')
   - created_at, updated_at timestamptz

2. `prompt_packages`
   - id uuid pk
   - project_id uuid refs projects on delete cascade
   - files jsonb not null (array av {path, content, kind})
   - model_used text not null
   - token_cost int
   - generated_at timestamptz

3. `usage_quotas`
   - user_id uuid pk refs auth.users
   - packages_this_month int default 0
   - plan text default 'free' (check: 'free', 'starter', 'pro')
   - reset_at timestamptz default now() + interval '30 days'

Alle tabeller MÅ ha RLS aktivert og fire navngitte policies (select,
insert, update, delete). For prompt_packages må policy bruke subquery
mot projects-tabellen.

Lag også en trigger for å auto-oppdatere updated_at på projects.

Vis meg planen før du implementerer.

CODE:
Etter at jeg godkjenner planen, lag migrasjonsfilen med riktig
tidsstempel-prefix. Bruk `date -u +"%Y%m%d%H%M%S"` for å generere det.

Etter migrasjonsfilen er skrevet:
1. Kjør `npx supabase db reset` for å apply lokalt
2. Verifiser med en testbruker at RLS faktisk fungerer
3. Skriv en kort test som setter role anon og forsøker å lese
   en annen brukers rad (skal feile)

COMMIT:
Conventional Commits: `feat(db): add projects, packages, and quotas tables`
```

## Akseptansekriterier

- En enkelt migrasjonsfil i `supabase/migrations/` med riktig tidsstempel
- `npx supabase db reset` kjører uten feil
- Test viser at autentisert bruker A ikke kan lese bruker Bs rader
- Test viser at anon-rolle ikke har noen tilgang
- `prompt_packages` policy bruker subquery mot `projects.user_id`
- TypeScript-typer er regenerert: `npx supabase gen types typescript --local > src/types/supabase.ts`

## Verifikasjonsskript

Be Claude Code skrive dette og kjøre det:

```sql
-- Som anon (skal returnere 0 rader på alle)
set role anon;
select count(*) from projects;
select count(*) from prompt_packages;
select count(*) from usage_quotas;
reset role;

-- Som bruker (skal bare se egne rader)
-- Forutsetter at testbruker er logget inn
```

## Vanlige feil i denne fasen

- Glemmer å enable RLS — legg til en eval-test som scanner alle tabeller
- Bruker `for all` i policy i stedet for å skille select/insert/update/delete
- Glemmer å regenerere TypeScript-typer etter skjema-endring
- Tester ikke faktisk med anon-rolle

## Neste fase

Gå til `prompts/phase-2-interview.md` for å bygge intervjuflyten.
