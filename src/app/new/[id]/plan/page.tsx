'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { useRouter } from 'next/navigation'
import { use, useEffect } from 'react'

import { PlanSchema } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PlanPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { object, submit, isLoading, error } = useObject({
    api: '/api/plan',
    schema: PlanSchema,
  })

  useEffect(() => {
    submit({ projectId: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const plan = object

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Planlegger arkitekturen</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Opus 4.7 (ultrathink) skisserer faser, konvensjoner og Skills.
          </p>
        </div>
        {!isLoading && plan && (
          <button
            type="button"
            onClick={() => router.push(`/new/${id}/generate` as never)}
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Godkjenn og generer pakke →
          </button>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Plan-fasen feilet. Prøv på nytt — hvis det skjer igjen, sjekk kvoten din.
        </div>
      )}

      {isLoading && !plan?.project_summary && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Tenker… (kan ta 30-60 sekunder med ultrathink)
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
