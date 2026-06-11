import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createBusinessServerClient } from '@/lib/supabase-business'

export default async function BusinessEditLayout({ children }: { children: React.ReactNode }) {
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/business/kirjaudu')
  }
  return <>{children}</>
}
