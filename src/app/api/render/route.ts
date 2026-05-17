import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { RENDERER_SYSTEM_PROMPT } from '@/lib/prompts/render-system'
import { checkQuota, incrementQuota } from '@/lib/quota'
import { PackageSchema, PlanSchema } from '@/lib/schemas'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({ projectId: z.string().uuid() })

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { projectId } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const quota = await checkQuota(user.id)
  if (!quota.ok) {
    return Response.json(
      { error: 'quota_exceeded', plan: quota.plan, used: quota.used, limit: quota.limit },
      { status: 402 }
    )
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, raw_goal, context, preset, plan')
    .eq('id', projectId)
    .single()
  if (error || !project || project.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  const planParsed = PlanSchema.safeParse(project.plan)
  if (!planParsed.success) {
    return Response.json({ error: 'no_valid_plan' }, { status: 409 })
  }

  const preset = getPreset(project.preset)
  if (!preset) {
    return Response.json({ error: 'unknown_preset' }, { status: 400 })
  }

  const watermark = quota.plan === 'free'

  const userMessage = [
    `# Plan (schema-valid JSON)`,
    JSON.stringify(planParsed.data, null, 2),
    ``,
    `# Project goal`,
    project.raw_goal,
    ``,
    `# Preset: ${preset.name}`,
    preset.stackContext,
    ``,
    `# Render flags`,
    JSON.stringify({ watermark }),
    ``,
    `Produce a schema-valid PackageSchema. Emit CLAUDE.md, one SKILL.md per`,
    `Skill, one phase-prompt per phase, and a README.md.`,
  ].join('\n')

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
  }

  try {
    const result = streamObject({
      model: anthropic(OPUS),
      schema: PackageSchema,
      messages: [
        {
          role: 'system',
          content: RENDERER_SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { role: 'user', content: userMessage },
      ],
      maxTokens: 50000,
      onError({ error }) {
        console.error('[render] stream error', error)
      },
      onFinish: async (event) => {
        try {
          if (!event.object) return
          const admin = createAdminSupabaseClient()
          const tokenCost = (event.usage?.promptTokens ?? 0) + (event.usage?.completionTokens ?? 0)
          await admin.from('prompt_packages').insert({
            project_id: projectId,
            files: event.object.files,
            model_used: OPUS,
            token_cost: tokenCost,
          })
          await admin.from('projects').update({ status: 'ready' }).eq('id', projectId)
          await incrementQuota(user.id)
        } catch {
          // Stream is already closed; rely on Vercel logs for debugging.
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[render] setup error', err)
    return Response.json(
      { error: 'stream_setup_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
