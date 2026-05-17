# PromptForge

SaaS that turns a one-line goal into a Claude Code prompt-package: `CLAUDE.md`,
Skills under `.claude/skills/`, phase prompts, and a README, ready to drop into
any new repo.

## Stack

- Next.js 16 (App Router, TypeScript strict)
- Supabase Postgres + Auth + Storage with RLS
- Stripe Checkout + Customer Portal
- Vercel AI SDK + Anthropic (Haiku 4.5 for interview, Opus 4.7 for plan/render)
- Vitest for the eval suite

## Flow

```
/          Landing
/new       Type your goal
  →  /new/[id]/interview   Haiku asks 3-6 questions
  →  /new/[id]/stack       Pick one of three presets
  →  /new/[id]/plan        Opus ultrathinks the architecture
  →  /new/[id]/generate    Opus streams the files live
  →  /new/[id]/done        Download ZIP / copy bash snippet
/dashboard Browse + re-download earlier packages
/account   Billing, plan, quota, sign out
```

## Setup

```bash
cp .env.local.example .env.local   # fill in keys
npm install
npx supabase db reset              # applies migrations under supabase/migrations/
npm run dev
```

In a second terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next-lint |
| `npm run eval` | Vitest quality gates over a fixture package |
| `npm run eval:ui` | Same, with the Vitest UI |

## Layout

```
src/app/                 Pages and route handlers
src/app/api/             Edge AI routes (interview, plan, render) + Node routes (export, webhooks)
src/lib/schemas.ts       Zod schemas for every AI boundary
src/lib/prompts/         System prompts (cacheable constants)
src/lib/quota.ts         Quota check + increment
src/lib/supabase/        Server, browser, and admin clients
src/lib/stripe.ts        Stripe client and plan metadata helpers
src/presets/             Stack presets injected into the planner
src/components/          QuotaIndicator, QuestionCard, FileRenderer
src/proxy.ts             Auth-refresh proxy (Next.js 16 middleware convention)
supabase/migrations/     Timestamped SQL migrations
evals/                   Vitest suite — fixture-based, runs offline
```

## Stripe products

Three products in metadata-driven mode:

| plan_id | packages_per_month |
|---|---|
| free | 1 |
| starter | 10 |
| pro | 999 |

The webhook (`src/app/api/webhooks/route.ts`) upserts `usage_quotas` from these
two metadata fields. Change limits in the Stripe Dashboard, not in code.

## Cost expectations

- Interview (Haiku): ~$0.001-0.005 per call
- Plan (Opus + ultrathink): ~$0.40-0.70 per pack
- Render (Opus): ~$0.10-0.20 per pack

Cache control is `ephemeral` on every system prompt — keep it that way or
costs balloon.
