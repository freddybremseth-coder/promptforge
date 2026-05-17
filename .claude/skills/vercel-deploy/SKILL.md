---
name: vercel-deploy
description: Use when preparing a deploy, configuring environment variables, setting up runtime (Edge vs Node), or debugging deployment failures. Triggers include "deploy", "env vars", "edge runtime", "Vercel function", "cold start", and "preview deployment". Provides runtime selection rules and the pre-deploy checklist for this project.
---

# Vercel Deploy Skill

## Runtime selection rules

Velg riktig runtime per route. Feil valg gir treghet eller crash i produksjon.

### Edge runtime — bruk når

- Streaming AI-responser (alle `/api/interview`, `/api/plan`, `/api/render`)
- Korte read-only operasjoner mot Supabase
- Geografisk nært bruker er viktig (lav latens)

```ts
export const runtime = 'edge'
```

### Node runtime — bruk når

- ZIP-generering med `jszip` (Edge har ikke Node std lib)
- Tunge file-operasjoner
- Webhooks fra Stripe (signatur-verifisering trenger Node-crypto)
- Routes som bruker `@supabase/supabase-js` med service role key for admin-operasjoner

```ts
export const runtime = 'nodejs'
```

## Environment variables

Disse må være satt i Vercel-prosjektets Settings → Environment Variables:

| Variabel | Hvor brukes | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Klient og server | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klient og server | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Bare server (webhooks) | All |
| `ANTHROPIC_API_KEY` | Bare server (API-routes) | All |
| `STRIPE_SECRET_KEY` | Bare server | All |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Klient og server | All |
| `STRIPE_WEBHOOK_SECRET` | Bare server (webhook-route) | All |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirects | All |

ALDRI commit `.env.local`. Bruk `.env.local.example` med tomme verdier som dokumentasjon.

## Pre-deploy checklist

Før hver push til main:

```bash
# 1. Type-sjekk
npm run typecheck

# 2. Lint
npm run lint

# 3. Build lokalt (fanger ofte feil før de når Vercel)
npm run build

# 4. Eval-suite (hvis endringer i AI-prompts eller schemas)
npm run eval

# 5. Sjekk at ingen sensitive ting er staged
git diff --staged | grep -i "key\|secret\|token" || echo "OK"
```

## Preview deployments

Hver PR får automatisk preview-URL. Bruk dem til å teste betalingsflyt med Stripe test-modus før merge.

For å koble Stripe-webhook til en preview-URL midlertidig:

```bash
stripe listen --forward-to https://<preview-url>/api/webhooks
```

Husk å rotere webhook secret tilbake til prod-verdien etter testing.

## Cold start mitigation

Edge routes har < 50ms cold start. Node routes har 500-2000ms.

Hvis du må bruke Node og cold start er et problem:

- Sett `maxDuration: 60` i route-config
- Vurder å aktivere "Fluid Compute" på Vercel-prosjektet
- Pre-warm med en cron job som pinger ruta hvert 5. min

```ts
// src/app/api/export/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60
```

## Common deploy failures

| Symptom | Sannsynlig årsak |
|---|---|
| "Module not found" på Edge | Bruker en Node-only-pakke (fs, crypto, child_process) |
| Stripe webhook returnerer 400 | `STRIPE_WEBHOOK_SECRET` matcher ikke endpointet i Stripe Dashboard |
| Supabase auth-feil i produksjon | `NEXT_PUBLIC_SITE_URL` peker på localhost eller feil domene |
| ZIP-generering timeout | Ruta er på Edge i stedet for Node |
| AI-respons henger | `taskBudget` ikke satt, Opus bruker for lang tid |

## Production-only steg

Når du går fra preview til production:

```
□ Bytt Stripe fra test- til live-modus
□ Lag prod-webhook i Stripe Dashboard som peker på prod-URL
□ Oppdater STRIPE_WEBHOOK_SECRET i Vercel prod-env
□ Arkiver alle test-modus produkter i Stripe
□ Verifiser at Supabase Auth har riktig redirect-URL
□ Koble custom domene (promptforge.dev) til Vercel-prosjektet
□ Sett opp Vercel Spend Management cap på realistisk månedsmaks
```
