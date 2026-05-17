'use client'

import { useRouter } from 'next/navigation'
import { use, useState } from 'react'

import { cn } from '@/lib/cn'
import { PRESETS } from '@/presets'
import type { PresetId } from '@/types/supabase'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function StackPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [selected, setSelected] = useState<PresetId>('next-supabase-vercel')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preset: selected }),
      })
      if (!res.ok) throw new Error('Kunne ikke lagre stack-valg')
      router.push(`/new/${id}/plan` as never)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Velg stack</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Preseten bestemmer hvilke konvensjoner og Skills som baseline-injectes i planen.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PRESETS.map((preset) => {
          const active = selected === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelected(preset.id)}
              className={cn(
                'rounded-lg border p-5 text-left transition-colors',
                active
                  ? 'border-brand-600 bg-brand-50 dark:bg-zinc-800'
                  : 'border-zinc-200 hover:border-brand-500 dark:border-zinc-700'
              )}
            >
              <h3 className="font-semibold">{preset.name}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{preset.tagline}</p>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                {preset.skillBlueprints.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={confirm}
          disabled={saving}
          className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Lagrer…' : 'Lagre og lag plan →'}
        </button>
      </div>
    </div>
  )
}
