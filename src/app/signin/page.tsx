'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'

function SignInForm() {
  const params = useSearchParams()
  const redirectTo = params.get('redirect') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke sende lenke')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold">Sjekk e-posten din</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Vi sendte en innloggings-lenke til <strong>{email}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Logg inn</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Vi sender en magic link til e-posten din. Ingen passord.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="navn@firma.no"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Sender…' : 'Send magic link'}
        </button>
      </form>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Laster…</p>}>
      <SignInForm />
    </Suspense>
  )
}
