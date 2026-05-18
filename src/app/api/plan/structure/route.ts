import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { PLAN_STRUCTURE_SYSTEM_PROMPT } from '@/lib/prompts/plan-structure-system'
import { checkQuota } from '@/lib/quota'
import { PlanStructureSchema, PlanSummarySchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    return NextResponse.json({ error: 'quota_exceeded' }, { status: 402 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, raw_goal, context, preset, plan')
    .eq('id', projectId)
    .single()
  if (error || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const preset = getPreset(project.preset)
  if (!preset) {
    return NextResponse.json({ error: 'unknown_preset' }, { status: 400 })
  }

  const summaryParsed = PlanSummarySchema.safeParse(project.plan)
  if (!summaryParsed.success) {
    return NextResponse.json(
      { error: 'no_summary', detail: 'Run /api/plan/summary first.' },
      { status: 409 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
  }

  const userMessage = [
    `# Project goal`,
    project.raw_goal,
    ``,
    `# Already decided`,
    JSON.stringify(summaryParsed.data, null, 2),
    ``,
    `# Preset: ${preset.name}`,
    preset.stackContext,
    ``,
    `# Suggested Skill blueprints (consider but do not blindly accept)`,
    preset.skillBlueprints.map((s) => `- ${s}`).join('\n'),
    ``,
    `Produce phases, skills_needed, and hooks_recommended.`,
  ].join('\n')

  try {
    const result = await generateObject({
      model: anthropic(OPUS),
      schema: PlanStructureSchema,
      messages: [
        {
          role: 'system',
          content: PLAN_STRUCTURE_SYSTEM_PROMPT,
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
        },
        { role: 'user', content: userMessage },
      ],
      maxTokens: 4000,
    })

    const mergedPlan = { ...summaryParsed.data, ...result.object }
    await supabase.from('projects').update({ plan: mergedPlan }).eq('id', projectId)

    return NextResponse.json({ ok: true, structure: result.object, plan: mergedPlan })
  } catch (err) {
    console.error('[plan/structure] error', err)
    return NextResponse.json(
      { error: 'generation_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
