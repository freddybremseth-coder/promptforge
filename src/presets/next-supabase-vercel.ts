import type { Preset } from './types'

export const nextSupabaseVercel: Preset = {
  id: 'next-supabase-vercel',
  name: 'Next.js + Supabase + Vercel',
  tagline: 'TypeScript App Router, Supabase Postgres med RLS, Vercel deploy.',
  defaultConventions: [
    'MUST use Supabase RLS on every new table before merge',
    'MUST use Edge runtime for streaming routes, Node only when required (ZIP, webhooks)',
    'MUST validate all AI-output against a Zod schema before storing or showing',
    'MUST NOT commit .env.local or any API key',
    'MUST NOT hardcode pricing plans in code — read from Stripe products',
    'SHOULD prefer Server Components and keep client components small',
  ],
  stackContext: `Stack details for the planner and renderer:
- Next.js 16 App Router with TypeScript strict mode
- Supabase (Postgres + Auth + Storage), accessed via @supabase/ssr server client
- Vercel deploy from Git with Edge and Node runtimes split by route
- Vercel AI SDK with @ai-sdk/anthropic for streaming structured output
- Stripe Checkout + Customer Portal, webhook on Node runtime
- Tailwind for styling, server-first data loading

Conventions the team already follows:
- Schemas in src/lib/schemas.ts, system prompts in src/lib/prompts/
- Migrations in supabase/migrations/ with timestamp-prefixed filenames
- Tests in evals/ run via vitest
- Conventional Commits with scopes: api, ui, db, auth, billing, eval, prompts`,
  skillBlueprints: [
    'supabase-migration',
    'vercel-deploy',
    'ai-streaming',
    'git-commit',
  ],
}
