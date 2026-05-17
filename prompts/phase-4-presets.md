# Fase 4: Stack-presetter (uke 4)

## Mål

Lag de tre stack-presettene som gir Opus 4.7 ekstra kontekst om hvordan hver stack typisk er strukturert. Hver preset = stack-spesifikke konvensjoner som injectes i plan-fasen.

## Forutsetninger

- Fase 3 fullført — plan og render fungerer for "generisk webapp"
- Du har manuelt verifisert at en av de 3 testprosjektene gir god output

## Prompt å lime inn i Claude Code

```
think hard

EXPLORE:
1. Les hvordan plan-systemprompten i src/lib/prompts/ er strukturert
2. Sjekk hvordan projects.preset brukes (eller om den bare lagres)

PLAN:
Vi trenger:

1. src/presets/types.ts
   - Preset-interface: { id, name, defaultConventions[],
     stackContext, skillBlueprints[] }

2. src/presets/next-supabase-vercel.ts (denne perfeksjoneres FØRST)
   - Inneholder din egen stack-kunnskap
   - defaultConventions: ['MUST use RLS', 'MUST use Edge for streaming', ...]
   - stackContext: tekst som forklarer hvordan denne stacken
     vanligvis settes opp (typescript strict, app router,
     supabase-js client på server, etc)
   - skillBlueprints: ['supabase-migration', 'vercel-deploy',
     'ai-streaming', 'git-commit'] — Claude oppmuntres til å lage
     disse hvis prosjektet trenger dem

3. src/presets/astro-sqlite-cloudflare.ts
   - For statiske sider med litt dynamikk
   - stackContext: Astro Islands, SQLite via libSQL,
     Cloudflare Workers/Pages
   - skillBlueprints: ['astro-content-collections',
     'cloudflare-deploy', 'libsql-migration', 'git-commit']

4. src/presets/python-fastapi-postgres.ts
   - For APIer og backend
   - stackContext: FastAPI app structure, Pydantic models,
     SQLAlchemy 2.0, Alembic for migrasjoner, Docker compose
   - skillBlueprints: ['fastapi-endpoint', 'alembic-migration',
     'docker-compose', 'pytest-fixture']

5. src/presets/index.ts
   - Eksporter alle tre som array
   - getPreset(id: string): Preset | null

6. Oppdater /api/plan/route.ts
   - Hent projects.preset
   - Inject preset.stackContext i prompt (ikke i system, i user-melding)
   - Inject preset.defaultConventions som "Pre-existing conventions"
   - La Opus utvide eller justere — men de eksisterende reglene er
     baseline

7. Oppdater render-fasen til å lage SKILL.md-er som matcher
   skillBlueprints fra preseten

8. src/app/new/[id]/stack/page.tsx
   - Trinn 3 i flyten: vis 3 preset-kort
   - "Velg" lagrer projects.preset og redirecter til /new/[id]/plan

Vis meg planen før du implementerer. Spesielt: hvordan injectes
preset-kontekst i prompts uten å eksplodere token-kost?

CODE:
Implementer. Test hver preset med ett relevant prosjekt:
- Next preset: "CRM for olivenbønder" (din testcase)
- Astro preset: "Dokumentasjonsside for et open-source-bibliotek"
- Python preset: "API for å analysere CSV-er med ML-modell"

Manuelt verifiser at output for hver preset gjenspeiler stacken:
- Next-pakken nevner RLS, Edge, AI SDK
- Astro-pakken nevner Content Collections, Islands, Cloudflare
- Python-pakken nevner FastAPI, Pydantic, Alembic

COMMIT:
1. feat(presets): add preset type and three implementations
2. feat(api): inject preset context into plan route
3. feat(ui): add stack selection page
```

## Akseptansekriterier

- Tre preset-filer med konsistent struktur
- Plan-fasen produserer output som er stack-spesifikk
- Hver preset gir en CLAUDE.md som inkluderer korrekte konvensjoner for stacken
- UI viser de tre kortene tydelig med beskrivelse
- Valgt preset lagres i `projects.preset`
- Eval-tester at presetter genererer forskjellig output

## Hvorfor Next-preseten først

Du kjenner Next.js + Supabase + Vercel best. Hvis du perfeksjonerer den først, kan du bruke den som benchmark for de andre to. "Føles output for Astro like grundig som for Next?" — hvis nei, juster Astro-preseten til den er på samme nivå.

## Token-kostnad

Preset-kontekst legger ~500 tokens til hvert plan-kall. Det er akseptabelt, men cache system-promten må fortsatt fungere — preset-kontekst går i user-message, ikke system.

## Neste fase

Gå til `prompts/phase-5-export.md` for ZIP-eksport og dashboard.
