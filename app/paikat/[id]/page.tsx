import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const lajiVari: Record<string, string> = {
  padel:     'bg-blue-100 text-blue-700',
  tennis:    'bg-green-100 text-green-700',
  jooga:     'bg-purple-100 text-purple-700',
  kuntosali: 'bg-orange-100 text-orange-700',
  uinti:     'bg-cyan-100 text-cyan-700',
}

function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}

export default async function PaikkaPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) notFound()

  const { data: paikka } = await supabase
    .from('liikuntapaikat')
    .select('*')
    .eq('id', id)
    .single()

  if (!paikka) notFound()

  const hinta = hintateksti(paikka.hinta_min, paikka.hinta_max)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Takaisin-nappi */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Takaisin hakemistoon
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
          {/* Nimi ja lajibadge */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {paikka.nimi}
            </h1>
            <span className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-full capitalize ${lajiVari[paikka.laji] ?? 'bg-gray-100 text-gray-600'}`}>
              {paikka.laji}
            </span>
          </div>

          <hr className="border-gray-100" />

          {/* Tiedot */}
          <dl className="flex flex-col gap-4">
            {(paikka.osoite || paikka.kaupunki) && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Osoite</dt>
                  <dd className="text-gray-700">
                    {[paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')}
                  </dd>
                </div>
              </div>
            )}

            {hinta && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Hinta</dt>
                  <dd className="text-gray-700">{hinta}</dd>
                </div>
              </div>
            )}

            {paikka.kuvaus && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Kuvaus</dt>
                  <dd className="text-gray-700 leading-relaxed">{paikka.kuvaus}</dd>
                </div>
              </div>
            )}
          </dl>

          {/* Varaa aika -nappi */}
          {paikka.varauslinkki && (
            <>
              <hr className="border-gray-100" />
              <a
                href={paikka.varauslinkki}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-base"
              >
                Varaa aika →
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
