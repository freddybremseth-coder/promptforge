'use client'

import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useRef, useState } from 'react'

import { PlanSchema, type Plan } from '@/lib/schemas'

// Robust JSON POST: surfaces a readable error when the server returns
// HTML (404 page, error page, etc.) instead of JSON.
async function callJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!res.ok) {
    if (isJson) {
      try {
        const parsed = JSON.parse(text) as { error?: string; detail?: string }
        throw new Error(parsed.detail ?? parsed.error ?? `${url}: ${res.status}`)
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.includes(url)) throw parseErr
      }
    }
    if (res.status === 404) {
      throw new Error(`${url} finnes ikke (404) — ny deploy er sannsynligvis ikke ferdig ennå`)
    }
    throw new Error(`${url}: ${res.status} ${res.statusText}`)
  }
  if (!isJson) throw new Error(`${url}: serveren returnerte ikke JSON`)
  return JSON.parse(text) as T
}

interface PageProps {
  params: Promise<{ id: string }>
}

type Step = 'idle' | 'summary' | 'structure' | 'done' | 'error'

interface State {
  step: Step
  plan: Partial<Plan> | null
  elapsed: number
  errorMessage: string | null
}

export default function PlanPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [state, setState] = useState<State>({
    step: 'idle',
    plan: null,
    elapsed: 0,
    errorMessage: null,
  })
  const startedRef = useRef<string | null>(null)
  const stepStartRef = useRef<number>(0)

  const run = useCallback(async () => {
    setState({ step: 'summary', plan: null, elapsed: 0, errorMessage: null })
    stepStartRef.current = Date.now()

    try {
      // Step 1: summary + conventions
      const summary = await callJson<{ summary: Partial<Plan> }>('/api/plan/summary', {
        projectId: id,
      }).then((r) => r.summary)

      setState((s) => ({ ...s, step: 'structure', plan: summary }))
      stepStartRef.current = Date.now()

      // Step 2: phases + skills + hooks
      const { plan } = await callJson<{ plan: Plan }>('/api/plan/structure', { projectId: id })
      const validated = PlanSchema.safeParse(plan)
      if (!validated.success) {
        throw new Error('Generert plan passerte ikke validering: ' + validated.error.message)
      }

      setState({ step: 'done', plan: validated.data, elapsed: 0, errorMessage: null })
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'error',
        errorMessage: err instanceof Error ? err.message : 'Ukjent feil',
      }))
    }
  }, [id])

  useEffect(() => {
    if (startedRef.current === id) return
    startedRef.current = id
    void run()
  }, [id, run])

  // Tick the elapsed timer while a step is running.
  useEffect(() => {
    if (state.step !== 'summary' && state.step !== 'structure') return
    const t = setInterval(() => {
      setState((s) => ({ ...s, elapsed: Math.floor((Date.now() - stepStartRef.current) / 1000) }))
    }, 1000)
    return () => clearInterval(t)
  }, [state.step])

  const plan = state.plan
  const running = state.step === 'summary' || state.step === 'structure'

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Planlegger arkitekturen</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Opus 4.7 jobber i to korte etapper for å holde seg under Vercel-timeouten.
          </p>
        </div>
        {state.step === 'done' && plan && (
          <button
            type="button"
            onClick={() => router.push(`/new/${id}/generate` as never)}
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Godkjenn og generer pakke →
          </button>
        )}
      </header>

      <ol className="grid gap-2 sm:grid-cols-2">
        <StepCard
          index={1}
          title="Sammendrag og konvensjoner"
          status={
            state.step === 'summary'
              ? 'running'
              : state.step === 'idle'
                ? 'pending'
                : 'done'
          }
          elapsed={state.step === 'summary' ? state.elapsed : null}
        />
        <StepCard
          index={2}
          title="Faser og Skills"
          status={
            state.step === 'structure'
              ? 'running'
              : state.step === 'done'
                ? 'done'
                : 'pending'
          }
          elapsed={state.step === 'structure' ? state.elapsed : null}
        />
      </ol>

      {state.step === 'error' && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Plan-fasen feilet.</p>
          <p className="mt-1 text-xs opacity-80">{state.errorMessage}</p>
          <button
            type="button"
            onClick={run}
            className="mt-2 rounded border border-red-300 px-3 py-1.5 text-xs hover:bg-red-100"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {running && (
        <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900">
          {state.step === 'summary'
            ? `Skriver sammendrag og konvensjoner… (${state.elapsed}s, typisk 15-30s)`
            : `Skriver faser og Skills… (${state.elapsed}s, typisk 20-40s)`}
        </div>
      )}

      {plan?.project_summary && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Sammendrag</h2>
          <p className="mt-2 text-sm">{plan.project_summary}</p>
        </section>
      )}

      {plan?.conventions && plan.conventions.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Konvensjoner</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.conventions.map((c, i) => (
              <li key={i}>
                <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {c.severity}
                </span>
                {c.rule}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan?.phases && plan.phases.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Faser</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {plan.phases.map((p, i) => (
              <li key={i} className="rounded border border-zinc-100 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <strong>
                    Fase {i}: {p.name}
                  </strong>
                  <span className="text-xs uppercase tracking-wide text-brand-600">
                    {p.thinking_level}
                  </span>
                </div>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.goal}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {plan?.skills_needed && plan.skills_needed.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Skills</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.skills_needed.map((s, i) => (
              <li key={i}>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{s.name}</code>{' '}
                — {s.rationale}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function StepCard({
  index,
  title,
  status,
  elapsed,
}: {
  index: number
  title: string
  status: 'pending' | 'running' | 'done'
  elapsed: number | null
}) {
  const dot =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-brand-500 animate-pulse'
        : 'bg-zinc-300'
  return (
    <li className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-medium">
        {index}. {title}
      </span>
      {status === 'running' && elapsed !== null && (
        <span className="ml-auto text-xs text-zinc-500">{elapsed}s</span>
      )}
      {status === 'done' && <span className="ml-auto text-xs text-emerald-600">✓</span>}
    </li>
  )
}
