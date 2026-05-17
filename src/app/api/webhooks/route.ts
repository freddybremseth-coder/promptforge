import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { readPlanMetadata, stripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELEVANT_EVENTS = new Set<Stripe.Event.Type>([
  'product.created',
  'product.updated',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_signature', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 400 }
    )
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  const admin = createAdminSupabaseClient()

  try {
    switch (event.type) {
      case 'product.created':
      case 'product.updated': {
        const p = event.data.object as Stripe.Product
        await admin.from('products').upsert({
          id: p.id,
          active: p.active,
          name: p.name,
          description: p.description,
          image: p.images?.[0] ?? null,
          metadata: p.metadata,
        })
        break
      }
      case 'price.created':
      case 'price.updated': {
        const p = event.data.object as Stripe.Price
        await admin.from('prices').upsert({
          id: p.id,
          product_id: typeof p.product === 'string' ? p.product : p.product.id,
          active: p.active,
          description: p.nickname ?? null,
          unit_amount: p.unit_amount,
          currency: p.currency,
          type: p.type,
          interval: p.recurring?.interval ?? null,
          interval_count: p.recurring?.interval_count ?? null,
          trial_period_days: p.recurring?.trial_period_days ?? null,
          metadata: p.metadata,
        })
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await findUserIdForCustomer(admin, sub.customer)
        if (userId) {
          await admin.from('subscriptions').upsert({
            id: sub.id,
            user_id: userId,
            status: sub.status,
            metadata: sub.metadata,
            price_id: sub.items.data[0]?.price.id ?? null,
            quantity: sub.items.data[0]?.quantity ?? null,
            cancel_at_period_end: sub.cancel_at_period_end,
            created: tsToIso(sub.created),
            current_period_start: tsToIso(sub.current_period_start),
            current_period_end: tsToIso(sub.current_period_end),
            ended_at: tsToIso(sub.ended_at),
            cancel_at: tsToIso(sub.cancel_at),
            canceled_at: tsToIso(sub.canceled_at),
            trial_start: tsToIso(sub.trial_start),
            trial_end: tsToIso(sub.trial_end),
          })

          const productId = sub.items.data[0]?.price.product
          const product =
            productId && typeof productId === 'string'
              ? await stripe.products.retrieve(productId)
              : null
          const plan = readPlanMetadata(product?.metadata)
          if (plan) {
            const reset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            await admin.from('usage_quotas').upsert({
              user_id: userId,
              plan: plan.plan_id,
              packages_per_month: plan.packages_per_month,
              packages_this_month: 0,
              reset_at: reset.toISOString(),
            })
          }
        }
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.customer && session.client_reference_id) {
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer.id
          await admin.from('customers').upsert({
            id: session.client_reference_id,
            stripe_customer_id: customerId,
          })
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'handler_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

function tsToIso(ts: number | null | undefined): string | null {
  return ts ? new Date(ts * 1000).toISOString() : null
}

async function findUserIdForCustomer(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): Promise<string | null> {
  const id = typeof customer === 'string' ? customer : customer.id
  const { data } = await admin
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', id)
    .maybeSingle()
  return data?.id ?? null
}
