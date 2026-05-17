import { redirect } from 'next/navigation'

import { AccountClient } from './AccountClient'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin?redirect=/account')

  const [{ data: prices }, { data: products }] = await Promise.all([
    supabase
      .from('prices')
      .select('id, unit_amount, currency, interval, product_id')
      .eq('active', true),
    supabase
      .from('products')
      .select('id, name, description, metadata')
      .eq('active', true),
  ])

  return <AccountClient email={user.email ?? ''} prices={prices ?? []} products={products ?? []} />
}
