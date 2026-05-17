'use client'

import { useState } from 'react'

import { QuotaIndicator } from '@/components/QuotaIndicator'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface Price {
  id: string
  unit_amount: number | null
  currency: string | null
  interval: string | null
  product_id: string | null
}

interface Product {
  id: string
  name: string | null
  description: string | null
  metadata: Record<string, string> | null | unknown
}

interface Props {
  email: string
  prices: Price[]
  products: Product[]
}

export function AccountClient({ email, prices, products }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkout(priceId: string) {
    setLoading(priceId)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) throw new Error('Checkout feilet')
      const { url } = (await res.json()) as { url?: string }
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (!res.ok) throw new Error('Customer Portal er ikke tilgjengelig — har du et abonnement?')
      const { url } = (await res.json()) as { url?: string }
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(null)
    }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Konto</h1>
          <p className="mt-1 text-sm text-zinc-500">{email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-600 dark:border-zinc-700"
        >
          Logg ut
        </button>
      </header>

      <QuotaIndicator />

      <section>
        <h2 className="text-lg font-semibold">Abonnement</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openPortal}
            disabled={loading === 'portal'}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:border-brand-600 hover:text-brand-600 disabled:opacity-50 dark:border-zinc-700"
          >
            Administrer abonnement
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Planer</h2>
        {prices.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Ingen aktive Stripe-priser synkronisert ennå. Lag produktene i Stripe Dashboard og send en webhook.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {prices.map((price) => {
              const product = products.find((p) => p.id === price.product_id)
              const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(0) : '—'
              return (
                <div
                  key={price.id}
                  className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h3 className="font-semibold">{product?.name ?? 'Plan'}</h3>
                  {product?.description && (
                    <p className="mt-1 text-sm text-zinc-500">{product.description}</p>
                  )}
                  <p className="mt-3 text-2xl font-semibold text-brand-600">
                    {amount} {price.currency?.toUpperCase()}
                    <span className="text-sm text-zinc-500">/{price.interval ?? 'engang'}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => checkout(price.id)}
                    disabled={loading === price.id}
                    className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {loading === price.id ? 'Sender til Stripe…' : 'Velg plan'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  )
}
