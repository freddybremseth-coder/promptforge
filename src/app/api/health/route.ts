import { NextResponse } from 'next/server'

// Lightweight diagnostic. Public — returns no secrets, just enough to verify
// which build is live and which env vars are present.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: 'temperature-strip',
    routes: ['api/plan/summary', 'api/plan/structure', 'api/render/start', 'api/render/file'],
    env: {
      hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
  })
}
