'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const PENDING_GOAL_KEY = 'pf:pending-goal'

export default function NewProjectPage() {
  const router = useRouter()
  const [rawGoal, setRawGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore a goal that was typed before being bounced to /signin.
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_GOAL_KEY)
    if (pending) {
      setRawGoal(pending)
      localStorage.removeItem(PENDING_GOAL_KEY)
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const goal = rawGoal.trim()
    if (goal.length < 5) {
      setError('Skriv minst noen ord om hva du vil bygge.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawGoal: goal }),
      })
      if (res.status === 401) {
        localStorage.setItem(PENDING_GOAL_KEY, goal)
        router.push('/signin?redirect=/new')
        return
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Kunne ikke opprette prosjekt')
      const { id } = (await res.json()) as { id: string }
      // Hand the goal to the interview page so it doesn't need a server roundtrip
      // and so the first stream call has the goal immediately.
      sessionStorage.setItem(`pf:goal:${id}`, goal)
      router.push(`/new/${id}/interview` as never)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">Hva vil du bygge?</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        En setning eller en hel paragraf. Vi henter resten ut av deg på neste skjerm.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <textarea
          value={rawGoal}
          onChange={(e) => setRawGoal(e.target.value)}
          placeholder="F.eks. 'En CRM for olivenbønder med kart og varsler ved frost.'"
          rows={6}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Oppretter…' : 'Fortsett til intervju'}
        </button>
      </form>
    </div>
  )
}
