'use client'

import { useState, lazy, Suspense } from 'react'
import Link from 'next/link'

const Kartta = lazy(() => import('./Kartta'))

export type Liikuntapaikka = {
  id: number
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  varauslinkki: string | null
  kuvaus: string | null
}

const LAJIT = ['Kaikki', 'Padel', 'Tennis', 'Jooga', 'Kuntosali', 'Uinti']

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

type Nakyma = 'lista' | 'kartta'

export default function LiikuntapaikatLista({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  const [nakyma, setNakyma] = useState<Nakyma>('lista')

  const suodatettu = aktiivinen === 'Kaikki'
    ? paikat
    : paikat.filter(p => p.laji.toLowerCase() === aktiivinen.toLowerCase())

  return (
    <>
      {/* Välilehdet ja filtterit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Lista / Kartta -toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 shrink-0">
          <button
            onClick={() => setNakyma('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              nakyma === 'lista'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Lista
          </button>
          <button
            onClick={() => setNakyma('kartta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              nakyma === 'kartta'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Kartta
          </button>
        </div>

        {/* Lajifiltterit */}
        <div className="flex flex-wrap gap-2">
          {LAJIT.map(laji => (
            <button
              key={laji}
              onClick={() => setAktiivinen(laji)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                aktiivinen === laji
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {laji}
            </button>
          ))}
        </div>
      </div>

      {/* Karttanäkymä */}
      {nakyma === 'kartta' && (
        <Suspense fallback={
          <div className="w-full h-[520px] bg-gray-100 rounded-xl flex items-center justify-center">
            <p className="text-gray-400 text-sm">Ladataan karttaa...</p>
          </div>
        }>
          <Kartta paikat={suodatettu} />
        </Suspense>
      )}

      {/* Listanäkymä */}
      {nakyma === 'lista' && (
        suodatettu.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suodatettu.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/paikat/${p.id}`}
                    className="font-semibold text-gray-900 text-base leading-snug hover:text-blue-600 transition-colors"
                  >
                    {p.nimi}
                  </Link>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${lajiVari[p.laji] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.laji}
                  </span>
                </div>

                {(p.osoite || p.kaupunki) && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{[p.osoite, p.kaupunki].filter(Boolean).join(', ')}</span>
                  </div>
                )}

                {(p.hinta_min != null || p.hinta_max != null) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{hintateksti(p.hinta_min, p.hinta_max)}</span>
                  </div>
                )}

                {p.kuvaus && (
                  <p className="text-sm text-gray-500 line-clamp-2">{p.kuvaus}</p>
                )}

                {p.varauslinkki && (
                  <a
                    href={p.varauslinkki}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Varaa aika →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-20">
            Ei {aktiivinen.toLowerCase()}-paikkoja löytynyt.
          </p>
        )
      )}
    </>
  )
}
