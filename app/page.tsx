import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Etusivu from './components/Etusivu'
import LiikuntapaikatLista from './components/LiikuntapaikatLista'

export default async function Home({
  searchParams,
}: {
  searchParams: { nakyma?: string }
}) {
  const { data: paikat, error } = await supabase
    .from('liikuntapaikat')
    .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin')
    .order('nimi')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">Virhe ladattaessa tietoja: {error.message}</p>
      </div>
    )
  }

  const data = paikat ?? []

  if (searchParams.nakyma === 'lista' || searchParams.nakyma === 'kartta') {
    return (
      <Suspense>
        <LiikuntapaikatLista paikat={data} />
      </Suspense>
    )
  }

  return (
    <Suspense>
      <Etusivu paikat={data} />
    </Suspense>
  )
}
