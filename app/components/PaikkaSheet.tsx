'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck, Camera, ChevronDown } from 'lucide-react'
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
  const [activeSlide, setActiveSlide] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
    setReviews(null)
    setActiveSlide(0)
    setReviewOpen(false)
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
        height: 'calc(100dvh - 116px)',
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
      {/* Drag handle — keep h-8 (32px) for calc(100% - 32px) on scrollRef */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
      </div>

      {/* Scrollable content — separate from drag target to avoid scroll/drag conflict */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>

        {/* Hero carousel — first child of scrollable area */}
        <div className="relative aspect-video w-full overflow-hidden">
          {/* Floating drag indicator (visual only — outer div handles height accounting) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-10 h-1 bg-[rgba(255,255,255,0.5)] rounded-full" />

          {/* Close + bookmark — absolute top-right */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
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

          {/* Carousel slides — CSS scroll-snap, stop pointer events from bubbling to drag="y" */}
          <div
            ref={carouselRef}
            className="flex overflow-x-auto snap-x snap-mandatory w-full h-full"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onPointerDown={e => e.stopPropagation()}
            onScroll={() => {
              if (!carouselRef.current) return
              const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth)
              setActiveSlide(idx)
            }}
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="snap-start shrink-0 w-full h-full bg-[rgba(0,0,0,0.08)] flex items-center justify-center"
              >
                <Camera size={32} className="text-[rgba(255,255,255,0.4)]" />
              </div>
            ))}
          </div>

          {/* Gradient overlay with name + address */}
          <div
            className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-8"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)' }}
          >
            <h2 className="font-bold text-white text-lg leading-tight">{paikka.nimi}</h2>
            {(paikka.osoite || paikka.kaupunki) && (
              <p className="text-sm text-white/70 mt-0.5">
                {[paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')}
                {distanceKm != null && (
                  <span className="tabular-nums">{' · '}{formatDistance(distanceKm)}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Dot indicators — below hero, outside image */}
        <div className="flex justify-center gap-1.5 py-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
                activeSlide === i ? 'bg-[#111111]' : 'bg-[rgba(0,0,0,0.15)]'
              }`}
            />
          ))}
        </div>

        <div className="px-4 pb-8 flex flex-col gap-4">

          {/* Price — immediately below hero + dots */}
          {priceDisplay && (
            <SheetRow icon={<CircleDollarSign className="w-4 h-4" />} label="Hinta">
              {paikka.hinta_kuvaus
                ? <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.hinta_kuvaus}</p>
                : <span className="font-serif text-xl font-bold text-[#111111]">{priceDisplay}</span>
              }
            </SheetRow>
          )}

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

          {/* Reviews — collapsible, load after mount */}
          {reviews !== null && (
            <>
              {/* Collapsed header */}
              <div
                className="flex items-center gap-3 border-t border-[rgba(0,0,0,0.07)] pt-4 cursor-pointer"
                onClick={() => reviews.length > 0 && setReviewOpen(prev => !prev)}
              >
                <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
                  <span className="text-sm">★</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Arvostelut</p>
                  {reviews.length === 0 ? (
                    <span className="text-sm text-[rgba(17,17,17,0.45)]">☆ Ei arvosteluja</span>
                  ) : (
                    <span className="text-sm text-[#111111]">
                      {'★'.repeat(Math.round(avgRating ?? 0))}{'☆'.repeat(5 - Math.round(avgRating ?? 0))}
                      {' '}{(avgRating ?? 0).toFixed(1)} · {reviews.length} arvostelua
                    </span>
                  )}
                </div>
                {reviews.length > 0 && (
                  <ChevronDown
                    className={cn('w-4 h-4 text-[rgba(17,17,17,0.4)] transition-transform duration-200', reviewOpen && 'rotate-180')}
                  />
                )}
              </div>

              {/* Expandable content */}
              <AnimatePresence initial={false}>
                {reviewOpen && (
                  <motion.div
                    key="reviews"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <ReviewSection
                      paikkaId={paikka.id}
                      initialReviews={reviews}
                      avgRating={avgRating}
                      reviewCount={reviews.length}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

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
