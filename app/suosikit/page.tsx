import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'
import SuosikitClient from './SuosikitClient'

export default async function SuosikitPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  return <SuosikitClient userEmail={user?.email ?? null} />
}
