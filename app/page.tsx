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
    .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured')
    .order('nimi')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">Virhe ladattaessa tietoja: {error.message}</p>
      </div>
    )
  }

  const data = paikat ?? []

  if (searchParams.nakyma === 'lista') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <LiikuntapaikatLista paikat={data} />
      </Suspense>
    )
  }

  // nakyma=kartta also renders Etusivu — Etusivu has an integrated fullscreen map.
  // Wire to a standalone Kartta component in Phase 7 when AdvancedMarker migration is done.
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Etusivu paikat={data} />
    </Suspense>
  )
}
