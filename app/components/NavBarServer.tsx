import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabaseSSR'
import NavBar from './NavBar'

export default async function NavBarServer() {
  const { data: { user } } = await createServerSupabase(cookies()).auth.getUser()
  return <NavBar userEmail={user?.email ?? null} />
}
