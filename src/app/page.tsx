import Link from 'next/link'

const examples = [
  { goal: 'CRM for olivenbønder med kart', stack: 'Next + Supabase' },
  { goal: 'Todo-app med AI som prioriterer oppgaver', stack: 'Astro + libSQL' },
  { goal: 'API for å analysere CSV-er med ML-modell', stack: 'FastAPI + Postgres' },
]

const plans = [
  { name: 'Free', price: '0 €', packages: '1 pakke (lifetime)', cta: 'Kom i gang' },
  { name: 'Starter', price: '9 €/mnd', packages: '10 pakker/mnd', cta: 'Velg Starter' },
  { name: 'Pro', price: '29 €/mnd', packages: 'Ubegrenset', cta: 'Velg Pro' },
]

export default function LandingPage() {
  return (
    <div className="space-y-20">
      <section className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Skriv målet ditt. <br />
          <span className="text-brand-600">Få en perfekt Claude Code-prompt.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          PromptForge genererer en komplett pakke — CLAUDE.md, Skills og fase-prompts — som
          gjør Claude Code til en disiplinert teknisk lead på prosjektet ditt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/new"
            className="rounded-md bg-brand-600 px-5 py-3 text-sm font-medium text-white no-underline hover:bg-brand-700"
          >
            Lag en pakke nå
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 no-underline hover:border-brand-600 hover:text-brand-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            Se dine pakker
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Slik fungerer det</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { title: '1. Skriv målet', body: 'Én linje eller en hel paragraf — bare beskriv hva du vil bygge.' },
            { title: '2. Svar på 3-6 spørsmål', body: 'Haiku 4.5 spør om kontekst Claude Code ikke kan utlede selv.' },
            { title: '3. Last ned pakken', body: 'Opus 4.7 ultrathinker arkitekturen og genererer alle filene.' },
          ].map((step) => (
            <li
              key={step.title}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Eksempler</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {examples.map((ex) => (
            <div
              key={ex.goal}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">"{ex.goal}"</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-brand-600">{ex.stack}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Priser</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-2 text-3xl font-semibold text-brand-600">{p.price}</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.packages}</p>
              <Link
                href="/new"
                className="mt-6 block rounded-md border border-brand-600 px-4 py-2 text-center text-sm font-medium text-brand-600 no-underline hover:bg-brand-50 dark:hover:bg-zinc-800"
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <dl className="mt-6 space-y-4">
          {[
            { q: 'Hvilken modell brukes?', a: 'Haiku 4.5 til intervju, Opus 4.7 med ultrathink til plan og render.' },
            { q: 'Eier jeg pakken jeg får?', a: 'Ja. Pakken er din, uten lisensbegrensninger.' },
            { q: 'Sendes data til Anthropic?', a: 'Ja — selve genereringen kjører på Anthropic API. Data lagres ikke utenfor din rad i Supabase.' },
            { q: 'Kan jeg generere på nytt?', a: 'Ja, hver kjøring teller mot kvoten din. Tidligere pakker beholdes i dashboard.' },
          ].map((f) => (
            <div key={f.q} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
