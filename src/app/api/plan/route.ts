import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'

import { OPUS } from '@/lib/models'
import { PLAN_SYSTEM_PROMPT } from '@/lib/prompts/plan-system'
import { checkQuota } from '@/lib/quota'
import { PlanSchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPreset } from '@/presets'

// Node runtime: Vercel Hobby caps Edge at 25s, but Node serverless allows up
// to 60s — and Opus + JSON-mode planning needs more than 25s even without
// extended thinking.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
      { error: 'quota_exceeded', plan: quota.plan, used: quota.used, limit: quota.limit, resetAt: quota.resetAt },
      { status: 402 }
    )
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, raw_goal, context, preset')
    .eq('id', projectId)
    .single()
  if (error || !project || project.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  const preset = getPreset(project.preset)
  if (!preset) {
    return Response.json({ error: 'unknown_preset' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
  }

  await supabase.from('projects').update({ status: 'generating' }).eq('id', projectId)

  const userMessage = [
    `# Project goal`,
    project.raw_goal,
    ``,
    `# Interview answers (JSON)`,
    JSON.stringify(project.context, null, 2),
    ``,
    `# Chosen preset: ${preset.name}`,
    preset.stackContext,
    ``,
    `# Pre-existing conventions (baseline, you may extend)`,
    preset.defaultConventions.map((c) => `- ${c}`).join('\n'),
    ``,
    `# Suggested Skill blueprints to consider`,
    preset.skillBlueprints.map((s) => `- ${s}`).join('\n'),
    ``,
    `Ultrathink, then produce a schema-valid Plan.`,
  ].join('\n')

  try {
    const result = streamObject({
      model: anthropic(OPUS),
      schema: PlanSchema,
      messages: [
        {
          role: 'system',
          content: PLAN_SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { role: 'user', content: userMessage },
      ],
      // Extended thinking is disabled to fit within the 60s Hobby Node window.
      // Pro users can re-enable by setting THINKING_BUDGET in env and adapting.
      maxTokens: 6000,
      onError({ error }) {
        console.error('[plan] stream error', error)
      },
      onFinish: async (event) => {
        try {
          if (event.object) {
            await supabase
              .from('projects')
              .update({ plan: event.object })
              .eq('id', projectId)
          }
        } catch {
          // Stream is already closed; rely on Vercel logs for debugging.
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[plan] setup error', err)
    return Response.json(
      { error: 'stream_setup_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
