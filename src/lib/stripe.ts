import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_unset', {
  apiVersion: '2025-02-24.acacia',
  appInfo: { name: 'PromptForge', version: '0.1.0' },
  typescript: true,
})

export interface PlanMetadata {
  plan_id: 'free' | 'starter' | 'pro'
  packages_per_month: number
}

export function readPlanMetadata(metadata: Stripe.Metadata | null | undefined): PlanMetadata | null {
  if (!metadata) return null
  const plan = metadata.plan_id
  const limit = Number(metadata.packages_per_month)
  if (plan !== 'free' && plan !== 'starter' && plan !== 'pro') return null
  if (!Number.isFinite(limit) || limit <= 0) return null
  return { plan_id: plan, packages_per_month: limit }
}
