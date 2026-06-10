import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseSSR'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import EditWizardInner from './EditWizardInner'

export default async function BusinessVenuePage({ params }: { params: { id: string } }) {
  // Auth guard — mirrors NavBarServer.tsx and app/paikat/[id]/page.tsx pattern
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/business/rekisteroidy')

  // Business account check
  const { data: account } = await supabaseAdmin
    .from('business_accounts')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) redirect('/business/rekisteroidy')

  // Parse paikka_id from URL param
  const paikkaId = parseInt(params.id, 10)
  if (isNaN(paikkaId) || paikkaId < 1) notFound()

  // Ownership check — user must have a business_paikka_links row for this paikka
  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()

  if (!link) notFound()

  // Fetch paikka data
  const { data: paikka } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls')
    .eq('id', paikkaId)
    .maybeSingle()

  if (!paikka) notFound()

  return (
    <main className="min-h-screen bg-white px-4 py-12">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
            </div>
          }
        >
          <EditWizardInner paikka={paikka} paikkaId={paikkaId} />
        </Suspense>
      </div>
    </main>
  )
}
