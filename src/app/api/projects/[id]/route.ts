import { NextResponse } from 'next/server'
import { z } from 'zod'

import { InterviewAnswersSchema } from '@/lib/schemas'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('projects')
    .select('id, raw_goal, context, preset, status, plan, updated_at')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(data)
}

const PatchSchema = z.object({
  context: z
    .object({
      answers: InterviewAnswersSchema.optional(),
      raw: z.unknown().optional(),
    })
    .optional(),
  preset: z
    .enum([
      'next-supabase-vercel',
      'astro-sqlite-cloudflare',
      'python-fastapi-postgres',
    ])
    .optional(),
  status: z.enum(['interview', 'generating', 'ready', 'archived']).optional(),
})

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const json = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('projects')
    .select('id, user_id, context')
    .eq('id', id)
    .single()
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (parsed.data.context) {
    const merged = { ...(existing.context as Record<string, unknown>), ...parsed.data.context }
    update.context = merged
  }
  if (parsed.data.preset) update.preset = parsed.data.preset
  if (parsed.data.status) update.status = parsed.data.status

  const { error } = await supabase.from('projects').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
