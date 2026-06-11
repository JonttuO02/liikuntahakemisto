'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import type { Liikuntapaikka } from '@/lib/types'
import PreviewModal from '@/app/components/PreviewModal'
import StepMediat from '../onboarding/StepMediat'
import StepHinnasto from '../onboarding/StepHinnasto'
import StepAukioloajat from '../onboarding/StepAukioloajat'
import StepYhteystiedot from '../onboarding/StepYhteystiedot'
import { createBrowserSupabase } from '@/lib/supabaseSSR'

interface EditWizardInnerProps {
  paikka: Liikuntapaikka
  paikkaId: number
}

export default function EditWizardInner({ paikka, paikkaId }: EditWizardInnerProps) {
  const t = useTranslations('Business')
  const searchParams = useSearchParams()
  const router = useRouter()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/business/rekisteroidy'); return }
      const { data: account } = await supabase
        .from('business_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!account) { router.replace('/business/rekisteroidy'); return }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  // Local state that persists step data across tab-bar navigation.
  // Initialized from paikka (server snapshot); updated via onSaveComplete after each save.
  const [localHinnasto, setLocalHinnasto] = useState<Array<{ kategoria: string; hinta: string; lisatieto: string }> | null>(null)
  const [localAukioloajat, setLocalAukioloajat] = useState<Record<string, { open: string; close: string }> | null>(
    (paikka.aukioloajat as Record<string, { open: string; close: string }> | null) ?? null
  )
  const [localYhteystiedot, setLocalYhteystiedot] = useState({
    puhelin: paikka.puhelin ?? '',
    email: '',
    website: paikka.varauslinkki ?? '',
    kuvaus: paikka.kuvaus ?? '',
  })
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(paikka.logo_url ?? null)
  const [localPhotoUrls, setLocalPhotoUrls] = useState<string[]>(paikka.photo_urls ?? [])

  const currentStep = searchParams.get('step') ?? '1'

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    )
  }

  function tabLabel(n: number): string {
    switch (n) {
      case 1: return t('stepPlaceName')
      case 2: return t('editStep2Label')
      case 3: return t('editStep3Label')
      case 4: return t('editStep4Label')
      case 5: return t('editStep5Label')
      default: return String(n)
    }
  }

  return (
    <>
      {/* Preview modal */}
      <AnimatePresence>
        {previewOpen && (
          <PreviewModal
            paikka={{ ...paikka, logo_url: localLogoUrl, photo_urls: localPhotoUrls }}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        {/* Back link */}
        <a
          href="/business"
          className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms] inline-block"
        >
          {t('editBackToList')}
        </a>

        {/* Title */}
        <h1 className="text-xl font-bold text-[#111111]">{t('editTitle')}</h1>

        {/* Tab bar with preview button */}
        <div className="flex gap-2 flex-wrap items-center">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => router.push('/business/' + paikkaId + '?step=' + n)}
              className={`text-sm font-bold rounded-full px-4 py-2 [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${
                currentStep === String(n)
                  ? 'bg-[#111111] text-white'
                  : 'text-[rgba(17,17,17,0.45)] hover:text-[#111111]'
              }`}
            >
              {tabLabel(n)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] underline-offset-2 hover:underline transition-colors ml-auto"
          >
            {t('previewCta')}
          </button>
        </div>

        {/* Step content */}
        <div>
          {currentStep === '1' && (
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-[#111111]">{paikka.nimi}</span>
                <span className="text-sm text-[rgba(17,17,17,0.45)]">{paikka.osoite}</span>
                <span className="text-sm text-[rgba(17,17,17,0.45)]">{paikka.laji}</span>
              </div>
              <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('editLockedStep1')}</p>
            </div>
          )}
          {currentStep === '2' && (
            <StepMediat
              paikkaId={paikkaId}
              initialPaikka={{ ...paikka, logo_url: localLogoUrl, photo_urls: localPhotoUrls }}
              editMode={true}
              onNext={() => router.push('/business/' + paikkaId + '?step=3')}
              onPrev={() => router.push('/business/' + paikkaId + '?step=1')}
              onSaveSuccess={(logoUrl, photoUrls) => { setLocalLogoUrl(logoUrl); setLocalPhotoUrls(photoUrls) }}
            />
          )}
          {currentStep === '3' && (
            <StepHinnasto
              paikkaId={paikkaId}
              editMode={true}
              initialPaikkaHinnasto={localHinnasto}
              onNext={() => router.push('/business/' + paikkaId + '?step=4')}
              onPrev={() => router.push('/business/' + paikkaId + '?step=2')}
              onSaveComplete={setLocalHinnasto}
            />
          )}
          {currentStep === '4' && (
            <StepAukioloajat
              paikkaId={paikkaId}
              editMode={true}
              existingAukioloajat={localAukioloajat}
              initialDraftAukioloajat={localAukioloajat}
              onNext={() => router.push('/business/' + paikkaId + '?step=5')}
              onPrev={() => router.push('/business/' + paikkaId + '?step=3')}
              onSaveComplete={setLocalAukioloajat}
            />
          )}
          {currentStep === '5' && (
            <StepYhteystiedot
              paikkaId={paikkaId}
              editMode={true}
              initialYhteystiedot={localYhteystiedot}
              onNext={() => router.push('/business/' + paikkaId + '?step=1')}
              onPrev={() => router.push('/business/' + paikkaId + '?step=4')}
              onSaveComplete={setLocalYhteystiedot}
            />
          )}
        </div>
      </div>
    </>
  )
}
