import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export interface QuotaCheck {
  ok: boolean
  plan: 'free' | 'starter' | 'pro'
  used: number
  limit: number
  resetAt: Date
}

const DEFAULT_LIMITS: Record<QuotaCheck['plan'], number> = {
  free: 1,
  starter: 10,
  pro: 999,
}

export async function checkQuota(userId: string): Promise<QuotaCheck> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    // First time: insert a free-tier row so subsequent calls are cheap.
    const reset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await supabase.from('usage_quotas').insert({
      user_id: userId,
      plan: 'free',
      packages_per_month: DEFAULT_LIMITS.free,
      packages_this_month: 0,
      reset_at: reset.toISOString(),
    })
    return { ok: true, plan: 'free', used: 0, limit: DEFAULT_LIMITS.free, resetAt: reset }
  }

  const resetAt = new Date(data.reset_at)
  let used = data.packages_this_month
  if (resetAt.getTime() < Date.now()) {
    used = 0
    const next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await supabase
      .from('usage_quotas')
      .update({ packages_this_month: 0, reset_at: next.toISOString() })
      .eq('user_id', userId)
    return { ok: true, plan: data.plan, used: 0, limit: data.packages_per_month, resetAt: next }
  }

  return {
    ok: used < data.packages_per_month,
    plan: data.plan,
    used,
    limit: data.packages_per_month,
    resetAt,
  }
}

export async function incrementQuota(userId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.rpc('increment_quota', { p_user_id: userId })
  if (error) throw error
}
