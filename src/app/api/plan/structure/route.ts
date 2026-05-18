import { anthropic } from '@/lib/anthropic-provider'
import { generateObject } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { PLAN_STRUCTURE_SYSTEM_PROMPT } from '@/lib/prompts/plan-structure-system'
import { checkQuota } from '@/lib/quota'
import { PhaseSchema, SkillBlueprintSchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BodySchema = z.object({ projectId: z.string().uuid() })

// Loose schema for the model output — we tighten on read elsewhere.
const LooseStructureSchema = z.object({
  phases: z.array(PhaseSchema).min(1).max(8),
  skills_needed: z.array(SkillBlueprintSchema).max(6).default([]),
  hooks_recommended: z.array(z.string()).default([]),
})

function fail(err: unknown, where: string, status = 500) {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error(`[plan/structure] ${where}:`, detail)
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
      return NextResponse.json({ error: 'quota_exceeded' }, { status: 402 })
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

    const summaryRecord = project.plan as Record<string, unknown> | null
    if (!summaryRecord?.project_summary || !Array.isArray(summaryRecord.conventions)) {
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
      JSON.stringify(
        {
          project_summary: summaryRecord.project_summary,
          conventions: summaryRecord.conventions,
        },
        null,
        2
      ),
      ``,
      `# Preset: ${preset.name}`,
      preset.stackContext,
      ``,
      `# Suggested Skill blueprints (consider but do not blindly accept)`,
      preset.skillBlueprints.map((s) => `- ${s}`).join('\n'),
      ``,
      `Produce phases, skills_needed, and hooks_recommended.`,
    ].join('\n')

    let structure
    try {
      const result = await generateObject({
        model: anthropic(OPUS),
        schema: LooseStructureSchema,
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
      structure = result.object
    } catch (e) {
      return fail(e, 'anthropic_generate')
    }

    let mergedPlan: Record<string, unknown> = {}
    try {
      mergedPlan = {
        project_summary: summaryRecord.project_summary,
        conventions: summaryRecord.conventions,
        ...structure,
      }
      await supabase.from('projects').update({ plan: mergedPlan }).eq('id', projectId)
    } catch (e) {
      console.warn('[plan/structure] plan_persist_failed', e)
    }

    return NextResponse.json({ ok: true, structure, plan: mergedPlan })
  } catch (e) {
    return fail(e, 'unhandled')
  }
}
