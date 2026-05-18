import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { checkQuota } from '@/lib/quota'
import { buildManifest } from '@/lib/render-manifest'
import { PlanSchema } from '@/lib/schemas'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BodySchema = z.object({ projectId: z.string().uuid() })

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { projectId } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const quota = await checkQuota(user.id)
  if (!quota.ok) {
    return NextResponse.json(
      { error: 'quota_exceeded', plan: quota.plan, used: quota.used, limit: quota.limit },
      { status: 402 }
    )
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, plan')
    .eq('id', projectId)
    .single()
  if (error || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const planParsed = PlanSchema.safeParse(project.plan)
  if (!planParsed.success) {
    return NextResponse.json({ error: 'no_valid_plan' }, { status: 409 })
  }

  const manifest = buildManifest(planParsed.data)

  // Re-use an existing in-progress package (so resumed runs don't lose
  // already-generated files). Otherwise create a fresh one.
  const admin = createAdminSupabaseClient()
  const { data: existing } = await admin
    .from('prompt_packages')
    .select('id, files')
    .eq('project_id', projectId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let packageId: string
  let files: Array<{ path: string; content: string; kind: string }> = []
  if (existing && Array.isArray(existing.files)) {
    packageId = existing.id
    files = existing.files as typeof files
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('prompt_packages')
      .insert({
        project_id: projectId,
        files: [],
        model_used: OPUS,
        token_cost: 0,
      })
      .select('id')
      .single()
    if (insertError || !inserted) {
      return NextResponse.json(
        { error: 'insert_failed', detail: insertError?.message },
        { status: 500 }
      )
    }
    packageId = inserted.id
  }

  await admin.from('projects').update({ status: 'generating' }).eq('id', projectId)

  // Tell the client which steps remain (by index into the manifest).
  const completedPaths = new Set(files.map((f) => f.path))
  const remaining = manifest
    .map((_, i) => i)
    .filter((i) => !completedPaths.has(manifest[i].path))

  return NextResponse.json({
    packageId,
    manifest,
    remaining,
    alreadyDone: files.map((f) => ({ path: f.path, kind: f.kind })),
  })
}
