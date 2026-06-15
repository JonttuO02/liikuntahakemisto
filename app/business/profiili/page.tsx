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
    .select('company_name, contact_phone')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) redirect('/business')
  return (
    <BusinessProfiiliClient
      companyName={account.company_name}
      email={user.email ?? ''}
      contactPhone={account.contact_phone ?? ''}
      userId={user.id}
    />
  )
}
