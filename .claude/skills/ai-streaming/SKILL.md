---
name: ai-streaming
description: Use when working with Vercel AI SDK and Anthropic Claude API. Triggers include "streamObject", "streamText", "Anthropic", "Claude API", "AI route", "schema validation", "ultrathink", "taskBudget", and any API route under src/app/api/ that talks to Claude. Provides correct model strings, provider options, and the standard streaming pattern used in this project.
---

# AI Streaming Skill

## Correct model strings (May 2026)

ALDRI bruk gamle strenger. Disse er gjeldende:

| Modell | Streng | Bruk |
|---|---|---|
| Haiku 4.5 | `claude-haiku-4-5-20251001` | Intervju, billig classification |
| Opus 4.7 | `claude-opus-4-7` | Plan og render (dyrt, men nødvendig) |
| Sonnet 4.6 | `claude-sonnet-4-6` | Ikke i bruk i PromptForge, men referanse |

`claude-opus-4-7` er dateless og peker permanent på samme snapshot. `claude-haiku-4-5-20251001` har dato fordi den er pre-4.6-generasjonen.

## Standard streamObject pattern

Alle AI-routes i `/api/` bruker dette mønsteret:

```ts
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { MySchema } from '@/lib/schemas'
import { MY_SYSTEM_PROMPT } from '@/lib/prompts'

export const runtime = 'edge'

export async function POST(req: Request) {
  const body = await req.json()

  // Auth-sjekk
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Kvota-sjekk
  const quota = await checkQuota(user.id)
  if (!quota.ok) return new Response('Quota exceeded', { status: 402 })

  const result = streamObject({
    model: anthropic('claude-opus-4-7'),
    schema: MySchema,
    system: MY_SYSTEM_PROMPT,
    prompt: buildPrompt(body),
    providerOptions: {
      anthropic: {
        thinking: { type: 'adaptive' },
        effort: 'high',
        taskBudget: 50000,
      },
    },
  })

  return result.toTextStreamResponse()
}
```

## Effort-nivåer på Opus 4.7

| Effort | Bruk når |
|---|---|
| `low` | Aldri i PromptForge — bruk Haiku i stedet |
| `medium` | Aldri i PromptForge |
| `high` | Standard for render-fasen (filgenerering) |
| `xhigh` | Plan-fasen (arkitekturbeslutninger som krever ultrathink) |

`xhigh` koster mer i tokens, men spare deg for å regenerere planer som er feil.

## taskBudget per route

```ts
// /api/plan/route.ts
taskBudget: 30000

// /api/render/route.ts
taskBudget: 50000

// /api/interview/route.ts (Haiku, ikke nødvendig men trygt)
maxTokens: 2000
```

`taskBudget` er rådgivende — Opus prioriterer og avslutter ryddig. Det er ikke en hard cutoff.

## Prompt caching

System-prompts er lange og identiske mellom kall. Cache dem.

```ts
import { anthropic } from '@ai-sdk/anthropic'

const result = streamObject({
  model: anthropic('claude-opus-4-7'),
  schema: MySchema,
  messages: [
    {
      role: 'system',
      content: MY_SYSTEM_PROMPT,
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral' } }
      }
    },
    { role: 'user', content: userPrompt }
  ],
})
```

Cache hits er 90% billigere på input-tokens. Min 1024 tokens for cache på Opus.

## Schema validation pattern

Alle AI-output må valideres mot Zod-skjema. Hvis valideringen feiler, throw — ikke godta delvis output.

```ts
import { z } from 'zod'

export const PlanSchema = z.object({
  project_summary: z.string().min(20),
  phases: z.array(z.object({
    name: z.string(),
    goal: z.string(),
    thinking_level: z.enum(['normal', 'think', 'think_hard', 'ultrathink']),
  })).min(1).max(5),
})

// I client-koden:
const { object, isLoading, error } = useObject({
  api: '/api/plan',
  schema: PlanSchema,
})

if (error) {
  // Vis pen retry-UI, ikke kryptisk feilmelding
  return <RetryView error={error} />
}
```

## Streaming på frontend

```tsx
'use client'

import { useObject } from 'ai/react'
import { PackageSchema } from '@/lib/schemas'

export function PackageRenderer({ plan }: { plan: Plan }) {
  const { object, isLoading } = useObject({
    api: '/api/render',
    schema: PackageSchema,
    initialValue: { files: [] },
  })

  return (
    <div>
      {object?.files?.map((file, i) => (
        <FileCard
          key={file?.path ?? i}
          path={file?.path}
          content={file?.content}
          kind={file?.kind}
        />
      ))}
      {isLoading && <SkeletonFile />}
    </div>
  )
}
```

Hver felt i `object` kan være `undefined` mens streaming pågår. Husk optional chaining overalt.

## Common pitfalls

- ALDRI bruk Node `fs` i Edge-routes — Vercel deploy crasher
- ALDRI hardkod model-strenger på flere steder — bruk konstanter fra `src/lib/models.ts`
- ALDRI godta `object` fra `useObject` uten å sjekke loading-state
- ALDRI send brukerinput direkte inn i system-prompt — bygg prompt fra schema-validert data
- ALDRI logg full prompt med API-respons i produksjon — det inneholder potensielt brukerdata

## Hvis modellen returnerer dårlig output

Sjekk i denne rekkefølgen:

1. Er schema-en for restriktiv? Loosen `min/max` constraints
2. Er system-prompten for kort eller for vag? Legg til eksempler
3. Bruker du `high` effort der du burde brukt `xhigh`?
4. Er prompt caching ødelagt? Cache er sensitiv for ENHVER endring i prefix
5. Er `taskBudget` for lav? Modellen kutter for tidlig
