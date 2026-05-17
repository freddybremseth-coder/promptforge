import { NextResponse } from 'next/server'

import { checkQuota } from '@/lib/quota'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const q = await checkQuota(user.id)
  return NextResponse.json({
    ok: q.ok,
    plan: q.plan,
    used: q.used,
    limit: q.limit,
    resetAt: q.resetAt.toISOString(),
  })
}
