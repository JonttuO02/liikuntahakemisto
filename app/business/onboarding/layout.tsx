import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }
  return <>{children}</>
}
