import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createBusinessServerClient } from '@/lib/supabase-business'
import BusinessKirjauduClient from './BusinessKirjauduClient'

export default async function BusinessKirjauduPage() {
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/business')
  }
  return <BusinessKirjauduClient />
}
