'use client'

import { useRef, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, BookmarkCheck, Bookmark, Building2, Camera, BadgeCheck, Eye, Pencil, Link2, AlertCircle } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import type { Liikuntapaikka } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { getContrastColor, getPanelShade } from '@/lib/branding/brandingResult'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const diagonaalKorttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  isSaved?: boolean
  onShowMap?: (paikka: Liikuntapaikka) => void
  onOpen?: (paikka: Liikuntapaikka) => void
  onToggleTodo?: (id: number) => void
  brandColor?: string
  /** Optional user-selected accent color (Phase 48/onboarding follow-up). Used for the sport
   * pill background and the "show on map" button icon — falls back to the sport's own color
   * and the default muted gray respectively when omitted. */
  accentColor?: string
  /** Phase 63 (BIZPANEL-06/07): when present, swaps the RIGHT (photo) panel for a permanent
   * icon-button controls panel + status pill, and makes the LEFT info panel fully inert
   * (no click-catcher, no onOpen). Absent at every existing call site — behavior/appearance
   * of those call sites is unchanged. */
  dashboardActions?: {
    status: 'kesken' | 'approved' | 'rejected' | 'pending'
    onPreview: () => void
    onEditOrContinue: () => void
    onCopyInviteLink?: () => void
    copied?: boolean
    onShowRejectionInfo?: () => void
  }
}

export default function DiagonaalKortti({ paikka, distanceStr, isSaved, onShowMap, onOpen, onToggleTodo, brandColor, accentColor, dashboardActions }: DiagonaalKorttiProps) {
  const t = useTranslations('PaikkaKortti')
  const tLajit = useTranslations('Lajit')
  // Dashboard controls-panel copy (Business namespace) — only rendered when dashboardActions
  // is present, but the hook itself is cheap/unconditional per next-intl convention.
  const tBusiness = useTranslations('Business')
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceItems   = priceItemList(paikka.hinta_kuvaus, membershipOnly, hintaTeksti)
  // Derived contrast text colour for the brand-coloured left panel.
  // When brandColor is falsy the panel has no background and we leave text at their
  // default Tailwind classes.  When it is set we override text colour inline.
  const contrastText = brandColor ? getContrastColor(brandColor) : undefined
  // Contrast-aware icon color for the accent-colored "show on map" button — accentColor can
  // be dark (e.g. black) or light, so the icon must follow the same black/white contrast
  // rule as brandColor's text, not a fixed color.
  const accentContrastText = accentColor ? getContrastColor(accentColor) : undefined
  // Dashboard controls-panel background/contrast (D-03/D-04): only computed when
  // dashboardActions is present — every other call site never touches these.
  const panelShade = dashboardActions && brandColor ? getPanelShade(brandColor) : undefined
  const panelShadeContrastText = panelShade ? getContrastColor(panelShade) : undefined
  const panelChipBg = panelShade
    ? (panelShadeContrastText === '#000000' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.20)')
    : undefined
  const { containerRef, measureRef, shouldMarquee } = useOverflowMarquee(priceItems?.join('\n') ?? null)
  const hasCoords    = paikka.latitude != null && paikka.longitude != null

  // Dynaaminen hinta-alueen leveys — lasketaan kortin todellisen leveyden mukaan.
  // Vasen paneeli on leikattu diagonaalipolygonilla (0 0, 62% 0, 57% 100%, 0 100%).
  // Hintatekstin kohdalla (y ≈ 55% kortin korkeudesta) leikkausraja ≈ 59,25% kortin leveydestä.
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const [priceAreaW, setPriceAreaW] = useState(120)
  useLayoutEffect(() => {
    const el = leftPanelRef.current
    if (!el) return
    const compute = () => {
      // 57% = polygon-leikkauksen alin piste (kuvan vasen alareuna).
      // Käytetään tätä tiukimpana rajana niin että sisältö ei koskaan mene
      // kuvan päälle riippumatta siitä millä korkeudella teksti on.
      const w = Math.floor(el.offsetWidth * 0.57) - 12 - 4
      setPriceAreaW(Math.max(60, w))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      variants={diagonaalKorttiVariants}
      className={`relative glass glass-hover rounded-2xl h-36${onOpen ? ' cursor-pointer' : ''}`}
      whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        {/* LEFT: info panel */}
        <div
          ref={leftPanelRef}
          className="absolute inset-0 z-10 flex flex-col p-3 overflow-hidden"
          style={{
            clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)',
            ...(brandColor ? { backgroundColor: brandColor } : {}),
          }}
        >
          <div className="flex items-start gap-2 self-start">
            {/* Logo slot — shows uploaded logo when available, falls back to Building2 */}
            <div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
              {paikka.logo_url ? (
                <img
                  src={paikka.logo_url}
                  alt=""
                  aria-hidden
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
              )}
            </div>
            {/* Sport pill */}
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white truncate max-w-full mt-1"
              style={{ backgroundColor: accentColor ?? laji.color }}
            >
              <SportIcon laji={paikka.laji} size={16} className="shrink-0" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {tLajit(paikka.laji as any)}
            </span>
          </div>

          {/* Name + price grouped tight, mt-1.5 gives minimal breathing room from badge */}
          <div className="flex flex-col gap-0.5 mt-1.5 min-w-0">
            <p
              className="font-bold text-[#111111] text-sm leading-snug line-clamp-1 overflow-hidden"
              style={contrastText ? { color: contrastText } : undefined}
            >
              {paikka.nimi}
              {paikka.business_managed && (
                <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
              )}
            </p>
            {membershipOnly ? (
              <span className="text-xs text-[rgba(17,17,17,0.5)]" style={contrastText ? { color: contrastText } : undefined}>{t('membershipOnly')}</span>
            ) : priceItems ? (
              <div
                ref={containerRef}
                className="overflow-hidden relative"
                style={{
                  maxWidth: priceAreaW,
                  // Maski on aina päällä. Fade LOPPUU 78%:iin kontista — jättää 22% tyhjää
                  // puskuritilaa ennen kontin fyysistä reunaa (joka on lähellä diagonaalia).
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 70%, transparent 86%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 70%, transparent 86%)',
                }}
              >
                {/* Piilotettu mittausdiv — oikea pillileveys, rajataan priceAreaW:n mukaan */}
                <div
                  ref={measureRef}
                  className="absolute invisible flex items-center gap-1.5 pointer-events-none"
                  aria-hidden="true"
                >
                  {priceItems.map((item, i) => (
                    <span key={i} className="text-xs font-bold tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {item}
                    </span>
                  ))}
                </div>
                {shouldMarquee ? (
                  <div
                    className="flex items-center gap-3 whitespace-nowrap"
                    style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
                  >
                    {[...priceItems, ...priceItems].map((item, i) => (
                      <span
                        key={i}
                        className="shrink-0 text-xs font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded"
                        style={contrastText ? { color: contrastText } : undefined}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {priceItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-xs font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={contrastText ? { color: contrastText } : undefined}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-[rgba(17,17,17,0.35)]" style={contrastText ? { color: contrastText } : undefined}>{t('priceComingSoon')}</span>
            )}
          </div>

          {/* Bottom row: mt-auto pins it to the bottom; pl-7 clears the map button */}
          <div className="flex items-center gap-3 pl-7 mt-auto min-w-0">
            {distanceStr && (
              <span className="text-xs tabular-nums text-[rgba(17,17,17,0.4)] shrink-0">{distanceStr}</span>
            )}
            {openStatus.status === 'open' && (
              <span className="text-xs font-bold text-green-700 truncate">
                {t('openNow')} · {openStatus.hours}
              </span>
            )}
            {openStatus.status === 'closed' && (
              <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">{t('closed')}</span>
            )}
          </div>
        </div>

        {/* RIGHT: venue photo or sport-color fallback (consumer variant) — replaced by the
            dashboard controls panel (icon buttons + status pill) when dashboardActions is
            present. Same wrapping div + clip-path (D-01 — identical diagonal silhouette). */}
        <div
          className="absolute top-0 right-0 bottom-0 overflow-hidden"
          style={{ left: '50%', clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 4% 100%)' }}
        >
          {dashboardActions ? (
            <div
              className={`w-full h-full flex items-center justify-center${panelShade ? '' : ' glass'}`}
              style={panelShade ? { backgroundColor: panelShade } : undefined}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); e.preventDefault(); dashboardActions.onPreview() }}
                  aria-label={tBusiness('esikatseluCta')}
                  disabled={dashboardActions.status === 'kesken'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${dashboardActions.status === 'kesken' ? 'opacity-40 pointer-events-none' : ''} ${panelShade ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
                  style={panelShade ? { backgroundColor: panelChipBg, color: panelShadeContrastText } : undefined}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); e.preventDefault(); dashboardActions.onEditOrContinue() }}
                  aria-label={dashboardActions.status === 'kesken' ? tBusiness('jatkaCta') : tBusiness('muokkaaCta')}
                  className={`w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${panelShade ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
                  style={panelShade ? { backgroundColor: panelChipBg, color: panelShadeContrastText } : undefined}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {dashboardActions.onCopyInviteLink && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); e.preventDefault(); dashboardActions.onCopyInviteLink?.() }}
                    aria-label={dashboardActions.copied ? tBusiness('inviteLinkCopied') : tBusiness('copyInviteLinkCta')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${panelShade ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
                    style={panelShade ? { backgroundColor: panelChipBg, color: panelShadeContrastText } : undefined}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {dashboardActions.onShowRejectionInfo && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); e.preventDefault(); dashboardActions.onShowRejectionInfo?.() }}
                    aria-label={tBusiness('showRejectionInfoLabel')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${panelShade ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
                    style={panelShade ? { backgroundColor: panelChipBg, color: panelShadeContrastText } : undefined}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const src = paikka.image_url ?? paikka.photo_urls?.[0] ?? null
                return src ? (
                  <img
                    src={src}
                    alt={`Kuva: ${paikka.nimi}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const fallback = img.parentElement?.querySelector('[data-fallback]') as HTMLElement | null
                      if (fallback) fallback.hidden = false
                    }}
                  />
                ) : null
              })()}
              <div
                className="w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.06)]"
                aria-hidden
                data-fallback
                hidden={!!(paikka.image_url ?? paikka.photo_urls?.[0])}
              >
                <Camera size={24} className="text-[rgba(0,0,0,0.2)]" />
              </div>
            </>
          )}
        </div>

      {/* Click-catcher rendered after LEFT/RIGHT panels so it paints on top of them
          (same z-10 layer, later in DOM order wins) — still below the z-20 action
          buttons below, which stopPropagation()/preventDefault() on their own clicks.
          D-10: the dashboard variant's LEFT panel is fully inert — no click-catcher at all. */}
      {dashboardActions ? null : onOpen ? (
        <div
          role="button"
          tabIndex={0}
          className="absolute inset-0 block z-10 cursor-pointer"
          onClick={() => onOpen(paikka)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(paikka) }}
        />
      ) : (
        <div className="absolute inset-0 block z-10" />
      )}

      {dashboardActions && (
        <span
          className={`absolute bottom-3 right-3 z-20 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
            dashboardActions.status === 'kesken'
              ? 'bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]'
              : dashboardActions.status === 'approved'
              ? 'bg-green-100 text-green-700'
              : dashboardActions.status === 'rejected'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {dashboardActions.status === 'kesken'
            ? tBusiness('statusKesken')
            : dashboardActions.status === 'approved'
            ? tBusiness('statusApproved')
            : dashboardActions.status === 'rejected'
            ? tBusiness('statusRejected')
            : tBusiness('statusPending')}
        </span>
      )}

      {hasCoords && !dashboardActions && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onShowMap?.(paikka) }}
          aria-label={t('showOnMap')}
          className={`absolute bottom-2 left-2 z-20 w-7 h-7 rounded-full flex items-center justify-center [transition:color_150ms_ease] ${accentColor ? '' : 'glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]'}`}
          style={accentColor ? { backgroundColor: accentColor, color: accentContrastText } : undefined}
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
      )}
      {onToggleTodo && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleTodo(paikka.id) }}
          aria-label={isSaved ? t('removeFromTodo') : t('addToTodo')}
          className="absolute bottom-3 right-3 z-20 w-7 h-7 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_ease]"
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      )}
      </div>
    </motion.div>
  )
}
