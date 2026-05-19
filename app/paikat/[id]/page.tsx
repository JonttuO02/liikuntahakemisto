import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default async function PaikkaPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) notFound()

  const { data: paikka } = await supabase
    .from('liikuntapaikat')
    .select('*')
    .eq('id', id)
    .single()

  if (!paikka) notFound()

  const laji       = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'bg-gray-100 text-gray-600', accentBg: 'bg-gray-400' }
  const hinta      = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const osoiteRivi = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[#EEF2FF]">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative bg-[#4F46E5] pb-16">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Takaisin hakemistoon
          </Link>

          <div className="mt-6">
            <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${laji.badgeTw}`}>
              {laji.label}
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {paikka.nimi}
            </h1>
            {osoiteRivi && (
              <p className="mt-2 text-indigo-200 text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {osoiteRivi}
              </p>
            )}
          </div>
        </div>

        {/* Aalto */}
        <svg className="absolute bottom-0 left-0 w-full h-16" viewBox="0 0 1440 64"
          preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z" fill="#EEF2FF" />
        </svg>
      </section>

      {/* ── Sisältökortti ──────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-10">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">

          <div className="p-6 sm:p-8 flex flex-col gap-5">

            {paikka.latitude != null && paikka.longitude != null && (
              <Row icon={<LocationIcon />} label="Sijainti">
                <a
                  href={`https://maps.google.com/?q=${paikka.latitude},${paikka.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium [transition:color_150ms_var(--ease-out)]"
                >
                  Näytä kartalla →
                </a>
              </Row>
            )}

            {paikka.puhelin && (
              <Row icon="📞" label="Puhelin">
                <a href={`tel:${paikka.puhelin}`}
                  className="text-gray-800 hover:text-indigo-600 transition-colors font-medium">
                  {paikka.puhelin}
                </a>
              </Row>
            )}

            {hinta && (
              <Row icon={<PriceIcon />} label="Hinta">
                <span className="text-xl font-bold text-indigo-600">{hinta}</span>
              </Row>
            )}

            {paikka.kuvaus && (
              <Row icon={<InfoIcon />} label="Kuvaus">
                <p className="text-gray-700 leading-relaxed">{paikka.kuvaus}</p>
              </Row>
            )}
          </div>

          {/* Iso CTA */}
          {paikka.varauslinkki && (
            <div className="px-6 sm:px-8 pb-8">
              <a
                href={paikka.varauslinkki}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  size: 'lg',
                  className: 'w-full rounded-full bg-[#6366F1] hover:bg-indigo-600 active:scale-[0.97] text-white font-bold text-base h-14 shadow-lg shadow-indigo-200 no-underline [transition:background-color_150ms_var(--ease-out),transform_100ms_var(--ease-out)]',
                })}
              >
                Varaa aika →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  icon, label, children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

function LocationIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PriceIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
