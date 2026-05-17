'use client'

import { experimental_useObject as useObject } from 'ai/react'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

import { QuestionCard } from '@/components/QuestionCard'
import { InterviewSchema, type Question } from '@/lib/schemas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function InterviewPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [rawGoal, setRawGoal] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { object, submit, isLoading, error } = useObject({
    api: '/api/interview',
    schema: InterviewSchema,
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      const cached = sessionStorage.getItem(`pf:goal:${id}`)
      if (cached) {
        if (!mounted) return
        setRawGoal(cached)
        submit({ projectId: id, rawGoal: cached })
        return
      }
      const res = await fetch(`/api/projects/${id}`)
      if (!res.ok || !mounted) return
      const data = (await res.json()) as { raw_goal?: string }
      if (data.raw_goal) {
        sessionStorage.setItem(`pf:goal:${id}`, data.raw_goal)
        setRawGoal(data.raw_goal)
        submit({ projectId: id, rawGoal: data.raw_goal })
      }
    }
    load().catch(() => null)
    return () => {
      mounted = false
    }
  }, [id, submit])

  async function startWithGoal(goal: string) {
    sessionStorage.setItem(`pf:goal:${id}`, goal)
    setRawGoal(goal)
    submit({ projectId: id, rawGoal: goal })
  }

  async function saveAndContinue() {
    const questions = (object?.questions ?? []) as Question[]
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] ?? '',
    }))
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context: { answers: payload } }),
      })
      if (!res.ok) throw new Error('Kunne ikke lagre svar')
      router.push(`/new/${id}/stack` as never)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ukjent feil')
      setSaving(false)
    }
  }

  if (!rawGoal) {
    return <GoalPrompt onSubmit={startWithGoal} />
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Noen oppfølgingsspørsmål</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Mål: <span className="italic">"{rawGoal}"</span>
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Noe gikk galt med å hente spørsmål. Prøv igjen.
        </div>
      )}

      {!object?.questions?.length && isLoading && (
        <div className="rounded-md border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Genererer spørsmål…
        </div>
      )}

      <div className="space-y-4">
        {(object?.questions ?? []).map((q, i) => {
          if (!q || !q.id) return null
          const qid: string = q.id
          return (
            <QuestionCard
              key={qid}
              question={q as Question}
              value={answers[qid]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [qid]: v }))}
            />
          )
        })}
      </div>

      {!isLoading && (object?.questions?.length ?? 0) > 0 && (
        <div className="flex items-center justify-end gap-3">
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          <button
            type="button"
            onClick={saveAndContinue}
            disabled={saving}
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Lagrer…' : 'Lagre og velg stack →'}
          </button>
        </div>
      )}
    </div>
  )
}

function GoalPrompt({ onSubmit }: { onSubmit: (goal: string) => void }) {
  const [goal, setGoal] = useState('')
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Lim inn målet ditt</h1>
      <p className="mt-1 text-sm text-zinc-500">Vi mistet kontekst — gjenta målet for å starte intervjuet.</p>
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={4}
        className="mt-4 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
      />
      <button
        type="button"
        onClick={() => goal.trim().length > 4 && onSubmit(goal)}
        className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
      >
        Start intervju
      </button>
    </div>
  )
}
