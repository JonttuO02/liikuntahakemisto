'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'
import PreviewModal from '@/app/components/PreviewModal'
import type { Liikuntapaikka } from '@/lib/types'

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
  liikuntapaikat: VenueLiikuntapaikka | null
}

export default function BusinessPage() {
  const t = useTranslations('Business')
  const router = useRouter()
  const [venueLinks, setVenueLinks] = useState<VenueLink[]>([])
  const [loading, setLoading] = useState(true)
  const [isNotBusinessAccount, setIsNotBusinessAccount] = useState(false)
  const [showAddVenue, setShowAddVenue] = useState(false)
  const [previewPaikka, setPreviewPaikka] = useState<Liikuntapaikka | null>(null)

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

      // If an incomplete draft exists, resume the onboarding wizard.
      // This handles both first-time users and multi-venue users mid-onboarding.
      const { data: draft } = await supabase
        .from('onboarding_draft')
        .select('id')
        .eq('business_account_id', user.id)
        .maybeSingle()

      if (draft) {
        router.push('/business/onboarding')
        return
      }

      // Fetch all linked venues with their approval status and rejection reason
      const { data: links } = await supabase
        .from('business_paikka_links')
        .select('paikka_id, claim_status, rejection_reason, liikuntapaikat(id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls)')
        .eq('business_account_id', user.id)
        .order('created_at', { ascending: true })

      setVenueLinks((links as unknown as VenueLink[]) ?? [])
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
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        {/* Preview modal */}
        <AnimatePresence>
          {previewPaikka && (
            <PreviewModal
              paikka={previewPaikka}
              onClose={() => setPreviewPaikka(null)}
            />
          )}
        </AnimatePresence>

        <div className={`glass rounded-2xl p-6 w-full ${showAddVenue ? 'max-w-md' : 'max-w-sm'} flex flex-col gap-5`}>
          <h1 className="text-xl font-bold text-[#111111]">{t('venuesTitle')}</h1>

          {/* Venue list */}
          <div className="flex flex-col gap-3">
            {venueLinks.map(link => (
              <div key={link.paikka_id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#111111] truncate">
                    {link.liikuntapaikat?.nimi ?? `Paikka ${link.paikka_id}`}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
                    link.claim_status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : link.claim_status === 'rejected'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {link.claim_status === 'approved'
                      ? t('statusApproved')
                      : link.claim_status === 'rejected'
                      ? t('statusRejected')
                      : t('statusPending')}
                  </span>
                </div>

                {/* Action buttons — shown for all statuses */}
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewPaikka(link.liikuntapaikat as unknown as Liikuntapaikka)}
                    className="text-xs text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline [transition:color_150ms]"
                  >
                    {t('esikatseluCta')}
                  </button>
                  <a
                    href={'/business/' + link.paikka_id}
                    className="text-xs font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 py-1 [transition:border-color_150ms_var(--ease-out)]"
                  >
                    {t('muokkaaCta')}
                  </a>
                </div>

                {link.claim_status === 'rejected' && (
                  <div className="flex flex-col gap-2 mt-1">
                    {link.rejection_reason && (
                      <p className="text-xs text-[rgba(17,17,17,0.45)]">{t('rejectionReasonLabel')}: {link.rejection_reason}</p>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const supabase = createBusinessBrowserClient()
                        const { data: { session } } = await supabase.auth.getSession()
                        const token = session?.access_token ?? ''
                        const res = await fetch('/api/business/reapply', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: 'Bearer ' + token,
                          },
                          body: JSON.stringify({ paikka_id: link.paikka_id }),
                        })
                        if (res.ok) {
                          setVenueLinks(prev => prev.map(l => l.paikka_id === link.paikka_id ? { ...l, claim_status: 'pending', rejection_reason: null } : l))
                        } else {
                          console.error('[reapply] failed', await res.json())
                        }
                      }}
                      className="text-xs font-bold text-[#111111] underline hover:no-underline text-left"
                    >
                      {t('reapplyCta')} →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(0,0,0,0.07)]" />

          {showAddVenue ? (
            <div className="flex flex-col gap-4">
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
              className="text-sm font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full h-10 px-4 [transition:border-color_150ms_var(--ease-out)]"
            >
              + {t('addVenueCta')}
            </button>
          )}

          <a
            href="/"
            className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms] text-center"
          >
            {t('backToHome')}
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="glass rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-xl font-bold text-[#111111]">{t('claimTitle')}</h1>
        <ClaimSearchForm />
      </div>
    </main>
  )
}
