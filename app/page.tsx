import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Etusivu from './components/Etusivu'
export default async function Home() {
  const { data: paikat, error } = await supabase
    .from('liikuntapaikat')
    .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured, is_claimed, business_managed, image_url, photo_urls, logo_url')
    .eq('published', true)
    .order('nimi')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">Virhe ladattaessa tietoja: {error.message}</p>
      </div>
    )
  }

  const data = paikat ?? []

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Etusivu paikat={data} />
    </Suspense>
  )
}
