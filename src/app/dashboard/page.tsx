import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  interview: 'Intervju',
  generating: 'Genererer',
  ready: 'Klar',
  archived: 'Arkivert',
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin?redirect=/dashboard')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, raw_goal, preset, status, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dine prosjekter</h1>
        <Link
          href="/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-brand-700"
        >
          + Ny pakke
        </Link>
      </header>

      {(!projects || projects.length === 0) && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Du har ingen prosjekter ennå. <Link href="/new">Lag den første pakken</Link>.
        </div>
      )}

      <ul className="space-y-3">
        {(projects ?? []).map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/${p.id}` as never}
                className="block truncate text-sm font-medium text-zinc-900 no-underline hover:text-brand-600 dark:text-zinc-100"
              >
                {p.raw_goal}
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                {p.preset} · {new Date(p.updated_at).toLocaleString('no-NO')}
              </p>
            </div>
            <span className="ml-4 rounded bg-zinc-100 px-2 py-1 text-xs uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {STATUS_LABEL[p.status] ?? p.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
