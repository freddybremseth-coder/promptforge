import { anthropic } from '@/lib/anthropic-provider'
import { generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { PLAN_SUMMARY_SYSTEM_PROMPT } from '@/lib/prompts/plan-summary-system'
import { checkQuota } from '@/lib/quota'
import { ConventionSchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BodySchema = z.object({ projectId: z.string().uuid() })

// A lenient schema for what we ask the model for. We tighten downstream.
// generateObject throws on schema mismatch, so the prompt-time schema must
// be permissive enough to accept the model's natural variance.
const LooseSummarySchema = z.object({
  project_summary: z.string().min(10),
  conventions: z.array(ConventionSchema).min(1),
})

function fail(err: unknown, where: string, status = 500) {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error(`[plan/summary] ${where}:`, detail)
  return NextResponse.json({ error: where, detail }, { status })
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    const { projectId } = parsed.data

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

    let quota
    try {
      quota = await checkQuota(user.id)
    } catch (e) {
      return fail(e, 'check_quota')
    }
    if (!quota.ok) {
      return NextResponse.json(
        { error: 'quota_exceeded', plan: quota.plan, used: quota.used, limit: quota.limit },
        { status: 402 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, raw_goal, context, preset, plan')
      .eq('id', projectId)
      .single()
    if (projectError) return fail(projectError, 'project_lookup')
    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const preset = getPreset(project.preset)
    if (!preset) {
      return NextResponse.json({ error: 'unknown_preset' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
    }

    try {
      await supabase.from('projects').update({ status: 'generating' }).eq('id', projectId)
    } catch (e) {
      // Non-fatal; we can still produce the summary.
      console.warn('[plan/summary] status_update_failed', e)
    }

    const userMessage = [
      `# Project goal`,
      project.raw_goal,
      ``,
      `# Interview answers`,
      JSON.stringify(project.context, null, 2),
      ``,
      `# Preset: ${preset.name}`,
      preset.stackContext,
      ``,
      `# Pre-existing conventions (baseline, you may extend)`,
      preset.defaultConventions.map((c) => `- ${c}`).join('\n'),
      ``,
      `Produce the project_summary (a few sentences) and 3+ conventions.`,
    ].join('\n')

    let summary
    try {
      const result = await generateObject({
        model: anthropic(OPUS),
        schema: LooseSummarySchema,
        mode: 'json',
        messages: [
          {
            role: 'system',
            content: PLAN_SUMMARY_SYSTEM_PROMPT,
            providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
          },
          { role: 'user', content: userMessage },
        ],
        maxTokens: 3000,
      })
      summary = result.object
    } catch (e) {
      // NoObjectGeneratedError carries the raw text the model returned —
      // surface it so we can diagnose schema mismatches directly.
      const raw =
        e && typeof e === 'object' && 'text' in e ? String((e as { text?: unknown }).text) : ''
      return fail(
        new Error(
          `${e instanceof Error ? e.message : String(e)}${raw ? ` :: raw=${raw.slice(0, 400)}` : ''}`
        ),
        'anthropic_generate'
      )
    }

    try {
      const existingPlan = (project.plan as Record<string, unknown> | null) ?? {}
      const mergedPlan = { ...existingPlan, ...summary }
      await supabase.from('projects').update({ plan: mergedPlan }).eq('id', projectId)
    } catch (e) {
      console.warn('[plan/summary] plan_persist_failed', e)
      // Still return the summary so the client can proceed.
    }

    return NextResponse.json({ ok: true, summary })
  } catch (e) {
    // Belt-and-braces: anything that escapes the inner handlers above.
    return fail(e, 'unhandled')
  }
}
