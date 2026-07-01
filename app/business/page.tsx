'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { Map } from 'lucide-react'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'
import PreviewModal from '@/app/components/PreviewModal'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import RejectionReasonPopup from '@/app/components/RejectionReasonPopup'
import type { Liikuntapaikka } from '@/lib/types'
import { deriveVenueStatus } from '@/lib/venueStatus'

type VenueLiikuntapaikka = {
  id: number
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  hinta_kuvaus: string | null
  puhelin: string | null
  varauslinkki: string | null
  kuvaus: string | null
  aukioloajat: Record<string, unknown> | null
  image_url: string | null
  logo_url: string | null
  photo_urls: string[] | null
}

type VenueLink = {
  paikka_id: number
  claim_status: string
  rejection_reason: string | null
  submitted_at: string | null
  liikuntapaikat: VenueLiikuntapaikka | null
}

type TBusiness = ReturnType<typeof useTranslations<'Business'>>

// --- StatusCard ---
function StatusCard({
  venueLinks,
  t,
}: {
  venueLinks: VenueLink[]
  t: TBusiness
}) {
  const hasApproved = venueLinks.some(l => l.claim_status === 'approved')
  const allRejected = venueLinks.length > 0 && venueLinks.every(l => l.claim_status === 'rejected')
  const rejectedLink = allRejected ? venueLinks.find(l => l.claim_status === 'rejected') : null

  if (hasApproved) {
    return (
      <div className="glass rounded-2xl p-4 flex flex-col gap-1 border-l-4 border-green-500">
        <span className="text-sm font-bold text-[#111111]">{t('dashboardStatusApprovedTitle')}</span>
        <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('dashboardStatusApprovedBody')}</span>
      </div>
    )
  }
  if (allRejected && rejectedLink) {
    return (
      <div className="glass rounded-2xl p-4 flex flex-col gap-2 border-l-4 border-red-500">
        <span className="text-sm font-bold text-[#111111]">{t('dashboardStatusRejectedTitle')}</span>
        <span className="text-xs text-[rgba(17,17,17,0.45)]">
          {rejectedLink.rejection_reason
            ? t('dashboardStatusRejectedBody', { reason: rejectedLink.rejection_reason })
            : t('dashboardStatusRejectedBodyNoReason')}
        </span>
      </div>
    )
  }
  // Default: pending
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-1 border-l-4 border-amber-400">
      <span className="text-sm font-bold text-[#111111]">{t('dashboardStatusPendingTitle')}</span>
      <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('dashboardStatusPendingBody')}</span>
    </div>
  )
}

// --- DashboardVenueCard ---
function DashboardVenueCard({
  link,
  isKesken,
  onPreview,
  onShowRejectionInfo,
}: {
  link: VenueLink
  isKesken: boolean
  onPreview: (p: Liikuntapaikka) => void
  onShowRejectionInfo: (link: VenueLink) => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopyInviteLink() {
    const url = window.location.origin + '/business/liity?paikka_id=' + link.paikka_id
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard write failed — no false-positive confirmation.
    }
  }

  if (!link.liikuntapaikat) return null

  return (
    <DiagonaalKortti
      paikka={link.liikuntapaikat as unknown as Liikuntapaikka}
      dashboardActions={{
        status: isKesken ? 'kesken' : (link.claim_status as 'approved' | 'rejected' | 'pending'),
        onPreview: () => { if (link.liikuntapaikat) onPreview(link.liikuntapaikat as unknown as Liikuntapaikka) },
        onEditOrContinue: () => {
          window.location.href = isKesken ? '/business/onboarding?paikka_id=' + link.paikka_id : '/business/' + link.paikka_id
        },
        onCopyInviteLink: link.claim_status === 'approved' && !isKesken ? handleCopyInviteLink : undefined,
        copied,
        onShowRejectionInfo: link.claim_status === 'rejected' ? () => onShowRejectionInfo(link) : undefined,
      }}
    />
  )
}

type PendingAccessRequest = { id: string; paikka_id: number; status: string }

// --- Main page ---
export default function BusinessPage() {
  const t = useTranslations('Business')
  const [venueLinks, setVenueLinks] = useState<VenueLink[]>([])
  const [keskenPaikkaIds, setKeskenPaikkaIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isNotBusinessAccount, setIsNotBusinessAccount] = useState(false)
  const [showAddVenue, setShowAddVenue] = useState(false)
  const [previewPaikka, setPreviewPaikka] = useState<Liikuntapaikka | null>(null)
  const [pendingAccessRequests, setPendingAccessRequests] = useState<PendingAccessRequest[]>([])
  const [rejectionPopupLink, setRejectionPopupLink] = useState<VenueLink | null>(null)

  useEffect(() => {
    async function checkState() {
      const supabase = createBusinessBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: account } = await supabase
        .from('business_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!account) {
        setIsNotBusinessAccount(true)
        setLoading(false)
        return
      }

      // Fetch paikka_ids with an in-progress onboarding draft (D-02/D-03).
      // Existence of a draft row = "Kesken", regardless of claim_status.
      const { data: drafts } = await supabase
        .from('onboarding_draft')
        .select('paikka_id')
        .eq('business_account_id', user.id)

      const keskenSet = new Set<number>((drafts ?? []).map((d: { paikka_id: number }) => d.paikka_id))

      // Fetch all linked venues with their approval status and rejection reason
      const { data: links } = await supabase
        .from('business_paikka_links')
        .select('paikka_id, claim_status, rejection_reason, submitted_at, liikuntapaikat(id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls)')
        .eq('business_account_id', user.id)
        .order('created_at', { ascending: true })

      setVenueLinks((links as unknown as VenueLink[]) ?? [])
      setKeskenPaikkaIds(keskenSet)

      // Fetch pending business_access_requests for the current user.
      // RLS scopes the SELECT to requester_id = auth.uid() (Plan 01 migration).
      // Shows the "Pyyntösi odottaa hyväksyntää" banner when a pending row exists.
      const { data: pendingReqs } = await supabase
        .from('business_access_requests')
        .select('id, paikka_id, status')
        .eq('status', 'pending')
      setPendingAccessRequests((pendingReqs as PendingAccessRequest[]) ?? [])

      setLoading(false)
    }
    checkState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </main>
    )
  }

  if (isNotBusinessAccount) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        <div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-bold text-[#111111]">{t('registerTitle')}</h1>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('errorGeneric')}</p>
          <a
            href="/business/rekisteroidy"
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 flex items-center [transition:background-color_150ms_var(--ease-out)]"
          >
            {t('registerCta')}
          </a>
        </div>
      </main>
    )
  }

  if (venueLinks.length > 0) {
    return (
      <main className="min-h-screen bg-white pt-16 px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Status card */}
          <StatusCard venueLinks={venueLinks} t={t} />

          {/* Pending access-request banner — shown when the current account has a
              pending business_access_requests row (requester waiting for owner approval) */}
          {pendingAccessRequests.length > 0 && (
            <div className="glass rounded-2xl p-4 flex flex-col gap-1 border-l-4 border-amber-400 mt-4">
              <span className="text-sm font-bold text-[#111111]">{t('accessRequestPendingTitle')}</span>
              <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('accessRequestPendingBody')}</span>
            </div>
          )}

          {/* Venue list */}
          <section className="mt-6">
            <h2 className="text-[10px] font-bold text-[rgba(17,17,17,0.45)] uppercase tracking-widest mb-3">
              {t('dashboardVenuesHeading')}
            </h2>
            {/* flex-wrap with a fixed-width wrapper per card (not CSS Grid columns) — a
                grid's equal-fraction tracks stretch/shrink each card to fill its column,
                changing card width by breakpoint. This keeps every card the same fixed
                width as on mobile (w-full below sm) and just tiles more per row as the
                viewport widens, instead of resizing them. */}
            <div className="flex flex-wrap gap-3">
              {venueLinks.map(link => (
                <div key={link.paikka_id} className="w-full sm:w-[360px]">
                  <DashboardVenueCard
                    link={link}
                    isKesken={deriveVenueStatus(link.claim_status, keskenPaikkaIds.has(link.paikka_id), link.submitted_at) === 'kesken'}
                    onPreview={setPreviewPaikka}
                    onShowRejectionInfo={setRejectionPopupLink}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Add venue */}
          <section className="mt-6">
            {showAddVenue ? (
              <div className="glass rounded-2xl p-4 flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddVenue(false)}
                  className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms] text-left"
                >
                  ← {t('backToVenues')}
                </button>
                <ClaimSearchForm />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddVenue(true)}
                className="w-full text-sm font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full h-10 px-4 [transition:border-color_150ms_var(--ease-out)]"
              >
                + {t('addVenueCta')}
              </button>
            )}
          </section>

          {/* Quick actions */}
          <section className="mt-6 flex flex-col gap-3">
            <a
              href="/business/map"
              className="glass rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-[rgba(0,0,0,0.02)] [transition:background-color_150ms_ease]"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-[#111111]">{t('dashboardMapCta')}</span>
                <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('navMap')}</span>
              </div>
              <Map className="w-4 h-4 text-[rgba(17,17,17,0.45)]" />
            </a>
          </section>

          {/* Preview modal */}
          <AnimatePresence>
            {previewPaikka && (
              <PreviewModal paikka={previewPaikka} onClose={() => setPreviewPaikka(null)} />
            )}
          </AnimatePresence>

          {/* Rejection reason popup — single page-level instance, opened via the
              rejection-info icon button on a rejected DashboardVenueCard */}
          <RejectionReasonPopup
            open={!!rejectionPopupLink}
            onClose={() => setRejectionPopupLink(null)}
            rejectionReason={rejectionPopupLink?.rejection_reason ?? null}
            editHref={rejectionPopupLink ? '/business/' + rejectionPopupLink.paikka_id : ''}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      {/* Pending access-request banner for requesters who have no venue links yet */}
      {pendingAccessRequests.length > 0 && (
        <div className="glass rounded-2xl p-4 flex flex-col gap-1 border-l-4 border-amber-400 w-full max-w-md mb-4">
          <span className="text-sm font-bold text-[#111111]">{t('accessRequestPendingTitle')}</span>
          <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('accessRequestPendingBody')}</span>
        </div>
      )}
      <div className="glass rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-xl font-bold text-[#111111]">{t('claimTitle')}</h1>
        <ClaimSearchForm />
      </div>
    </main>
  )
}
