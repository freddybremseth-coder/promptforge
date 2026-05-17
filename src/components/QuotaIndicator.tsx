'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

interface Quota {
  ok: boolean
  plan: 'free' | 'starter' | 'pro'
  used: number
  limit: number
  resetAt: string
}

export function QuotaIndicator() {
  const [quota, setQuota] = useState<Quota | null>(null)

  useEffect(() => {
    fetch('/api/billing/quota')
      .then((r) => (r.ok ? r.json() : null))
      .then(setQuota)
      .catch(() => null)
  }, [])

  if (!quota) return null
  const pct = Math.min(100, Math.round((quota.used / Math.max(1, quota.limit)) * 100))
  const tone = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          Plan: <span className="uppercase">{quota.plan}</span>
        </span>
        <span className="text-zinc-500">
          {quota.used} / {quota.limit} pakker
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={cn('h-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 80 && quota.plan !== 'pro' && (
        <p className="mt-2 text-xs text-zinc-500">
          Nær grensen.{' '}
          <a href="/account" className="text-brand-600">
            Oppgrader plan
          </a>
          .
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-400">
        Nullstilles {new Date(quota.resetAt).toLocaleDateString('no-NO')}
      </p>
    </div>
  )
}
