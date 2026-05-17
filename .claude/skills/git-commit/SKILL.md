---
name: git-commit
description: Use when the user asks for help writing commit messages, creating a PR, or reviewing staged changes. Triggers include "commit", "git message", "PR title", "pull request", and "review my diff". Provides Conventional Commits format and the project's PR template.
---

# Git Commit Skill

## Format: Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Bruk når |
|---|---|
| `feat` | Ny funksjonalitet for sluttbruker |
| `fix` | Bugfix |
| `chore` | Vedlikehold, deps, config — ikke synlig for bruker |
| `refactor` | Kodeendring uten ny funksjonalitet eller bugfix |
| `docs` | Bare dokumentasjon |
| `test` | Test-relaterte endringer |
| `perf` | Performance-forbedring |
| `style` | Formattering, ingen funksjonell endring |

### Scope

Bruk de viktigste prosjektområdene:

- `api` — endringer i `src/app/api/`
- `ui` — endringer i komponenter eller sider
- `db` — Supabase-migrasjoner
- `auth` — Supabase auth-flyt
- `billing` — Stripe-relatert
- `eval` — eval-suite
- `prompts` — system-prompts eller schemas

### Subject

- Imperativ, presens ("add" ikke "added")
- Liten forbokstav
- Ikke punktum til slutt
- Maks 72 tegn

### Body (når nødvendig)

- Forklar HVA og HVORFOR, ikke HVORDAN
- Linjebredde 80 tegn
- Skill mellom subject og body med tom linje

## Eksempler

Bra commits:

```
feat(api): add render route for opus 4.7 streaming

Render-fasen tar en validert plan og genererer pakkefilene.
Bruker streamObject med PackageSchema for å garantere
parsebar output. taskBudget satt til 50000 for å hindre
runaway-kostnad.

Closes #34
```

```
fix(billing): respect usage quota before opus call

Tidligere ble Opus-kallet startet før kvotasjekk, slik at
brukere på free-tier kunne overskride grensen ved samtidige
forespørsler.
```

```
chore(deps): bump @ai-sdk/anthropic to 1.2.0
```

Dårlige commits:

```
update stuff           # Hva ble oppdatert?
fix bug                # Hvilken bug?
WIP                    # Aldri commit WIP til main
asdfg                  # Nei
```

## PR template

For hver PR, fyll ut:

```markdown
## Hva

Kort beskrivelse av endringene.

## Hvorfor

Begrunnelse eller link til issue.

## Hvordan testet

- [ ] `npm run typecheck` passerer
- [ ] `npm run lint` passerer
- [ ] `npm run build` passerer lokalt
- [ ] Eval-suite passerer (hvis AI-prompts endret)
- [ ] Manuelt testet i preview-deploy
- [ ] Stripe-flyt testet (hvis billing-endring)

## Screenshots

(For UI-endringer)

## Risiko

Lav / Middels / Høy — og hva som skjer hvis det går galt.
```

## Branch naming

```
feat/<kort-beskrivelse>     # ny funksjonalitet
fix/<kort-beskrivelse>      # bugfix
chore/<kort-beskrivelse>    # vedlikehold
refactor/<kort-beskrivelse> # refaktorering
```

Eksempel: `feat/intervju-route`, `fix/quota-race-condition`

## Når noe må reverteres

```bash
git revert <commit-sha>
git push origin main
```

Aldri force-push til main. Aldri rebase main lokalt og push.

## Squash eller ikke

For feat-PRs: squash-merge (1 PR = 1 commit på main).
For chore/docs: kan beholdes som flere commits hvis logisk.
