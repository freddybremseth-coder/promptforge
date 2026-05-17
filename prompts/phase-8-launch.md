# Fase 8: Lansering (uke 8)

## Mål

Gå fra "fungerer i preview" til "ekte brukere betaler". Dette er den mest kjedelige men mest ufravikelige fasen. Hopp ingen sjekkliste-punkter.

## Forutsetninger

- Fase 7 fullført, evals passerer
- Du har testet hele flyten end-to-end minst 5 ganger
- Du har en oppdatert backup av Supabase-databasen

## Prompt å lime inn i Claude Code

```
think hard

EXPLORE:
1. Les .claude/skills/vercel-deploy/SKILL.md særlig "Production-only steg"
2. Sjekk env vars i Vercel for prod-environment
3. Sjekk Stripe Dashboard for hva som mangler i live-modus

PLAN:

1. Stripe live-modus
   - Verifiser konto (KYC) hvis ikke gjort
   - Lag identiske produkter som i test-modus med samme metadata
   - Lag webhook-endpoint i live-mode som peker på prod-URL
   - Kopier whsec_... til Vercel prod-env (ikke commit)

2. Vercel prod-environment
   - STRIPE_SECRET_KEY = sk_live_...
   - STRIPE_WEBHOOK_SECRET = whsec_... (fra live)
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
   - NEXT_PUBLIC_SITE_URL = https://promptforge.dev
   - ANTHROPIC_API_KEY (samme som dev)
   - SUPABASE_SERVICE_ROLE_KEY (samme)

3. Domene
   - Kjøp domene (foreslag: promptforge.dev)
   - Koble til Vercel via Settings → Domains
   - Vent på SSL (vanligvis < 10 min)
   - Test at både root og www peker riktig

4. Landing page
   - / → markedsføringsside (ikke /dashboard)
   - Hero: "Skriv målet ditt. Få en perfekt Claude Code-prompt."
   - 3 eksempelpakker (faktiske, ikke fake) som brukere kan bla i
   - "Slik fungerer det" (3 steg-illustrasjon)
   - Pricing-seksjon med 3 plan-kort
   - FAQ med 6-8 spørsmål
   - Footer med Privacy + Terms

5. Privacy Policy + Terms of Service
   - Stripe krever det
   - Bruk en generator (TermsFeed, Termly) som baseline
   - Tilpass: vi lagrer prosjektdata, men deler aldri
   - Anthropic-data: forklar at prompts sendes til Anthropic API
   - GDPR-compliance (du er i Spania): rett til sletting

6. Spend cap
   - Vercel: Settings → Spend Management → sett $200/mnd som hard cap
   - Anthropic: Console → Usage Limits → sett $300/mnd
   - Stripe: ingen spend cap, men aktivér Radar for fraud detection

7. Analytics
   - Vercel Analytics (gratis, bare aktiver)
   - Supabase: logg hvilke prompts som genereres
   - PostHog eller Plausible for funnel-analyse (valgfritt v1)

8. Demo-video
   - 60-90 sekunder
   - Skjermopptak: skriv "CRM for olivenbønder" → klikk gjennom
     → vis genererte CLAUDE.md → kopier til Claude Code → vis at
     Claude Code faktisk leser den
   - Last opp til YouTube (unlisted) og embed på landing page

9. Lansering-kanaler
   - ProductHunt: planlegg launch dag (vanligvis tirsdag/onsdag)
   - HackerNews "Show HN" med ett konkret eksempel
   - Twitter/X tråd som demonstrerer flyten
   - Reddit r/ClaudeAI (følg regler)
   - LinkedIn (din spanske eiendomsbransje-nettverk vil neppe bry seg,
     men prøv ett innlegg)

Vis meg planen. Hva av dette er du komfortabel å delegere til
Claude Code (kode, copy-tekst), og hva må du gjøre manuelt
(Stripe, domene, KYC)?

CODE:
Generer:
1. Landing page med shadcn-komponenter
2. Privacy Policy + Terms (utkast, du gjennomgår)
3. README.md-oppdatering for offentlig repo
4. Demo-video shotlist (storyboard)

Jeg gjør Stripe live-mode, domene, KYC, og faktisk innlogging i
ProductHunt selv.

COMMIT:
1. feat(ui): add landing page with pricing and FAQ
2. docs: add privacy policy and terms of service
3. chore: production deploy configuration
```

## Akseptansekriterier

- `promptforge.dev` (eller valgt domene) viser landing page
- Stripe i live-modus, test-kjøp av Starter med ekte kort fungerer
- Webhook leverer subscription.created event
- usage_quotas oppdateres fra free til starter
- Demo-video er publisert og embedded
- Privacy + Terms er linket fra footer
- Spend caps er aktivert (Vercel + Anthropic)
- Eval-suite passerer på main-branch i CI

## Post-launch sjekkliste (første uke)

```
□ Sjekk Vercel logs daglig for feil
□ Sjekk Anthropic usage daglig (kostnadssjokk?)
□ Sjekk Stripe Dashboard for failed payments
□ Sjekk Supabase logs for slow queries
□ Svar på brukerhenvendelser innen 24 timer
□ Logg vanlige spørsmål for FAQ-utvidelse
□ Loop tilbake: hva fungerer ikke?
```

## Når noe går galt etter lansering

Førstehjelp-prioritet:
1. Brukere kan ikke betale → topp prioritet, fiks innen 1 time
2. Brukere kan ikke generere → fiks innen 4 timer
3. UI-feil på mobil → fiks innen 24 timer
4. Tekst-typo → samle opp, fiks i ukentlig deploy

For hver produksjonsfeil:
- Lag en post-mortem (kort, 1-side, dato)
- Lag eval-test som ville fanget det
- Aldri shipp samme bug to ganger

## Hva v2 inneholder

Etter v1-lansering, ikke spre fokus. Disse er v2:
- Custom presetter (Pro-plan kan lage egne)
- Team-workspaces
- GitHub-integrasjon (direkte push til repo)
- Versjonering av pakker
- API for andre verktøy
- Lokalisering (spansk for ditt eget marked)

## Gratulerer

Hvis du er ferdig med fase 8, har du gått fra idé til betalt SaaS på 8 uker. Det er en reell prestasjon. Ta én helg fri før du begynner på v2.
