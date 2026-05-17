# Fase 3: Plan og render (uke 3)

## Mål

Bygg de to dyre AI-fasene. Plan-fasen bruker Opus 4.7 med ultrathink for arkitekturbeslutninger. Render-fasen bruker Opus 4.7 med streaming for å generere pakkefilene live til brukeren.

Dette er kvaliteten-på-output-fasen. Bruk tid her.

## Forutsetninger

- Fase 2 fullført (intervju lagrer svar i `projects.context`)
- Du har testet at intervjuet produserer god output

## Prompt å lime inn i Claude Code

```
ultrathink

Dette er den viktigste fasen i hele PromptForge — kvaliteten på
prompt-pakkene som genereres avhenger av hvor presise system-prompts
vi skriver her.

EXPLORE:
1. Les .claude/skills/ai-streaming/SKILL.md
2. Les CLAUDE.md
3. Les src/lib/schemas.ts og src/lib/prompts/ for eksisterende
   mønstre fra fase 2
4. Sjekk hva /api/interview gjør for å holde konsistens

PLAN:
Vi trenger to nye API-routes og to nye sider.

API-routes:

1. src/app/api/plan/route.ts
   - Edge runtime
   - POST: tar { projectId }
   - Auth + kvota-sjekk
   - Henter projects-raden med raw_goal og context
   - streamObject med PlanSchema
   - Model: claude-opus-4-7
   - providerOptions.anthropic:
     - thinking: { type: 'adaptive' }
     - effort: 'xhigh'  (ultrathink)
     - taskBudget: 30000
   - System: PLAN_SYSTEM_PROMPT med cacheControl
   - Oppdaterer projects.status = 'generating' når ferdig

2. src/app/api/render/route.ts
   - Edge runtime
   - POST: tar { projectId, plan }
   - Auth + kvota-sjekk
   - streamObject med PackageSchema
   - Model: claude-opus-4-7
   - effort: 'high', taskBudget: 50000
   - System: RENDERER_SYSTEM_PROMPT med cacheControl
   - Når ferdig: insert i prompt_packages og update projects.status = 'ready'

Schemas (utvid src/lib/schemas.ts):

3. PlanSchema
   - project_summary: string (min 50 tegn)
   - conventions: array av { rule, severity: MUST | MUST_NOT | SHOULD }
   - phases: array (1-5) av { name, goal, thinking_level, depends_on[] }
   - skills_needed: array (0-4) av { name (kebab-case regex),
     description (max 1024), rationale }
   - hooks_recommended: array av string

4. PackageSchema
   - files: array av { path, content, kind: claude_md | skill |
     phase_prompt | hook | readme }

System-prompts (lag src/lib/prompts/plan-system.ts og
render-system.ts):

5. PLAN_SYSTEM_PROMPT
   - Forklar Claude Code's arkitektur (Explore→Plan→Code→Commit)
   - CLAUDE.md max 200 linjer, MUST/MUST_NOT-format
   - Skills i .claude/skills/<navn>/SKILL.md, YAML frontmatter
   - description må inneholde trigger-fraser ("Use when...")
   - 1-4 Skills per prosjekt (ikke kjøkkenvask)
   - max 5 faser
   - "ultrathink om arkitekturvalgene før du svarer"

6. RENDERER_SYSTEM_PROMPT
   - Tar planen og produserer faktiske filer
   - CLAUDE.md-regler (under 200 linjer, MUST/ALDRI-format,
     Stack/Conventions/Workflow/When stuck-seksjoner)
   - SKILL.md-regler (kebab-case name, description med trigger-
     fraser, body under 500 linjer)
   - Fase-prompts: hver fase har Mål, Forutsetninger, Eksakt prompt,
     Akseptansekriterier
   - Bruk 'think hard' i Plan-fase, 'ultrathink' kun for arkitektur
   - Inkluder /clear-instruks mellom faser

Sider:

7. src/app/new/[id]/plan/page.tsx
   - Etter intervju → trigger /api/plan
   - Vis planen i lesbar form (ikke rå JSON)
   - "Godkjenn og generer pakke" → /new/[id]/generate
   - Mulighet til å justere planen (v2-feature, men forbered datastruktur)

8. src/app/new/[id]/generate/page.tsx
   - Bruker useObject mot /api/render
   - FileRenderer-komponent som viser filer live
   - Når ferdig → redirect til /new/[id]/done

Komponent:

9. src/components/FileRenderer.tsx
   - Tar { path, content, kind }
   - Syntax-highlighting basert på filendelse (bruk shiki eller
     prism-react-renderer)
   - Header med filnavn og copy-knapp
   - Skeleton-state mens content streamer

Vis meg planen før du implementerer. Vær spesifikk om hva som er
ulikt fra fase 2 — vi har allerede en streamObject-mal.

CODE:
Implementer. Når jeg sier "kjør", test med de samme 3 råmålene
fra fase 2. Manuelt vurder:

1. Er CLAUDE.md som ble generert under 200 linjer?
2. Har den MUST/ALDRI-format?
3. Har den de fire påkrevde seksjonene (Stack, Conventions,
   Workflow, When stuck)?
4. Er SKILL.md-er kebab-case og har gyldig frontmatter?
5. Har fase-prompts faktisk Mål/Forutsetninger/Prompt/
   Akseptansekriterier?

Hvis nei på noen — juster system-prompten og test igjen. Iterer
til alle tre testprosjekter produserer kvalitetspakker.

COMMIT:
Bygg én commit per logisk endring:
1. feat(schemas): add plan and package schemas
2. feat(prompts): add plan and render system prompts
3. feat(api): add plan route with opus 4.7 ultrathink
4. feat(api): add render route with streaming
5. feat(ui): add plan and generate pages
```

## Akseptansekriterier

- Plan-route returnerer schema-validert plan på 30-60 sekunder
- Render-route streamer pakkefiler live
- Generert CLAUDE.md er under 200 linjer for alle 3 testprosjekter
- Generert SKILL.md har valid YAML-frontmatter
- Fase-prompts har de fire påkrevde seksjonene
- `prompt_packages.files` lagres som JSONB med alle filer
- `projects.status` oppdateres riktig gjennom flyten
- Token-kostnad logges i `prompt_packages.token_cost`

## Kostnadsovervåkning

Etter denne fasen, sjekk Anthropic Console for token-bruk per testrun.

Forventet kost per genererte pakke:
- Intervju: $0.001-0.005
- Plan med ultrathink: $0.40-0.70
- Render: $0.10-0.20
- Sum: $0.50-0.90

Hvis du er over $1 per pakke, sjekk:
- Er prompt caching aktivert? (cacheControl: ephemeral)
- Er taskBudget satt?
- Er system-prompten unødvendig lang?

## Eval-utvidelse

```ts
// evals/plan.test.ts
test('plan stays within 5 phases', async () => {
  const plan = await runPlan(/*...*/)
  expect(plan.phases.length).toBeLessThanOrEqual(5)
})

test('skills are kebab-case', async () => {
  const plan = await runPlan(/*...*/)
  for (const skill of plan.skills_needed) {
    expect(skill.name).toMatch(/^[a-z][a-z0-9-]*$/)
  }
})

// evals/render.test.ts
test('generated CLAUDE.md is under 200 lines', async () => {
  const pkg = await runRender(/*...*/)
  const claudeMd = pkg.files.find(f => f.kind === 'claude_md')
  expect(claudeMd.content.split('\n').length).toBeLessThan(200)
})

test('skill descriptions contain trigger phrases', async () => {
  const pkg = await runRender(/*...*/)
  const skills = pkg.files.filter(f => f.kind === 'skill')
  for (const skill of skills) {
    expect(skill.content).toMatch(/use when|triggers? include/i)
  }
})
```

## Vanlige feil i denne fasen

- For lang system-prompt — den må være under 4000 tokens for å være praktisk
- Glemmer cacheControl: ephemeral — kostnaden eksploderer
- Bruker effort: 'high' i stedet for 'xhigh' i plan-fasen — får dårligere arkitektur
- Glemmer å oppdatere status på `projects` — UI henger
- FileRenderer crash på undefined fields under streaming — bruk optional chaining

## Neste fase

Gå til `prompts/phase-4-presets.md` for å bygge de tre stack-presettene.
