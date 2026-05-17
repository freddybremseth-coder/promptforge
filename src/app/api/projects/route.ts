import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  rawGoal: z.string().min(5).max(2000),
  preset: z.enum([
    'next-supabase-vercel',
    'astro-sqlite-cloudflare',
    'python-fastapi-postgres',
  ]).optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const preset = parsed.data.preset ?? 'next-supabase-vercel'
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      raw_goal: parsed.data.rawGoal,
      preset,
      status: 'interview',
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'insert_failed', detail: error?.message }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
