import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseSSR'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import AdminApplicationList from './AdminApplicationList'

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) notFound()

  const { data: applications } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id,
      paikka_id,
      link_type,
      claim_status,
      created_at,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(nimi, osoite, kaupunki)
    `)
    .eq('claim_status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-xl font-bold text-[#111111]">Admin — Odottavat hakemukset</h1>
        <AdminApplicationList applications={applications ?? []} />
      </div>
    </main>
  )
}
