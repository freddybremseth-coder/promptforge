import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { PackageSchema } from '@/lib/schemas'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BodySchema = z.object({ packageId: z.string().uuid() })

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { packageId } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: pkg, error } = await supabase
    .from('prompt_packages')
    .select('id, project_id, files, projects!inner(user_id, raw_goal)')
    .eq('id', packageId)
    .single()
  if (error || !pkg) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // The inner join ensures the row exists only if the user owns the project,
  // but explicit check guards against schema drift.
  const project = pkg.projects as unknown as { user_id: string; raw_goal: string }
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const filesParsed = PackageSchema.shape.files.safeParse(pkg.files)
  if (!filesParsed.success) {
    return NextResponse.json({ error: 'invalid_package' }, { status: 500 })
  }

  const zip = new JSZip()
  for (const f of filesParsed.data) {
    zip.file(f.path, f.content)
  }
  // Always include a top-level usage README even if the model produced one,
  // for the fallback case where readers want a one-liner.
  if (!filesParsed.data.find((f) => f.path.toLowerCase() === 'readme.md')) {
    zip.file(
      'README.md',
      `# Prompt-pakke\n\nGenerert av PromptForge for målet:\n\n> ${project.raw_goal}\n\nDrop filene inn i prosjektmappen og åpne Claude Code.\n`
    )
  }

  const blob = await zip.generateAsync({ type: 'nodebuffer' })
  const path = `${user.id}/${packageId}.zip`

  const admin = createAdminSupabaseClient()
  const { error: uploadError } = await admin.storage
    .from('packages')
    .upload(path, blob, {
      contentType: 'application/zip',
      upsert: true,
    })
  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed', detail: uploadError.message }, { status: 500 })
  }

  const sevenDays = 60 * 60 * 24 * 7
  const { data: signed, error: signError } = await admin.storage
    .from('packages')
    .createSignedUrl(path, sevenDays, { download: `promptforge-${packageId.slice(0, 8)}.zip` })
  if (signError || !signed) {
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, expiresInSeconds: sevenDays })
}
