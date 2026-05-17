import { NextResponse } from 'next/server'

import { stripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_customer' }, { status: 404 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${origin}/account`,
  })
  return NextResponse.json({ url: session.url })
}
