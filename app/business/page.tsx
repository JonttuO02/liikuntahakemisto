'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { Map } from 'lucide-react'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'
import PreviewModal from '@/app/components/PreviewModal'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import RejectionReasonPopup from '@/app/components/RejectionReasonPopup'
import TeamManagementPopup from '@/app/components/TeamManagementPopup'
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

// D-02 visibility gate summary — sourced from the same Plan 64-01 service-role
// list endpoint the popup uses, computed once per approved-and-not-kesken venue
// at dashboard-render time (no separate/second gate fetch path).
type TeamSummary = { pendingCount: number; memberBeyondOwnerCount: number }

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
  brandColor,
  accentColor,
  onPreview,
  onShowRejectionInfo,
  onManageTeam,
  teamSummary,
}: {
  link: VenueLink
  isKesken: boolean
  brandColor?: string
  accentColor?: string
  onPreview: (p: Liikuntapaikka) => void
  onShowRejectionInfo: (link: VenueLink) => void
  onManageTeam: (paikkaId: number) => void
  teamSummary?: TeamSummary
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
      brandColor={brandColor}
      accentColor={accentColor}
      dashboardActions={{
        status: isKesken ? 'kesken' : (link.claim_status as 'approved' | 'rejected' | 'pending'),
        onPreview: () => { if (link.liikuntapaikat) onPreview(link.liikuntapaikat as unknown as Liikuntapaikka) },
        onEditOrContinue: () => {
          window.location.href = isKesken ? '/business/onboarding?paikka_id=' + link.paikka_id : '/business/' + link.paikka_id
        },
        onCopyInviteLink: link.claim_status === 'approved' && !isKesken ? handleCopyInviteLink : undefined,
        copied,
        onShowRejectionInfo: link.claim_status === 'rejected' ? () => onShowRejectionInfo(link) : undefined,
        // D-02: icon shows only when the venue has >=1 pending request OR >=1
        // team member beyond the owner — an approved-but-empty (owner-only,
        // zero pending) venue passes undefined and shows no icon.
        onManageTeam:
          link.claim_status === 'approved' &&
          !isKesken &&
          ((teamSummary?.pendingCount ?? 0) >= 1 || (teamSummary?.memberBeyondOwnerCount ?? 0) >= 1)
            ? () => onManageTeam(link.paikka_id)
            : undefined,
      }}
    />
  )
}

type PendingAccessRequest = { id: string; paikka_id: number; status: string }

type BrandingEntry = { brandColor?: string; accentColor?: string }

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
  const [brandingByPaikkaId, setBrandingByPaikkaId] = useState<Record<number, BrandingEntry>>({})
  const [teamPopupPaikkaId, setTeamPopupPaikkaId] = useState<number | null>(null)
  const [teamSummaryByPaikkaId, setTeamSummaryByPaikkaId] = useState<Record<number, TeamSummary>>({})

  const checkState = useCallback(async () => {
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

      const venueLinksData = (links as unknown as VenueLink[]) ?? []
      setVenueLinks(venueLinksData)
      setKeskenPaikkaIds(keskenSet)

      // D-02 visibility gate data: pending-request count + team-members-beyond-owner
      // count per approved-and-not-kesken venue, sourced from the SAME service-role
      // read the popup uses (Plan 64-01 GET .../access-request/list) — no separate/
      // second fetch path (no anon-client count query, no new count endpoint).
      // pendingAccessRequests below is requester-scoped only and does NOT reflect
      // other users' pending requests to an owned venue, so it cannot drive this gate.
      const approvedNotKeskenVenues = venueLinksData.filter(
        l => l.claim_status === 'approved' && deriveVenueStatus(l.claim_status, keskenSet.has(l.paikka_id), l.submitted_at) !== 'kesken'
      )
      const { data: { session: gateSession } } = await supabase.auth.getSession()
      const gateToken = gateSession?.access_token ?? ''
      const summaryEntries = await Promise.all(
        approvedNotKeskenVenues.map(async (l): Promise<[number, TeamSummary]> => {
          try {
            const res = await fetch(`/api/business/access-request/list?paikka_id=${l.paikka_id}`, {
              headers: { Authorization: 'Bearer ' + gateToken },
            })
            if (!res.ok) throw new Error('gate fetch failed')
            const json = await res.json() as { pendingRequests?: unknown[]; teamMembers?: { isSelf: boolean }[] }
            return [
              l.paikka_id,
              {
                pendingCount: json.pendingRequests?.length ?? 0,
                memberBeyondOwnerCount: (json.teamMembers ?? []).filter(m => !m.isSelf).length,
              },
            ]
          } catch {
            // Fail closed: a transient per-venue error never surfaces a broken control —
            // the icon simply stays hidden for that venue until the next checkState() run.
            return [l.paikka_id, { pendingCount: 0, memberBeyondOwnerCount: 0 }]
          }
        })
      )
      setTeamSummaryByPaikkaId(Object.fromEntries(summaryEntries))

      // Fetch chosen brand colors (business_branding.selected_background_color/selected_accent_color,
      // scoped per venue since Phase 47's paikka_id re-key). These are picked during onboarding's
      // StepBrandingPick and were never being read back for display on the dashboard card or preview
      // — the card/preview rendered with brandColor/accentColor undefined regardless of what the
      // business owner chose and submitted.
      const { data: brandingRows } = await supabase
        .from('business_branding')
        .select('paikka_id, selected_background_color, selected_accent_color')
        .eq('business_account_id', user.id)
      const brandingMap: Record<number, BrandingEntry> = {}
      for (const row of (brandingRows ?? []) as { paikka_id: number; selected_background_color: string | null; selected_accent_color: string | null }[]) {
        brandingMap[row.paikka_id] = {
          brandColor: row.selected_background_color ?? undefined,
          accentColor: row.selected_accent_color ?? undefined,
        }
      }
      setBrandingByPaikkaId(brandingMap)

      // Fetch pending business_access_requests for the current user.
      // RLS scopes the SELECT to requester_id = auth.uid() (Plan 01 migration).
      // Shows the "Pyyntösi odottaa hyväksyntää" banner when a pending row exists.
      const { data: pendingReqs } = await supabase
        .from('business_access_requests')
        .select('id, paikka_id, status')
        .eq('status', 'pending')
      setPendingAccessRequests((pendingReqs as PendingAccessRequest[]) ?? [])

      setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    checkState()
  }, [checkState])

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
                <div key={link.paikka_id} className="w-full sm:w-[396px]">
                  <DashboardVenueCard
                    link={link}
                    isKesken={deriveVenueStatus(link.claim_status, keskenPaikkaIds.has(link.paikka_id), link.submitted_at) === 'kesken'}
                    brandColor={brandingByPaikkaId[link.paikka_id]?.brandColor}
                    accentColor={brandingByPaikkaId[link.paikka_id]?.accentColor}
                    onPreview={setPreviewPaikka}
                    onShowRejectionInfo={setRejectionPopupLink}
                    onManageTeam={setTeamPopupPaikkaId}
                    teamSummary={teamSummaryByPaikkaId[link.paikka_id]}
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
              <PreviewModal
                paikka={previewPaikka}
                brandColor={brandingByPaikkaId[previewPaikka.id]?.brandColor}
                accentColor={brandingByPaikkaId[previewPaikka.id]?.accentColor}
                onClose={() => setPreviewPaikka(null)}
              />
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

          {/* Team management popup — single page-level instance, opened via the
              Users icon button on an approved DashboardVenueCard (D-01/D-02).
              onChanged re-runs checkState() so the D-02 summaries + icon gate
              refresh after an approve/reject/remove. */}
          <TeamManagementPopup
            open={teamPopupPaikkaId !== null}
            paikkaId={teamPopupPaikkaId}
            onClose={() => setTeamPopupPaikkaId(null)}
            onChanged={() => { checkState() }}
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
