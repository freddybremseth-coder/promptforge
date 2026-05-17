import { NextResponse } from 'next/server'
import { z } from 'zod'

import { stripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z.object({ priceId: z.string().min(1) })

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: existing } = await admin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()
  let customerId = existing?.stripe_customer_id
  if (!customerId) {
    const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })
    customerId = c.id
    await admin.from('customers').upsert({ id: user.id, stripe_customer_id: customerId })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    success_url: `${origin}/account?upgrade=success`,
    cancel_url: `${origin}/account?upgrade=cancelled`,
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
