'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck } from 'lucide-react'
import Link from 'next/link'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti, cn } from '@/lib/utils'
import { formatGroupedHours, getOpenStatus } from '@/lib/aukiolo'
import { isSafeUrl } from '@/lib/urlUtils'
import HoursTable from './HoursTable'
import ReviewSection, { type ReviewRow } from './ReviewSection'
import type { Liikuntapaikka } from '@/lib/types'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { computeAvgRating } from '@/lib/reviewUtils'
import { formatDistance } from '@/lib/geo'

interface Props {
  paikka: Liikuntapaikka
  todo: boolean
  distanceKm?: number
  onClose: () => void
  onToggleTodo: (id: number) => void
}

export default function PaikkaSheet({ paikka, todo, distanceKm, onClose, onToggleTodo }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
    setReviews(null)
  }, [paikka.id])

  useEffect(() => {
    const sb = createBrowserSupabase()
    sb.from('reviews')
      .select('id, rating, teksti, is_anonymous, reviewer_name, created_at')
      .eq('paikka_id', paikka.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data ?? []))
  }, [paikka.id])

  const hoursGroups = formatGroupedHours(paikka.aukioloajat ?? null)
  const openStatus = getOpenStatus(paikka.aukioloajat)
  const priceStr = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const priceDisplay = paikka.hinta_kuvaus || priceStr || null
  const avgRating = reviews ? computeAvgRating(reviews.map(r => r.rating)) : null

  return (
    <motion.div
      layoutId={`vc-${paikka.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass rounded-t-3xl"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: '90vh',
        zIndex: 66,
        overflow: 'hidden',
      }}
      transition={{ type: 'spring', damping: 32, stiffness: 260 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.15 }}
      onDragEnd={(_, info) => {
        if (info.velocity.y > 400 || info.offset.y > 100) onClose()
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
      </div>

      {/* Scrollable content — separate from drag target to avoid scroll/drag conflict */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
        <div className="px-4 pb-8 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span
              className="inline-flex text-[10px] font-bold px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: lajiKonfig[paikka.laji]?.color ?? '#6b7280' }}
            >
              {lajiKonfig[paikka.laji]?.label ?? paikka.laji}
            </span>
            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
                onClick={() => onToggleTodo(paikka.id)}
                aria-label={todo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'}
                className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"
              >
                {todo
                  ? <BookmarkCheck className={cn('w-4 h-4 fill-[#111111] text-[#111111]')} />
                  : <Bookmark className={cn('w-4 h-4 text-[rgba(17,17,17,0.35)]')} />
                }
              </motion.button>
              <button
                onClick={onClose}
                className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name + address */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#111111] leading-tight">{paikka.nimi}</h2>
            {(paikka.osoite || paikka.kaupunki) && (
              <p className="mt-1 text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {[paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')}
                {distanceKm != null && (
                  <span className="tabular-nums">{' · '}{formatDistance(distanceKm)}</span>
                )}
              </p>
            )}
          </div>

          {/* Open status */}
          {openStatus.status !== 'no-data' && (
            <p className="text-sm">
              {openStatus.status === 'open'
                ? <span className="text-green-700 font-bold">● Auki nyt{openStatus.hours ? ` · ${openStatus.hours}` : ''}</span>
                : <span className="text-[rgba(17,17,17,0.45)]">Suljettu{openStatus.hours ? ` · ${openStatus.hours}` : ''}</span>
              }
            </p>
          )}

          {/* Hours */}
          {hoursGroups.length > 0 && (
            <SheetRow icon={<Clock className="w-4 h-4" />} label="Aukioloajat">
              <HoursTable groups={hoursGroups} />
            </SheetRow>
          )}

          {/* Price */}
          {priceDisplay && (
            <SheetRow icon={<CircleDollarSign className="w-4 h-4" />} label="Hinta">
              {paikka.hinta_kuvaus
                ? <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.hinta_kuvaus}</p>
                : <span className="font-serif text-xl font-bold text-[#111111]">{priceDisplay}</span>
              }
            </SheetRow>
          )}

          {/* Phone */}
          {paikka.puhelin && (
            <SheetRow icon={<Phone className="w-4 h-4" />} label="Puhelin">
              <a
                href={`tel:${paikka.puhelin}`}
                className="text-sm font-bold text-[#111111] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]"
              >
                {paikka.puhelin}
              </a>
            </SheetRow>
          )}

          {/* Booking link */}
          {isSafeUrl(paikka.varauslinkki) && (
            <a
              href={paikka.varauslinkki!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm [transition:background-color_150ms_var(--ease-out)]"
            >
              <ExternalLink className="w-4 h-4" />
              Varaa aika
            </a>
          )}

          {/* Description */}
          {paikka.kuvaus && (
            <SheetRow icon={<Info className="w-4 h-4" />} label="Kuvaus">
              <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.kuvaus}</p>
            </SheetRow>
          )}

          {/* Reviews — load after mount */}
          {reviews !== null && (
            <ReviewSection
              paikkaId={paikka.id}
              initialReviews={reviews}
              avgRating={avgRating}
              reviewCount={reviews.length}
            />
          )}

          {/* Link to full venue page */}
          <Link
            href={`/paikat/${paikka.id}`}
            className="text-center text-xs text-[rgba(17,17,17,0.35)] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)] underline underline-offset-2 mt-2"
          >
            Avaa paikkasivu selaimessa →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function SheetRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-[rgba(0,0,0,0.07)] pt-4">
      <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}
