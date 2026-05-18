import { anthropic } from '@/lib/anthropic-provider'
import { streamObject } from 'ai'
import { z } from 'zod'

import { HAIKU } from '@/lib/models'
import { INTERVIEW_SYSTEM_PROMPT } from '@/lib/prompts/interview-system'
import { InterviewSchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  projectId: z.string().uuid(),
  rawGoal: z.string().min(5).max(2000),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 })
  }
  const { projectId, rawGoal } = parsed.data

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Ensure the project belongs to this user before we spend tokens.
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, status')
    .eq('id', projectId)
    .single()
  if (error || !project || project.user_id !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'missing_anthropic_api_key' }, { status: 500 })
  }

  try {
    const result = streamObject({
      model: anthropic(HAIKU),
      schema: InterviewSchema,
      messages: [
        {
          role: 'system',
          content: INTERVIEW_SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        {
          role: 'user',
          content: `Råmål fra brukeren:\n\n"""${rawGoal}"""\n\nGenerer 3-6 spørsmål.`,
        },
      ],
      maxTokens: 2000,
      onError({ error }) {
        console.error('[interview] stream error', error)
      },
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[interview] setup error', err)
    return Response.json(
      { error: 'stream_setup_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
