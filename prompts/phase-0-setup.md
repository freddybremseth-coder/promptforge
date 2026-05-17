# Fase 0: Setup (uke 1)

## Mål

Få Vercel-templaten `nextjs-subscription-payments` til å kjøre lokalt med Supabase og Stripe i test-modus. Verifisér at "hello subscription" fungerer end-to-end før vi legger til PromptForge-spesifikk kode.

## Forutsetninger

- Node.js v18+ installert
- En Vercel-konto
- En Supabase-konto
- En Stripe-konto i test-modus
- Stripe CLI installert (`brew install stripe/stripe-cli/stripe`)
- En Anthropic API-nøkkel (https://console.anthropic.com)
- Git og GitHub-konto

## Manuelle steg før Claude Code

Gjør disse selv først, så Claude Code har noe å jobbe mot:

```bash
# 1. Clone templaten
git clone https://github.com/vercel/nextjs-subscription-payments promptforge
cd promptforge

# 2. Lag ny git-historie (egen repo)
rm -rf .git
git init
git add .
git commit -m "chore: initial commit from nextjs-subscription-payments template"

# 3. Push til ditt eget GitHub-repo
gh repo create promptforge --private --source=. --push

# 4. Sett opp Supabase
# Gå til https://supabase.com/dashboard og lag nytt prosjekt
# Kopier URL og anon key til .env.local

# 5. Sett opp Stripe
# https://dashboard.stripe.com → sørg for at "Test mode" er på
# Kopier sk_test_... og pk_test_... til .env.local
```

## Prompt å lime inn i Claude Code

Når lokalt oppsett er klart, åpne Claude Code i prosjektmappen og lim inn dette:

---

```
think hard

Jeg har clonet vercel/nextjs-subscription-payments som foundation for
PromptForge — en SaaS som genererer Claude Code prompt-pakker.

Eksisterende kode er Vercel-templaten urørt. Lokalt oppsett er gjort:
.env.local har Supabase + Stripe test-keys.

Følg Explore→Plan→Code→Commit:

EXPLORE-fase:
1. Les CLAUDE.md
2. Les .claude/skills/supabase-migration/SKILL.md
3. Les .claude/skills/vercel-deploy/SKILL.md
4. Les README.md i prosjektet for å forstå hva templaten gir oss
5. Les supabase/migrations/ for å se eksisterende skjema
6. Identifiser hvilke filer som må endres og hvilke som forblir uendret

Ikke skriv kode i denne fasen.

Når explore er ferdig, returner:
- Liste over filer du har lest
- Liste over filer du foreslår å lage eller endre
- Identifiserte risikoer eller manglende informasjon
```

---

## Akseptansekriterier

Etter fase 0 skal følgende være sant:

- `npm run dev` starter appen på localhost:3000
- Du kan opprette en bruker via Supabase Auth
- Du kan klikke en abonnement-knapp og lande på Stripe Checkout (test-modus)
- Stripe CLI lytter på webhooks: `stripe listen --forward-to localhost:3000/api/webhooks`
- Etter test-betaling: brukeren får en rad i `subscriptions`-tabellen i Supabase
- Claude Code har en explore-rapport som beskriver hva som finnes og hva som mangler

## Hva vi ikke gjør i denne fasen

- Ingen PromptForge-spesifikk kode
- Ingen AI-integrasjon ennå
- Ingen nye tabeller (det er fase 1)
- Ingen UI-endringer

## Neste fase

Gå til `prompts/phase-1-schema.md` når alle akseptansekriterier er møtt.
