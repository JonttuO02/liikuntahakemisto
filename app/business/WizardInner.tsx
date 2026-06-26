'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import type { OnboardingDraft } from '@/lib/onboardingUtils'
import { FI_TO_EN } from '@/lib/onboardingUtils'
import type { Liikuntapaikka } from '@/lib/types'
import { type BrandingResult } from '@/lib/branding/brandingResult'
import ProgressBar from './onboarding/ProgressBar'
import StepBrandingPick, { type BrandingSelections } from './onboarding/StepBrandingPick'
import StepMediat from './onboarding/StepMediat'
import StepHinnasto from './onboarding/StepHinnasto'
import StepAukioloajat from './onboarding/StepAukioloajat'
import StepYhteystiedot from './onboarding/StepYhteystiedot'
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
  | {
      mode: 'onboarding'
      brandingData?: BrandingResult | null
      confirmedLaji?: string | null
      onBackToAnalyze?: () => void
      canRunAnalysis?: boolean
      onRunAnalysis?: () => void
    }
  | { mode: 'edit'; paikka: Liikuntapaikka; paikkaId: number }

// ─── Onboarding mode ────────────────────────────────────────────────────────
function OnboardingMode({
  brandingData,
  confirmedLaji,
  onBackToAnalyze,
  canRunAnalysis,
  onRunAnalysis,
}: {
  brandingData?: BrandingResult | null
  confirmedLaji?: string | null
  onBackToAnalyze?: () => void
  canRunAnalysis?: boolean
  onRunAnalysis?: () => void
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

  // Branding pick step — shows as step 1 when brandingData is available, before StepMediat.
  const brandingPickEnabled = brandingData?.status === 'analyzed'
  // Initialized to false — loadDraft sets it true only for new sessions (savedStep <= 1).
  // Resumed sessions skip branding pick (user already did it) and set brandingPickDone instead.
  const [inBrandingPick, setInBrandingPick] = useState(false)
  const [brandingPickDone, setBrandingPickDone] = useState(false)
  // Non-null while a resume redirect (step=1 → savedStep) is in flight. Keeps the spinner
  // up until useSearchParams reflects the new URL — prevents the step-1 flash + race where
  // the user can press Next before the redirect settles.
  const [redirectingToStep, setRedirectingToStep] = useState<number | null>(null)
  // Laji confirmed in branding pick step — overrides the stale DB value for live preview.
  const [brandingConfirmedLaji, setBrandingConfirmedLaji] = useState<string | null>(null)

  // URL-based step routing (D-02)
  const rawStep = parseInt(searchParams.get('step') ?? '1', 10)
  const step = isNaN(rawStep) || rawStep < 1 || rawStep > 4 ? 1 : rawStep

  function goToStep(n: number) {
    const clamped = Math.min(Math.max(n, 1), 4)
    const params = new URLSearchParams({ step: String(clamped) })
    if (paikkaId !== null) params.set('paikka_id', String(paikkaId))
    router.push('/business/onboarding?' + params.toString())
  }

  // completedSteps: steps 1 through current_step-1. Clamp draft.current_step to the wizard's
  // own valid range (1-4) first — the AnalysoiSivusto quick-accept path can transiently
  // persist current_step:6 (see save-step/route.ts), which would otherwise mark a step
  // as "completed" beyond the 4-step wizard boundary (CR-01).
  const clampedCurrentStep = draft?.current_step
    ? Math.min(draft.current_step, 4)
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

      // Branding pick visibility: only show for new/early sessions (savedStep <= 1).
      // Resumed sessions treat branding pick as already done so back-navigation works.
      if (brandingPickEnabled) {
        if (savedStep <= 1) setInBrandingPick(true)
        else setBrandingPickDone(true)
      }

      // Resume redirect: if URL says step=1 but draft is further ahead, bounce to saved step.
      // Clamp to 1-4 (AnalysoiSivusto quick-accept can transiently persist current_step:6).
      const clampedSavedStep = Math.min(savedStep, 4)
      if (clampedSavedStep > 1 && step === 1) {
        const params = new URLSearchParams({ step: String(clampedSavedStep) })
        if (resolvedPaikkaId) params.set('paikka_id', String(resolvedPaikkaId))
        setRedirectingToStep(clampedSavedStep)
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

  // Clear the redirect-in-flight flag once useSearchParams reflects the new URL.
  useEffect(() => {
    if (redirectingToStep !== null && step === redirectingToStep) {
      setRedirectingToStep(null)
    }
  }, [step, redirectingToStep])

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

  // Derive branding pre-fill values — only when brandingData is fully analyzed
  const brandingPrices = brandingData?.status === 'analyzed'
    ? (brandingData.raw_analysis?.prices ?? null)
    : null
  const brandingHours = brandingData?.status === 'analyzed'
    ? (() => {
        const hrs = brandingData.raw_analysis?.opening_hours
        if (!hrs?.length) return null
        const result: Record<string, { open: string; close: string }> = {}
        for (const h of hrs) { result[FI_TO_EN[h.day] ?? h.day] = { open: h.open, close: h.close } }
        return result
      })()
    : null
  // Submit callback passed to StepYhteystiedot as onNext — transplanted from StepEsikatselu.
  // Runs after save-step succeeds inside StepYhteystiedot's handleNext.
  async function handleYhteystiedotSubmit() {
    const supabase = createBusinessBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || paikkaId === null) return
    const res = await fetch('/api/business/onboarding/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ paikka_id: paikkaId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.ok) {
        router.push('/business')
      }
    } else {
      // Throw so the error propagates to StepYhteystiedot's catch block (F-05/F-06),
      // which surfaces it via setError — giving the user visible feedback on submit failure.
      throw new Error(`Submit failed with status ${res.status}`)
    }
  }

  if (loading || redirectingToStep !== null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    )
  }

  // confirmedLaji prop (from laji-skip path in page.tsx) OR branding step pick wins over
  // the stale DB paikkaInfo.laji for live-preview rendering.
  const effectiveLaji = brandingConfirmedLaji ?? confirmedLaji
  const livePreviewPaikkaInfo = paikkaInfo && effectiveLaji
    ? { ...paikkaInfo, laji: effectiveLaji }
    : paikkaInfo

  // Called when user clicks "Jatka →" in StepBrandingPick. Saves media_urls + laji to
  // draft so StepMediat receives them pre-filled, then re-fetches draft and enters step 1.
  async function handleBrandingPickNext(selections: BrandingSelections) {
    if (paikkaId === null) return
    if (selections.laji) setBrandingConfirmedLaji(selections.laji)
    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'media_urls', value: { logo: selections.logoUrl, photos: selections.gallery } }),
      })
      if (selections.laji) {
        await fetch('/api/business/onboarding/save-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'laji', value: selections.laji }),
        })
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: freshDraft } = await supabase
          .from('onboarding_draft').select('*')
          .eq('business_account_id', user.id).eq('paikka_id', paikkaId).maybeSingle()
        if (freshDraft) setDraft(freshDraft as OnboardingDraft)
      }
    } catch {
      // Non-blocking — user can re-pick in StepMediat
    }
    setBrandingPickDone(true)
    setInBrandingPick(false)
  }

  // Back from step 1 (StepMediat) — return to branding pick if we came through it.
  function handleBackFromMediat() {
    if (brandingPickDone) {
      setInBrandingPick(true)
      setBrandingPickDone(false)
    } else {
      onBackToAnalyze?.()
    }
  }

  // ProgressBar step numbers are shifted +1 when branding pick is enabled so AI-löydöt
  // occupies step 1 and existing wizard steps become 2-5.
  const progressStep = inBrandingPick ? 1 : (brandingPickEnabled ? step + 1 : step)
  const progressCompleted = brandingPickEnabled
    ? [...(brandingPickDone ? [1] : []), ...completedSteps.map(s => s + 1)]
    : completedSteps
  function handleProgressStepClick(s: number) {
    if (brandingPickEnabled) {
      if (s === 1 && brandingPickDone) { setInBrandingPick(true); setBrandingPickDone(false); return }
      if (s === 1) return
      goToStep(s - 1)
    } else {
      goToStep(s)
    }
  }

  return (
    <LivePreviewProvider
      paikkaInfo={livePreviewPaikkaInfo}
      paikkaId={paikkaId}
      brandingData={brandingData}
      initialDraft={draft}
    >
      <div className="flex gap-6 items-start justify-center">
        <div className="w-full max-w-xl">
          <ProgressBar
            currentStep={progressStep}
            completedSteps={progressCompleted}
            onStepClick={handleProgressStepClick}
            hasBrandingStep={brandingPickEnabled}
          />

          <div className="lg:hidden">
            <LivePreviewToggle activeView={activeView} onChange={setActiveView} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={inBrandingPick ? 'branding-pick' : `${step}-${activeView}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'preview' ? (
                <div className="lg:hidden">
                  <LivePreviewPane />
                </div>
              ) : inBrandingPick && brandingData && paikkaId !== null ? (
                <StepBrandingPick
                  brandingData={brandingData}
                  paikkaId={paikkaId}
                  onNext={handleBrandingPickNext}
                />
              ) : (
                <>
                  {step === 1 && !inBrandingPick && canRunAnalysis && onRunAnalysis && (
                    <button
                      type="button"
                      onClick={onRunAnalysis}
                      className="mb-4 w-full glass rounded-2xl px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(0,0,0,0.02)] transition-colors"
                    >
                      <span className="text-sm text-[rgba(17,17,17,0.45)]">AI voi täyttää tiedot automaattisesti</span>
                      <span className="text-sm font-bold text-[#111111]">Analysoi →</span>
                    </button>
                  )}
                  {step === 1 && paikkaId !== null && (
                    <StepMediat
                      paikkaId={paikkaId}
                      initialDraft={draft}
                      onNext={() => saveAndAdvance(1)}
                      onPrev={handleBackFromMediat}
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
                      onNext={handleYhteystiedotSubmit}
                      onPrev={() => goToStep(3)}
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

  // Mobile Muokkaa/Esikatselu toggle (D-07) — same pattern as OnboardingMode (D-08).
  const [activeView, setActiveView] = useState<'edit' | 'preview'>('edit')

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

  // Reset the mobile Muokkaa/Esikatselu toggle to 'edit' on every tab change (D-08).
  useEffect(() => {
    setActiveView('edit')
  }, [currentStep])

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
    <LivePreviewProvider
      paikkaInfo={{
        nimi: paikka.nimi,
        laji: paikka.laji,
        osoite: paikka.osoite,
        kaupunki: paikka.kaupunki,
        latitude: paikka.latitude,
        longitude: paikka.longitude,
        aukioloajat: paikka.aukioloajat as Record<string, { open: string; close: string }> | null,
      }}
      paikkaId={paikkaId}
      brandingData={null}
      initialDraft={{
        paikka_id: paikkaId,
        hinnasto: localHinnasto ?? undefined,
        aukioloajat: localAukioloajat ?? undefined,
        yhteystiedot: localYhteystiedot,
        media_urls: { logo: localLogoUrl, photos: localPhotoUrls },
      }}
    >
      <div className="flex gap-6 items-start justify-center">
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

          {/* Tab bar */}
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
          </div>

          <div className="lg:hidden">
            <LivePreviewToggle activeView={activeView} onChange={setActiveView} />
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStep}-${activeView}`}
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

// ─── Exported component ───────────────────────────────────────────────────────
export default function WizardInner(props: WizardInnerProps) {
  if (props.mode === 'onboarding') {
    return (
      <OnboardingMode
        brandingData={props.brandingData}
        confirmedLaji={props.confirmedLaji}
        onBackToAnalyze={props.onBackToAnalyze}
        canRunAnalysis={props.canRunAnalysis}
        onRunAnalysis={props.onRunAnalysis}
      />
    )
  }
  return <EditMode paikka={props.paikka} paikkaId={props.paikkaId} />
}
