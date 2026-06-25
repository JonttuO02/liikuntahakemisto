import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createBusinessServerClient } from '@/lib/supabase-business'
import BusinessProfiiliClient from './BusinessProfiiliClient'

export default async function BusinessProfiiliPage() {
  const cookieStore = await cookies()
  const supabase = createBusinessServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/business/kirjaudu')
  const { data: account } = await supabase
    .from('business_accounts')
    .select('companies(name), contact_phone')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) redirect('/business')
  // company_id is a to-one FK, but the Supabase JS client types embedded
  // relationships as an array without an explicit foreign-key hint in the
  // schema; at runtime this is always a single related row (or null).
  const company = Array.isArray(account.companies) ? account.companies[0] : account.companies
  return (
    <BusinessProfiiliClient
      companyName={company?.name ?? ''}
      email={user.email ?? ''}
      contactPhone={account.contact_phone ?? ''}
      userId={user.id}
    />
  )
}
