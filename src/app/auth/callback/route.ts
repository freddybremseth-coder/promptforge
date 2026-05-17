import { NextResponse } from 'next/server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'
  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL(next, url.origin))
}
