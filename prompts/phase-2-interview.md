# Fase 2: Intervjuflyt (uke 2)

## Mål

Bygg den første AI-fasen: brukeren skriver et råmål, Haiku 4.5 genererer 3-6 målrettede spørsmål, brukeren svarer, og svarene lagres i `projects.context`.

## Forutsetninger

- Fase 1 fullført (tabellene finnes)
- `ANTHROPIC_API_KEY` satt i `.env.local`
- `npm install @ai-sdk/anthropic ai zod` kjørt

## Prompt å lime inn i Claude Code

```
ultrathink

Vi skal nå bygge den første AI-flyten i PromptForge: intervjueren.

EXPLORE:
1. Les .claude/skills/ai-streaming/SKILL.md
2. Les CLAUDE.md
3. Les eksisterende /src/app/ for å forstå app-strukturen
4. Sjekk om src/lib/ finnes, eller om vi må lage det

PLAN:
Vi trenger disse filene:

1. src/lib/schemas.ts
   - InterviewSchema (Zod): array av 3-6 spørsmål
   - Hvert spørsmål: id, text, kind (single_select | multi_select |
     free_text), options (når relevant), rationale

2. src/lib/prompts/interview-system.ts
   - INTERVIEW_SYSTEM_PROMPT som konstant streng
   - Forklar Haiku at den er intervjuer for Claude Code-prosjekter
   - Be om 3-6 spørsmål, multiple-choice der mulig
   - Ikke spør om åpenbare ting (stack er valgt senere)
   - Spørsmålene må produsere info Claude Code IKKE kan utlede selv

3. src/lib/models.ts
   - export const HAIKU = 'claude-haiku-4-5-20251001'
   - export const OPUS = 'claude-opus-4-7'

4. src/app/api/interview/route.ts
   - Edge runtime
   - POST: tar { rawGoal: string, projectId: string }
   - Auth-sjekk via Supabase
   - streamObject med InterviewSchema
   - System: INTERVIEW_SYSTEM_PROMPT (med cacheControl: ephemeral)
   - Prompt: rawGoal
   - Returner result.toTextStreamResponse()

5. src/app/new/page.tsx
   - Form med ett textarea: "Hva vil du bygge?"
   - Submit oppretter projects-rad og redirecter til /new/[id]/interview

6. src/app/new/[id]/interview/page.tsx
   - Bruker useObject hook
   - Viser spørsmål mens de streamer inn
   - QuestionCard-komponent per spørsmål
   - Submit lagrer svar i projects.context og redirecter til
     /new/[id]/stack

7. src/components/QuestionCard.tsx
   - Renderer single_select, multi_select, eller free_text
   - Tailwind, tilgjengelig (keyboard navigation, ARIA labels)

Vis meg planen før du implementerer.

CODE:
Implementer planen. Følg konvensjonene i CLAUDE.md. Schema-validering
er obligatorisk. Når jeg sier "kjør", test mot disse 3 råmålene:

1. "Jeg vil bygge en CRM for olivenbønder med kart"
2. "En todo-app med AI som prioriterer oppgavene"
3. "En budsjett-tracker for studenter med iCloud-sync"

Spørsmålene som genereres skal være forskjellige og relevante for
hvert prosjekt. Hvis ikke, juster INTERVIEW_SYSTEM_PROMPT.

COMMIT:
Conventional Commits: `feat(api): add interview route with haiku 4.5`
Inkluder en kort PR-beskrivelse av hva som ble bygget.
```

## Akseptansekriterier

- `/new` har et fungerende form
- Submit oppretter en rad i `projects` med status='interview'
- Redirects til `/new/[id]/interview` virker
- API-routet streamer 3-6 spørsmål per kall
- Hvert spørsmål har gyldig schema (Zod-parse passerer)
- Tre forskjellige råmål produserer tre forskjellige spørsmålssett
- Svar lagres i `projects.context` som JSONB
- Ingen `any` i TypeScript-koden
- `npm run typecheck && npm run lint` passerer

## Eval-utvidelse

Etter fase 2 skal eval-suiten utvides med:

```ts
// evals/interview.test.ts
test('interview generates 3-6 questions', async () => {
  const result = await runInterview("Bygg en CRM")
  expect(result.questions.length).toBeGreaterThanOrEqual(3)
  expect(result.questions.length).toBeLessThanOrEqual(6)
})

test('interview questions are distinct for different goals', async () => {
  const a = await runInterview("CRM for olivenbønder")
  const b = await runInterview("Todo-app for studenter")
  const overlap = countOverlappingQuestions(a.questions, b.questions)
  expect(overlap).toBeLessThan(2)
})
```

## Vanlige feil i denne fasen

- Glemmer å sette `runtime = 'edge'` — får treg cold start
- Sender rå brukerinput som system-prompt — sårbar for prompt injection
- Bruker `useObject` uten å håndtere `error`-state
- Glemmer auth-sjekk i API-routen
- Hardkoder modellstreng i stedet for å bruke konstant fra `src/lib/models.ts`

## Neste fase

Gå til `prompts/phase-3-plan-render.md` for plan- og render-fasen (Opus 4.7).
