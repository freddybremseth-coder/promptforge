'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useRef, useState } from 'react'

import { PlanSchema } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

// If the stream produces nothing new for this long, treat it as stalled.
// Tuned for Hobby tier's 60s Node window — anything past 45s without new
// data is almost certainly cut.
const STALL_AFTER_MS = 45_000

export default function PlanPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/plan',
    schema: PlanSchema,
  })

  const [elapsed, setElapsed] = useState(0)
  const [stalled, setStalled] = useState(false)
  const lastChangeRef = useRef<number>(Date.now())
  const startedRef = useRef<string | null>(null)

  // Fire submit exactly once per id.
  useEffect(() => {
    if (startedRef.current === id) return
    startedRef.current = id
    submit({ projectId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Tick a visible elapsed-time counter and watch for stalled streams.
  useEffect(() => {
    if (!isLoading) return
    const start = Date.now()
    lastChangeRef.current = Date.now()
    setStalled(false)
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
      if (Date.now() - lastChangeRef.current > STALL_AFTER_MS) {
        setStalled(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isLoading])

  // Reset stall timer whenever the streamed object changes.
  useEffect(() => {
    lastChangeRef.current = Date.now()
    setStalled(false)
  }, [object])

  function retry() {
    startedRef.current = null
    setElapsed(0)
    setStalled(false)
    startedRef.current = id
    submit({ projectId: id })
  }

  const plan = object
  // A complete plan must at minimum have a summary and at least one phase.
  // useObject doesn't enforce schema during streaming, so we check ourselves.
  const planComplete = Boolean(
    plan?.project_summary && plan?.phases && plan.phases.length > 0
  )
  // Stream ended (isLoading false), no error fired, but plan never completed.
  // Most common cause on Hobby: Vercel killed the function mid-stream.
  const streamCutEarly = !isLoading && !error && startedRef.current === id && !planComplete

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Planlegger arkitekturen</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Opus 4.7 skisserer faser, konvensjoner og Skills.
          </p>
        </div>
        {!isLoading && planComplete && (
          <button
            type="button"
            onClick={() => router.push(`/new/${id}/generate` as never)}
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Godkjenn og generer pakke →
          </button>
        )}
      </header>

      {streamCutEarly && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Streamen ble avbrutt før planen var ferdig.</p>
          <p className="mt-1 text-xs">
            Vercel Hobby har 60s timeout på serverless-funksjoner. Hvis Opus brukte lengre tid
            enn det, ble kallet kuttet. Prøv igjen — kall som var halvveis fullføres ofte
            raskere på neste forsøk (cache).
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-amber-400 px-3 py-1.5 text-xs hover:bg-amber-100"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Plan-fasen feilet.</p>
          <p className="mt-1 text-xs opacity-80">{error.message ?? String(error)}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {plan?.project_summary ? 'Skriver planen…' : 'Tenker…'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {elapsed}s · Opus med extended thinking bruker typisk 60-120 sekunder.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                stop()
              }}
              className="rounded border border-zinc-300 px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-600 dark:border-zinc-700"
            >
              Avbryt
            </button>
          </div>
          {stalled && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-medium">Streamen virker stoppet.</p>
              <p className="mt-1">
                Ingen nye data på {Math.floor(STALL_AFTER_MS / 1000)} sekunder. Vercel kan ha
                kuttet kallet (Hobby-tier har 25s edge-timeout, Pro har 300s). Avbryt og prøv
                igjen.
              </p>
              <button
                type="button"
                onClick={() => {
                  stop()
                  retry()
                }}
                className="mt-2 rounded border border-amber-400 px-2 py-1 hover:bg-amber-100"
              >
                Avbryt og start på nytt
              </button>
            </div>
          )}
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
            {plan.conventions.map((c, i) =>
              c ? (
                <li key={i}>
                  <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {c.severity}
                  </span>
                  {c.rule}
                </li>
              ) : null
            )}
          </ul>
        </section>
      )}

      {plan?.phases && plan.phases.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Faser</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {plan.phases.map((p, i) =>
              p ? (
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
              ) : null
            )}
          </ol>
        </section>
      )}

      {plan?.skills_needed && plan.skills_needed.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Skills</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {plan.skills_needed.map((s, i) =>
              s ? (
                <li key={i}>
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{s.name}</code>{' '}
                  — {s.rationale}
                </li>
              ) : null
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
