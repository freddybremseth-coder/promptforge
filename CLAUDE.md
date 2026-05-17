# Project: PromptForge

SaaS som genererer prompt-pakker for Claude Code. Bruker skriver et råmål, app produserer CLAUDE.md, SKILL.md-er og fase-prompts klare til å lime inn i Claude Code.

## Stack

- Next.js 16 App Router (TypeScript, strict mode)
- Supabase (Postgres + Auth + Storage)
- Stripe Checkout og Customer Portal
- Vercel deploy fra Git
- Vercel AI SDK med `@ai-sdk/anthropic`
- Modeller: `claude-haiku-4-5-20251001` for intervju, `claude-opus-4-7` for plan og render

## Conventions (MUST)

- MUST use Supabase RLS på alle nye tabeller før merge
- MUST write Zod-skjemaer i `src/lib/schemas.ts` for all AI-output
- MUST set `taskBudget` på alle Opus-kall (kostnadskontroll er prioritet 2)
- MUST use Edge runtime på streaming-routes, Node runtime kun for ZIP-generering
- MUST validate all AI-output mot Zod-skjema før lagring eller visning
- MUST NOT commit `.env.local` eller noen API-nøkkel
- MUST NOT bruke `claude-sonnet-4` eller eldre modeller — vi bruker Haiku 4.5 og Opus 4.7
- MUST NOT hardkode prisplaner i koden — les fra Stripe-produkter
- MUST NOT bygge SaaS-rørleggingen på nytt — vi har clonet `nextjs-subscription-payments`

## Project structure

- `src/app/` — Next.js App Router (sider og API-routes)
- `src/app/api/interview/` — Haiku-route for spørsmålsgenerering
- `src/app/api/plan/` — Opus-route for planlegging
- `src/app/api/render/` — Opus-route for filgenerering
- `src/app/api/export/` — Node-route for ZIP-bygging
- `src/lib/schemas.ts` — Alle Zod-skjemaer
- `src/lib/prompts/` — System-prompts som cacheable konstanter
- `src/presets/` — De tre stack-presettene
- `supabase/migrations/` — SQL-migrasjoner med tidsstempel-prefiks
- `evals/` — Eval-suite for kvalitetskontroll

## Workflow

- Branch fra `main`, PR tilbake til `main`
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Kjør `npm run typecheck && npm run lint` før commit
- Supabase-endringer: skriv migrasjon, kjør `npx supabase db push`
- Test alle AI-routes med 3 forskjellige input før merge
- Bruk Stripe CLI for å teste webhooks lokalt: `stripe listen --forward-to localhost:3000/api/webhooks`

## When stuck

- Les `docs/architecture.md` før du gjetter om dataflyt
- Read `.claude/skills/<navn>/SKILL.md` for spesifikke mønstre
- Sjekk Vercel-templatens originale dokumentasjon for Stripe/Supabase-rørlegging
- For AI SDK-spørsmål: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- Hvis schema-validering feiler: ikke godta delvis output, returner feil til brukeren

## Quality bars

- CLAUDE.md generert av appen MÅ være under 200 linjer
- SKILL.md description MÅ være under 1024 tegn
- SKILL.md MÅ bruke kebab-case for `name`
- Plan-fasen kjører `ultrathink` via `effort: 'xhigh'`
- Render-fasen har `taskBudget: 50000`
- Eval-suite må passere før hver deploy til produksjon
