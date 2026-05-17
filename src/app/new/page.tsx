'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewProjectPage() {
  const router = useRouter()
  const [rawGoal, setRawGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rawGoal.trim().length < 5) {
      setError('Skriv minst noen ord om hva du vil bygge.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawGoal }),
      })
      if (res.status === 401) {
        router.push('/signin?redirect=/new')
        return
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Kunne ikke opprette prosjekt')
      const { id } = (await res.json()) as { id: string }
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
