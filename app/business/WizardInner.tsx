'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import type { OnboardingDraft } from '@/lib/onboardingUtils'
import type { Liikuntapaikka } from '@/lib/types'
import { type BrandingResult } from '@/lib/branding/brandingResult'
import ProgressBar from './onboarding/ProgressBar'
import StepMediat from './onboarding/StepMediat'
import StepHinnasto from './onboarding/StepHinnasto'
import StepAukioloajat from './onboarding/StepAukioloajat'
import StepYhteystiedot from './onboarding/StepYhteystiedot'
import StepEsikatselu from './onboarding/StepEsikatselu'
import { LivePreviewProvider } from '@/lib/livePreview/LivePreviewContext'
import LivePreviewPane from './onboarding/LivePreviewPane'
import LivePreviewToggle from './onboarding/LivePreviewToggle'

type PaikkaInfo = {
  nimi: string
  osoite: string | null
  kaupunki: string | null
  laji: string
  latitude: number | null
  longitude: number | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
}

type WizardInnerProps =
  | { mode: 'onboarding'; brandingData?: BrandingResult | null; onBackToAnalyze?: () => void }
  | { mode: 'edit'; paikka: Liikuntapaikka; paikkaId: number }

// ─── Onboarding mode ────────────────────────────────────────────────────────
function OnboardingMode({
  brandingData,
  onBackToAnalyze,
}: {
  brandingData?: BrandingResult | null
  onBackToAnalyze?: () => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<OnboardingDraft | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaInfo | null>(null)
  // Tracks the furthest step reached this session — guards against URL-skipping without
  // blocking natural forward navigation (draft.current_step alone would block step 2 when
  // no draft exists yet, since StepPaikka saves nothing).
  const [maxReachedStep, setMaxReachedStep] = useState(0)

  // Mobile Muokkaa/Esikatselu toggle (D-07). Local UI state, separate from the
  // shared live-preview data context — resets to 'edit' on every step change (D-08).
  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit')

  // URL-based step routing (D-02)
  const rawStep = parseInt(searchParams.get('step') ?? '1', 10)
  const step = isNaN(rawStep) || rawStep < 1 || rawStep > 5 ? 1 : rawStep

  function goToStep(n: number) {
    const clamped = Math.min(Math.max(n, 1), 5)
    const params = new URLSearchParams({ step: String(clamped) })
    if (paikkaId !== null) params.set('paikka_id', String(paikkaId))
    router.push('/business/onboarding?' + params.toString())
  }

  // completedSteps: steps 1 through current_step-1. Clamp draft.current_step to the wizard's
  // own valid range (1-5) first — the AnalysoiSivusto quick-accept path can transiently
  // persist current_step:6 (see save-step/route.ts), which would otherwise mark the
  // not-yet-visited StepEsikatselu (step 5) as "completed" (CR-01).
  const clampedCurrentStep = draft?.current_step
    ? Math.min(draft.current_step, 5)
    : undefined
  const completedSteps: number[] = clampedCurrentStep && clampedCurrentStep > 1
    ? Array.from({ length: clampedCurrentStep - 1 }, (_, i) => i + 1)
    : []

  useEffect(() => {
    async function loadDraft() {
      const supabase = createBusinessBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return // layout.tsx RSC guard prevents null; TypeScript narrowing only

      // Try to get paikka_id from URL param first
      const urlPaikkaId = searchParams.get('paikka_id')
      const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
      let resolvedPaikkaId: number | null = parsed !== null && !isNaN(parsed) ? parsed : null

      // If not in URL, look up from business_paikka_links
      if (!resolvedPaikkaId) {
        const { data: link } = await supabase
          .from('business_paikka_links')
          .select('paikka_id')
          .eq('business_account_id', user.id)
          .limit(1)
          .maybeSingle()
        if (link) {
          resolvedPaikkaId = link.paikka_id
        }
      }

      // Load existing draft — filter by paikka_id when known to avoid cross-venue contamination
      // when a user has multiple draft rows (one per venue). Fall back to unfiltered query
      // only when paikka_id is still unknown (no URL param, no link row) so we can recover
      // the paikka_id from the draft itself.
      let existingDraft: OnboardingDraft | null = null
      if (resolvedPaikkaId) {
        const { data } = await supabase
          .from('onboarding_draft')
          .select('*')
          .eq('business_account_id', user.id)
          .eq('paikka_id', resolvedPaikkaId)
          .maybeSingle()
        existingDraft = (data as OnboardingDraft | null) ?? null
      } else {
        const { data } = await supabase
          .from('onboarding_draft')
          .select('*')
          .eq('business_account_id', user.id)
          .maybeSingle()
        existingDraft = (data as OnboardingDraft | null) ?? null
      }

      if (existingDraft) {
        setDraft(existingDraft)
      }

      // Apply draft fallback: use draft.paikka_id when URL and links both yield nothing
      resolvedPaikkaId = resolvedPaikkaId ?? existingDraft?.paikka_id ?? null
      setPaikkaId(resolvedPaikkaId)

      // Initialize max-reached from draft, then resume to last saved step.
      // Build the resume URL here (not via goToStep) because paikkaId state isn't set yet.
      const savedStep = existingDraft?.current_step ?? 0
      setMaxReachedStep(savedStep)
      // Post-reorder (50-02): step 1 now means StepMediat (StepPaikka moved to page.tsx as
      // a pre-phase, no longer rendered here) — this resume-bounce semantics are unchanged.
      // Clamp to the wizard's valid 1-5 range before redirecting: the AnalysoiSivusto
      // quick-accept path can transiently persist current_step:6, which would otherwise
      // push an out-of-range ?step=6 URL for one render cycle (CR-01).
      const clampedSavedStep = Math.min(savedStep, 5)
      if (clampedSavedStep > 1 && step === 1) {
        const params = new URLSearchParams({ step: String(clampedSavedStep) })
        if (resolvedPaikkaId) params.set('paikka_id', String(resolvedPaikkaId))
        router.push('/business/onboarding?' + params.toString())
      }

      // Load paikka info if we have a paikka_id
      if (resolvedPaikkaId) {
        const { data: paikka } = await supabase
          .from('liikuntapaikat')
          .select('nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat')
          .eq('id', resolvedPaikkaId)
          .single()
        if (paikka) {
          setPaikkaInfo(paikka as PaikkaInfo)
        }
      }

      setLoading(false)
    }

    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch draft from Supabase so back-navigation passes fresh initialProps to each step.
  // This also ensures draftAsPaikka on step 6 reflects the latest saved data.
  async function saveAndAdvance(stepNum: number) {
    setMaxReachedStep(prev => Math.max(prev, stepNum))
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let draftQuery = supabase
          .from('onboarding_draft')
          .select('*')
          .eq('business_account_id', user.id)
        if (paikkaId !== null) draftQuery = draftQuery.eq('paikka_id', paikkaId)
        const { data: freshDraft } = await draftQuery.maybeSingle()
        if (freshDraft) setDraft(freshDraft as OnboardingDraft)
      }
    } catch {
      // Non-critical: if re-fetch fails, proceed anyway — user navigates forward
    }
    goToStep(stepNum + 1)
  }

  // Forward-skip guard: prevent URL manipulation from jumping past unfinished steps.
  // Uses maxReachedStep so natural Next-button navigation is never blocked.
  useEffect(() => {
    if (loading) return
    if (step > maxReachedStep + 1) {
      router.push('/business/onboarding?step=' + (maxReachedStep + 1))
    }
  }, [step, maxReachedStep, loading, router])

  // Reset the mobile Muokkaa/Esikatselu toggle to 'edit' on every step change (D-08).
  useEffect(() => {
    setActiveView('edit')
  }, [step])

  // Re-fetch draft when user navigates to step 6 so the preview is always up to date.
  useEffect(() => {
    if (step !== 5) return
    async function refreshDraftForPreview() {
      try {
        const supabase = createBusinessBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        let draftQuery = supabase
          .from('onboarding_draft')
          .select('*')
          .eq('business_account_id', user.id)
        if (paikkaId !== null) draftQuery = draftQuery.eq('paikka_id', paikkaId)
        const { data: freshDraft } = await draftQuery.maybeSingle()
        if (freshDraft) setDraft(freshDraft as OnboardingDraft)
      } catch { /* ignore */ }
    }
    refreshDraftForPreview()
  }, [step, paikkaId])

  // Derive branding pre-fill values — only when brandingData is fully analyzed
  const brandingPrices = brandingData?.status === 'analyzed'
    ? (brandingData.raw_analysis?.prices ?? null)
    : null
  const brandingHours = brandingData?.status === 'analyzed'
    ? (() => {
        const hrs = brandingData.raw_analysis?.opening_hours
        if (!hrs?.length) return null
        const result: Record<string, { open: string; close: string }> = {}
        for (const h of hrs) { result[h.day] = { open: h.open, close: h.close } }
        return result
      })()
    : null
  const brandingWebsite = brandingData?.status === 'analyzed'
    ? (brandingData.raw_analysis?.website_url || null)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    )
  }

  return (
    <LivePreviewProvider
      paikkaInfo={paikkaInfo}
      paikkaId={paikkaId}
      brandingData={brandingData}
      initialDraft={draft}
    >
      <div className="flex gap-6 items-start justify-center">
        <div className="w-full max-w-xl">
          <ProgressBar
            currentStep={step}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />

          <div className="lg:hidden">
            <LivePreviewToggle activeView={activeView} onChange={setActiveView} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${step}-${activeView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'preview' ? (
                <div className="lg:hidden">
                  <LivePreviewPane />
                </div>
              ) : (
                <>
                  {step === 1 && paikkaId !== null && (
                    <StepMediat
                      paikkaId={paikkaId}
                      initialDraft={draft}
                      onNext={() => saveAndAdvance(1)}
                      // Step 1 is the wizard's first step (StepPaikka moved to page.tsx as a
                      // pre-phase) — there is no previous wizard step, so "back" returns to the
                      // page-level analyze pre-phase instead of navigating within the wizard.
                      onPrev={() => onBackToAnalyze?.()}
                    />
                  )}
                  {step === 2 && paikkaId !== null && (
                    <StepHinnasto
                      paikkaId={paikkaId}
                      initialHinnasto={draft?.hinnasto}
                      initialBrandingHinnasto={brandingPrices}
                      onNext={() => saveAndAdvance(2)}
                      onPrev={() => goToStep(1)}
                    />
                  )}
                  {step === 3 && paikkaId !== null && (
                    <StepAukioloajat
                      paikkaId={paikkaId}
                      existingAukioloajat={paikkaInfo?.aukioloajat}
                      initialDraftAukioloajat={draft?.aukioloajat}
                      initialBrandingAukioloajat={brandingHours}
                      onNext={() => saveAndAdvance(3)}
                      onPrev={() => goToStep(2)}
                    />
                  )}
                  {step === 4 && paikkaId !== null && (
                    <StepYhteystiedot
                      paikkaId={paikkaId}
                      initialYhteystiedot={draft?.yhteystiedot}
                      initialBrandingWebsite={brandingWebsite}
                      onNext={() => saveAndAdvance(4)}
                      onPrev={() => goToStep(3)}
                    />
                  )}
                  {step === 5 && (
                    <StepEsikatselu
                      draft={draft}
                      paikkaInfo={paikkaInfo}
                      brandingData={brandingData}
                      onPrev={() => goToStep(4)}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:flex flex-col gap-4 w-[360px] flex-shrink-0 sticky top-6">
          <LivePreviewPane />
        </div>
      </div>
    </LivePreviewProvider>
  )
}

// ─── Edit mode ───────────────────────────────────────────────────────────────
function EditMode({ paikka, paikkaId }: { paikka: Liikuntapaikka; paikkaId: number }) {
  const t = useTranslations('Business')
  const searchParams = useSearchParams()
  const router = useRouter()
  const [previewOpen, setPreviewOpen] = useState(false)

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

// ─── Exported component ───────────────────────────────────────────────────────
export default function WizardInner(props: WizardInnerProps) {
  if (props.mode === 'onboarding') {
    return <OnboardingMode brandingData={props.brandingData} onBackToAnalyze={props.onBackToAnalyze} />
  }
  return <EditMode paikka={props.paikka} paikkaId={props.paikkaId} />
}
