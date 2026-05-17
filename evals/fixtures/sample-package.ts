import type { PromptPackage } from '@/lib/schemas'

// A locally-curated fixture that mirrors what the renderer SHOULD produce.
// This lets the eval suite run offline (no API calls) and acts as the
// golden output we compare future model changes against.

export const SAMPLE_NEXT_PACKAGE: PromptPackage = {
  files: [
    {
      path: 'CLAUDE.md',
      kind: 'claude_md',
      content: `# Project: Olive CRM

CRM for spanske olivenbønder. Kart over teiger, frostvarsel via SMS, månedlig faktura
til kjøpere. Brukere er ikke-tekniske, mobil-først.

## Stack

- Next.js 16 App Router (TypeScript strict)
- Supabase (Postgres + Auth + Storage)
- Vercel deploy

## Conventions (MUST)

- MUST use Supabase RLS på alle nye tabeller før merge
- MUST validere all AI-output mot Zod-skjema
- MUST NOT commit .env.local
- MUST NOT hardkode prisplaner i koden — les fra Stripe
- SHOULD bruke Server Components der mulig

## Project structure

- src/app/ — Next.js App Router
- src/lib/ — delte hjelpere
- supabase/migrations/ — SQL-migrasjoner

## Workflow

- Branch fra main, PR tilbake
- Conventional Commits (feat:, fix:, chore:)
- Kjør npm run typecheck og npm run lint før commit

## When stuck

- Les .claude/skills/supabase-migration/SKILL.md for database-mønstre
- Les .claude/skills/vercel-deploy/SKILL.md for runtime-valg

## Quality bars

- CLAUDE.md under 200 linjer
- Hver tabell har RLS før merge
- Ingen any i TypeScript-koden
`,
    },
    {
      path: '.claude/skills/supabase-migration/SKILL.md',
      kind: 'skill',
      content: `---
name: supabase-migration
description: Use when creating or modifying database tables, adding columns, writing RLS policies, or making any schema change. Triggers include "add table", "migration", "RLS", "policy", "alter table".
---

# Supabase Migration Skill

## When to use this

Any schema change. Trigger phrases: "lag tabell", "add column", "RLS", "migration".

## File naming

\`YYYYMMDDHHMMSS_kort_beskrivelse.sql\` i \`supabase/migrations/\`.

## Standard pattern

\`\`\`sql
create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null
);
alter table fields enable row level security;
create policy "fields_select_own" on fields
  for select using (auth.uid() = user_id);
\`\`\`

## Common pitfalls

- ALDRI commit en tabell uten RLS
- ALDRI bruk \`for all\` i policies — del opp eksplisitt
- Test alltid policies med både anon og autentisert rolle
`,
    },
    {
      path: 'prompts/phase-0-setup.md',
      kind: 'phase_prompt',
      content: `# Fase 0: Setup

## Mål

Få Next.js og Supabase til å kjøre lokalt med Auth.

## Forutsetninger

- Node 18+
- Supabase-konto

## Prompt å lime inn i Claude Code

\`\`\`
think hard

EXPLORE først: Les CLAUDE.md og .claude/skills/supabase-migration/SKILL.md.
PLAN: Forklar hva som må gjøres.
CODE: Implementer.
COMMIT: Conventional Commits.
\`\`\`

## Akseptansekriterier

- npm run dev kjører
- Bruker kan opprettes via Auth

## Neste fase

phase-1-schema.md
`,
    },
    {
      path: 'README.md',
      kind: 'readme',
      content: `# Olive CRM prompt-pakke

Drop filene inn i prosjektmappen. Åpne Claude Code, og følg prompts/phase-0-setup.md.
Bruk /clear mellom faser.
`,
    },
  ],
}
