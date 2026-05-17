import { redirect } from 'next/navigation'

import { DonePageClient } from './DonePageClient'
import { PackageSchema, type PackageFile } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DonePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/signin?redirect=/new/${id}/done`)

  const { data: pkg } = await supabase
    .from('prompt_packages')
    .select('id, project_id, files, generated_at')
    .eq('project_id', id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pkg) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold">Pakken er ikke klar ennå</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Hvis genereringen fortsatt pågår, gå tilbake til {' '}
          <a href={`/new/${id}/generate`}>generer-siden</a>.
        </p>
      </div>
    )
  }

  const filesParsed = PackageSchema.shape.files.safeParse(pkg.files)
  const files: PackageFile[] = filesParsed.success ? filesParsed.data : []

  return <DonePageClient packageId={pkg.id} files={files} />
}
