import { anthropic } from '@/lib/anthropic-provider'
import { generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { getRenderSystemPrompt } from '@/lib/prompts/render-file-system'
import { incrementQuota } from '@/lib/quota'
import { buildManifest } from '@/lib/render-manifest'
import { PackageFileSchema, PlanSchema, type PackageFile } from '@/lib/schemas'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BodySchema = z.object({
  projectId: z.string().uuid(),
  packageId: z.string().uuid(),
  stepIndex: z.number().int().min(0),
})

// Loose output schema: model output only needs *some* content.
// We re-wrap path/kind from the manifest below regardless.
const LooseFileSchema = z.object({
  path: z.string().optional(),
  kind: z.string().optional(),
  content: z.string().min(1),
})

function fail(err: unknown, where: string, status = 500) {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error(`[render/file] ${where}:`, detail)
  return NextResponse.json({ error: where, detail }, { status })
}

export async function POST(req: Request) {
  try {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { projectId, packageId, stepIndex } = parsed.data

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  try {
    supabase = await createServerSupabaseClient()
  } catch (e) {
    return fail(e, 'supabase_client_init')
  }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) return fail(userError, 'auth_getUser')
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, raw_goal, preset, plan')
    .eq('id', projectId)
    .single()
  if (projectError || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const planParsed = PlanSchema.safeParse(project.plan)
  if (!planParsed.success) {
    return NextResponse.json({ error: 'no_valid_plan' }, { status: 409 })
  }

  const preset = getPreset(project.preset)
  if (!preset) {
    return NextResponse.json({ error: 'unknown_preset' }, { status: 400 })
  }

  const manifest = buildManifest(planParsed.data)
  if (stepIndex >= manifest.length) {
    return NextResponse.json({ error: 'step_out_of_range' }, { status: 400 })
  }
  const step = manifest[stepIndex]

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
  }

  const admin = createAdminSupabaseClient()

  // Quota check by reading current row directly (admin bypasses RLS, fast).
  const { data: quotaRow } = await admin
    .from('usage_quotas')
    .select('packages_this_month, packages_per_month, plan')
    .eq('user_id', user.id)
    .maybeSingle()
  const isFree = (quotaRow?.plan ?? 'free') === 'free'

  const { data: existingPackage, error: pkgError } = await admin
    .from('prompt_packages')
    .select('id, project_id, files')
    .eq('id', packageId)
    .single()
  if (pkgError || !existingPackage || existingPackage.project_id !== projectId) {
    return NextResponse.json({ error: 'package_not_found' }, { status: 404 })
  }

  const currentFiles: PackageFile[] = Array.isArray(existingPackage.files)
    ? (existingPackage.files as PackageFile[])
    : []
  // Idempotent: if this step's path already exists, return it instead of
  // regenerating. Lets the client safely retry on transient errors.
  const already = currentFiles.find((f) => f.path === step.path)
  if (already) {
    return NextResponse.json({
      file: already,
      stepIndex,
      total: manifest.length,
      done: currentFiles.length >= manifest.length,
    })
  }

  const userMessage = buildUserMessage({
    step,
    plan: planParsed.data,
    rawGoal: project.raw_goal,
    presetName: preset.name,
    stackContext: preset.stackContext,
    watermark: isFree && step.kind === 'claude_md',
  })

  let generated
  try {
    generated = await generateObject({
      model: anthropic(OPUS),
      schema: LooseFileSchema,
      mode: 'json',
      messages: [
        {
          role: 'system',
          content: getRenderSystemPrompt(step),
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
        },
        { role: 'user', content: userMessage },
      ],
      maxTokens: 6000,
    })
  } catch (e) {
    const raw =
      e && typeof e === 'object' && 'text' in e ? String((e as { text?: unknown }).text) : ''
    return fail(
      new Error(
        `${e instanceof Error ? e.message : String(e)}${raw ? ` :: raw=${raw.slice(0, 400)}` : ''}`
      ),
      `anthropic_generate_step_${stepIndex}_${step.kind}`
    )
  }

  // Force path/kind from manifest so the model can't wander.
  const file: PackageFile = {
    path: step.path,
    kind: step.kind,
    content: generated.object.content,
  }

  const nextFiles = [...currentFiles, file]
  const tokenUsed = (generated.usage?.promptTokens ?? 0) + (generated.usage?.completionTokens ?? 0)
  const previousCost = (existingPackage as { token_cost?: number | null }).token_cost ?? 0

  try {
    await admin
      .from('prompt_packages')
      .update({
        files: nextFiles,
        token_cost: previousCost + tokenUsed,
      })
      .eq('id', packageId)
  } catch (e) {
    return fail(e, 'persist_file')
  }

  const done = nextFiles.length >= manifest.length
  if (done) {
    try {
      await admin.from('projects').update({ status: 'ready' }).eq('id', projectId)
      await incrementQuota(user.id)
    } catch (e) {
      console.warn('[render/file] finalize_failed', e)
    }
  }

  return NextResponse.json({ file, stepIndex, total: manifest.length, done })
  } catch (e) {
    return fail(e, 'unhandled')
  }
}

interface UserMessageArgs {
  step: ReturnType<typeof buildManifest>[number]
  plan: z.infer<typeof PlanSchema>
  rawGoal: string
  presetName: string
  stackContext: string
  watermark: boolean
}

function buildUserMessage({
  step,
  plan,
  rawGoal,
  presetName,
  stackContext,
  watermark,
}: UserMessageArgs): string {
  const lines: string[] = []
  lines.push(`# Step to render`)
  lines.push(JSON.stringify(step, null, 2))
  lines.push('')
  lines.push(`# Project goal`)
  lines.push(rawGoal)
  lines.push('')
  lines.push(`# Preset: ${presetName}`)
  lines.push(stackContext)
  lines.push('')
  lines.push(`# Plan (for cross-references)`)
  lines.push(JSON.stringify(plan, null, 2))
  lines.push('')
  if (step.kind === 'claude_md') {
    lines.push(`# Render flags`)
    lines.push(JSON.stringify({ watermark }))
    lines.push('')
  }
  lines.push(`Output strict JSON matching { path, content, kind } for the requested step.`)
  return lines.join('\n')
}
