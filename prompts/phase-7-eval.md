# Fase 7: Eval-suite og kvalitetssikring (uke 7)

## Mål

Bygg automatiserte tester som verifiserer at genererte pakker holder kvalitet. Du må kunne kjøre `npm run eval` og se grønt før hver deploy. Dette er sikkerhetsnettet som lar deg endre prompts uten å frykte regresjon.

## Forutsetninger

- Fase 6 fullført
- Du har minst 5 ekte testprosjekter du har generert pakker for

## Prompt å lime inn i Claude Code

```
ultrathink

Dette er kvalitetsporten før lansering. Hvis evals ikke er solide,
har vi ingen objektiv målestokk på om en system-prompt-endring
forbedret eller forverret output.

EXPLORE:
1. Les .claude/skills/ai-streaming/SKILL.md
2. Les eksisterende test-oppsett (vitest? jest?)
3. Sjekk om templaten har en evals-mappe eller om vi må lage den

PLAN:

1. Installer test-stack:
   - vitest (raskest for TypeScript)
   - @vitest/ui (visuell rapport)

2. evals/fixtures/testprojects.ts
   - Array av 20 testprosjekter
   - Hvert: { rawGoal, preset, expectedSkills[], expectedPhases }
   - Dekker bredt: SaaS, internt verktøy, hobby, kommersielt
   - Inkluderer edge cases: veldig vag goal, veldig spesifikk goal,
     ikke-engelsk goal, goal som krever auth, goal som krever betaling

3. evals/run-pipeline.ts
   - Helper: kjør hele pipelinen for en fixture
   - Returner { interview, plan, package, tokenCost, durationMs }
   - Cache resultater på disk (filename: hash av rawGoal+preset)
   - Bare regenerer hvis --no-cache flag

4. evals/claude-md.test.ts
   For hvert testprosjekt:
   - CLAUDE.md eksisterer i package.files
   - Linjeantall < 200
   - Inneholder ## Stack
   - Inneholder ## Conventions (MUST)
   - Inneholder ## Workflow
   - Inneholder ## When stuck
   - Inneholder minst 3 MUST-regler
   - Ingen secrets (regex på sk_, pk_, whsec_, AKIA)

5. evals/skills.test.ts
   For hver SKILL.md i package.files:
   - YAML-frontmatter parser uten feil
   - name er kebab-case (regex)
   - description er under 1024 tegn
   - description inneholder trigger-fraser
     ('use when' | 'triggers include')
   - Body er under 500 linjer
   - Ingen broken markdown (kjør gjennom marked)

6. evals/phases.test.ts
   For hver fase-prompt i package.files:
   - Filename matcher phase-N-<navn>.md mønster
   - Inneholder ## Mål
   - Inneholder ## Forutsetninger
   - Inneholder ## Prompt å lime inn (eller ekvivalent)
   - Inneholder ## Akseptansekriterier
   - Bruker korrekt thinking-nivå
     ('think hard' eller 'ultrathink', ikke 'megathink' osv)

7. evals/cost.test.ts
   - Sum token-kostnad per pakke < $1.00
   - Plan-fase < $0.80
   - Render-fase < $0.30
   - Hvis over: testen feiler med konkret tall

8. evals/diversity.test.ts
   - Lag 3 pakker fra 3 forskjellige goals
   - Mål Jaccard-similaritet mellom CLAUDE.md-er
   - Skal være < 0.5 (de er forskjellige nok)
   - Hvis høyere: system-prompten er for generisk

9. evals/smoke-test.ts (manuell, ikke automatisk)
   - Skript som tar en generert pakke
   - Ekstraherer til /tmp/test-project
   - Kjører `git init && touch test.txt && git add . && git commit -m "test"`
   - Verifiserer at CLAUDE.md ikke conflikter med standard verktøy

10. package.json scripts:
    "eval": "vitest run evals/",
    "eval:watch": "vitest evals/",
    "eval:ui": "vitest --ui evals/",
    "eval:smoke": "tsx evals/smoke-test.ts"

11. .github/workflows/eval.yml
    - Kjør evals på hver PR
    - Bruker cache for å unngå å regenerere fixtures
    - Posten kommentar med pass/fail tabell

Vis meg planen. Spesielt: hvordan håndtere flakiness fra AI-output?
Min anbefaling: kjør hver test 3 ganger, accepter hvis 2 av 3 passerer.

CODE:
Implementer alle eval-filer. Når du sier "kjør":
1. npm run eval -- run alle
2. Hvis noen feiler — ikke fiks ved å løsne testen, fiks ved å
   forbedre system-promten
3. Iterer til 18 av 20 fixtures passerer alle tester
4. Dokumenter hvilke 2 som feiler og hvorfor (kjente edge cases)

COMMIT:
1. chore(deps): add vitest and test fixtures
2. feat(eval): add quality gates for claude.md, skills, phases
3. feat(eval): add cost and diversity tests
4. ci: run evals on every PR
```

## Akseptansekriterier

- `npm run eval` kjører på under 5 minutter (med cache)
- 18 av 20 fixtures passerer alle tester
- Hver feilet test gir konkret melding om hva som mangler
- GitHub Actions kjører evals automatisk på PR
- Cost-test fanger regresjoner (eks: noen fjernet cacheControl)

## Hva du gjør hvis tester feiler

Ikke gjør disse tingene:
- Løsne testen ("la oss tillate 220 linjer i CLAUDE.md")
- Skippe testen ("denne fixturen er rar")
- Mocke modellen ("eval bør være rask")

Gjør dette:
1. Identifiser hvilken system-prompt produserer dårlig output
2. Legg til konkret eksempel eller MUST/ALDRI-regel
3. Re-kjør evalen
4. Hvis fortsatt feil: vurder om grensen er feil, eller om Opus
   trenger ultrathink i stedet for high effort
5. Hvis tester nå passerer men i forrige uke ikke gjorde: legg
   det til som regresjon-test

## Smoke test før lansering

Manuelt: ta 3 ferskt-genererte pakker, faktisk kjør dem i Claude Code med Claude Opus 4.7. Sammenlign output mot å lime inn samme idé som rå prompt. Hvis pakken ikke gir merkbart bedre resultat, har du ikke validert produktet ditt.

## Eval-rapportering

Etter hver kjøring, generer en HTML-rapport som viser:
- Pass/fail per fixture
- Token-kostnad per fixture
- Tidsbruk per fase
- Diversity-score heatmap

Bruk dette som beslutningsgrunnlag før hver deploy.

## Neste fase

Gå til `prompts/phase-8-launch.md` for lansering.
