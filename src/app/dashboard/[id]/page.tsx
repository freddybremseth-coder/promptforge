import Link from 'next/link'
import { redirect } from 'next/navigation'

import { DonePageClient } from '@/app/new/[id]/done/DonePageClient'
import { PackageSchema, type PackageFile } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DashboardProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/signin?redirect=/dashboard/${id}`)

  const { data: project } = await supabase
    .from('projects')
    .select('id, raw_goal, preset, status, updated_at')
    .eq('id', id)
    .single()
  if (!project) {
    return (
      <p className="text-sm text-zinc-500">
        Prosjektet finnes ikke. <Link href="/dashboard">Tilbake</Link>.
      </p>
    )
  }

  const { data: pkg } = await supabase
    .from('prompt_packages')
    .select('id, files, generated_at, model_used, token_cost')
    .eq('project_id', id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const filesParsed = pkg ? PackageSchema.shape.files.safeParse(pkg.files) : null
  const files: PackageFile[] = filesParsed?.success ? filesParsed.data : []

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-brand-600">{project.preset}</p>
        <h1 className="mt-1 text-2xl font-semibold">{project.raw_goal}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Sist oppdatert {new Date(project.updated_at).toLocaleString('no-NO')} · status {project.status}
        </p>
      </header>

      {!pkg && (
        <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
          Ingen pakke generert ennå. <Link href={`/new/${id}/plan`}>Fortsett der du slapp</Link>.
        </div>
      )}

      {pkg && <DonePageClient packageId={pkg.id} files={files} />}
    </div>
  )
}
