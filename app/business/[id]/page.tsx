import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { createBusinessServerClient } from '@/lib/supabase-business'
import WizardInner from '../WizardInner'

export default async function BusinessVenuePage({ params }: { params: { id: string } }) {
  // Parse paikka_id from URL param
  const paikkaId = parseInt(params.id, 10)
  if (isNaN(paikkaId) || paikkaId < 1) notFound()

  // Authorization: verify the logged-in business user owns this venue before serving private data.
  // layout.tsx guarantees a user is authenticated; this checks ownership (not just authentication).
  const supabase = createBusinessServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: link } = await supabase
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
          <WizardInner mode="edit" paikka={paikka} paikkaId={paikkaId} />
        </Suspense>
      </div>
    </main>
  )
}
