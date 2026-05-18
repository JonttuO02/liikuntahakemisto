import { supabase } from '@/lib/supabase'
import LiikuntapaikatLista from './components/LiikuntapaikatLista'

export default async function Home() {
  const { data: paikat, error } = await supabase
    .from('liikuntapaikat')
    .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus')
    .order('nimi')

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-red-500 text-sm">Virhe ladattaessa tietoja: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Liikuntahakemisto</h1>
          <p className="mt-1 text-gray-500 text-sm">
            {paikat?.length ?? 0} liikuntapaikkaa
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <LiikuntapaikatLista paikat={paikat ?? []} />
      </div>
    </main>
  )
}
