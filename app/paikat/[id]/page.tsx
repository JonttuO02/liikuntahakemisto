import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone, MapPin, CircleDollarSign, Info, ChevronLeft, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import { formatGroupedHours } from '@/lib/aukiolo'
import HoursTable from '@/app/components/HoursTable'
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

  const laji        = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const hoursGroups = formatGroupedHours(paikka.aukioloajat ?? null)
  const hintaTeksti = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const priceToShow = paikka.hinta_kuvaus || (hintaTeksti !== '' ? hintaTeksti : null)
  const osoiteRivi  = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[rgba(0,0,0,0.07)]">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
          >
            <ChevronLeft className="w-4 h-4" />
            Takaisin hakemistoon
          </Link>

          <div className="mt-6">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full text-white"
              style={{ backgroundColor: laji.color }}
            >
              {laji.label}
            </span>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[#111111] leading-tight tracking-tight">
              {paikka.nimi}
            </h1>
            {osoiteRivi && (
              <p className="mt-2 text-[rgba(17,17,17,0.45)] text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {osoiteRivi}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Content card ──────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
        <div className="glass rounded-2xl overflow-hidden">

          <div className="p-6 sm:p-8 flex flex-col gap-5">

            {paikka.latitude != null && paikka.longitude != null && (
              <Row icon={<MapPin className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Sijainti">
                <Link
                  href={`/?id=${paikka.id}`}
                  className="text-[#111111] hover:text-[rgba(17,17,17,0.6)] text-sm font-bold underline underline-offset-2 [transition:color_150ms_var(--ease-out)]"
                >
                  Näytä kartalla →
                </Link>
              </Row>
            )}

            {hoursGroups.length > 0 && (
              <Row icon={<Clock className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Aukioloajat">
                <HoursTable groups={hoursGroups} />
              </Row>
            )}

            {paikka.puhelin && (
              <Row icon={<Phone className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Puhelin">
                <a href={`tel:${paikka.puhelin}`}
                  className="text-[#111111] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)] font-medium">
                  {paikka.puhelin}
                </a>
              </Row>
            )}

            {priceToShow && (
              <Row icon={<CircleDollarSign className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Hinta">
                {paikka.hinta_kuvaus ? (
                  <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.hinta_kuvaus}</p>
                ) : (
                  <span className="font-serif text-xl font-bold text-[#111111]">{priceToShow}</span>
                )}
              </Row>
            )}

            {paikka.kuvaus && (
              <Row icon={<Info className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Kuvaus">
                <p className="text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.kuvaus}</p>
              </Row>
            )}
          </div>

          {paikka.varauslinkki && (
            <div className="px-6 sm:px-8 pb-8">
              <a
                href={paikka.varauslinkki}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  size: 'lg',
                  className: 'w-full rounded-full bg-[#111111] hover:bg-[#333333] active:scale-[0.97] text-white font-semibold text-base h-14 no-underline [transition:background-color_150ms_var(--ease-out),transform_100ms_var(--ease-out)]',
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

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
