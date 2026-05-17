# Fase 5: Eksport og dashboard (uke 5)

## Mål

Brukeren skal kunne laste ned hele pakken som ZIP, eller kopiere en bash-snippet som lager alle filene lokalt. Også: et dashboard som lister tidligere pakker.

## Forutsetninger

- Fase 4 fullført — alle tre presetter genererer pakker

## Prompt å lime inn i Claude Code

```
think hard

EXPLORE:
1. Les .claude/skills/vercel-deploy/SKILL.md (Node vs Edge)
2. Sjekk hvordan prompt_packages-tabellen er strukturert
3. Sjekk om Supabase Storage er konfigurert i prosjektet

PLAN:

1. src/app/api/export/route.ts
   - Node runtime (Edge støtter ikke jszip)
   - maxDuration: 60
   - POST: tar { packageId }
   - Auth-sjekk
   - Henter prompt_packages-rad
   - Bygger ZIP med jszip:
     - Hver fil i files[] som zip-entry på riktig path
     - Inkluder README.md med bruksanvisning øverst
   - Lagrer ZIP i Supabase Storage bucket 'packages'
     med path: `${userId}/${packageId}.zip`
   - Returnerer signed URL (7 dagers gyldighet)

2. src/app/new/[id]/done/page.tsx
   - "Pakke ferdig!" screen
   - Tre knapper:
     a) "Last ned ZIP" → trigger /api/export og redirect til signed URL
     b) "Kopier bash-snippet" → kopierer skript til clipboard
     c) "Åpne i nettleseren" → fil-tre med inline-renderer

3. Bash-snippet-mal (vis som code-block):
   ```bash
   # Lim inn i prosjektmappen din
   mkdir -p .claude/skills prompts
   cat > CLAUDE.md << 'EOF'
   <innhold fra files[0]>
   EOF
   # ... og så videre for hver fil
   ```

4. src/app/dashboard/page.tsx
   - Liste over brukerens projects med status
   - Filter: alle | ready | archived
   - Søk på raw_goal
   - Klikk på prosjekt → /dashboard/[id] som viser pakken

5. src/app/dashboard/[id]/page.tsx
   - Vis raw_goal, preset, generated_at
   - File browser med syntax-highlighting
   - "Last ned ZIP" og "Kopier snippet"-knapper

6. supabase/migrations/XXX_create_storage_bucket.sql:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('packages', 'packages', false);

   create policy "users can read own packages"
     on storage.objects for select
     using (
       bucket_id = 'packages'
       and auth.uid()::text = (storage.foldername(name))[1]
     );
   ```

Vis meg planen før du implementerer.

CODE:
Implementer. Test hele flyten:
1. Lag et prosjekt
2. Fullfør intervju
3. Velg preset
4. Generer pakke
5. Last ned ZIP
6. Pakk opp og inspiser at strukturen er riktig
7. Verifiser at .claude/skills/<navn>/SKILL.md-filene
   er valid YAML+Markdown

COMMIT:
1. feat(api): add export route with jszip
2. feat(db): add storage bucket for packages
3. feat(ui): add done and dashboard pages
```

## Akseptansekriterier

- ZIP inneholder CLAUDE.md i root
- ZIP inneholder `.claude/skills/<name>/SKILL.md` for hver skill
- ZIP inneholder `prompts/phase-N.md` for hver fase
- ZIP inneholder en README.md med kort bruksanvisning
- Bash-snippet fungerer når limt inn i et tomt mappe
- Dashboard viser alle brukerens prosjekter
- Søk virker på raw_goal
- Signed URL utløper etter 7 dager

## Hvorfor signed URLs

ZIPer kan inneholde sensitiv prosjektinformasjon. Public storage er ikke et alternativ. Signed URLs gir brukeren midlertidig tilgang uten å eksponere bucket-en.

## Mobiltilpasning

Husk: du er ute på olivengården noen ganger. Dashboard og /done må fungere på mobil:
- File browser blir scrollbar collapse
- Knapper er minst 44x44px tap-target
- Syntax highlighting bytter til read-only på mobil (ikke editor)

## Neste fase

Gå til `prompts/phase-6-billing.md` for kvotaer og webhook-håndtering.
