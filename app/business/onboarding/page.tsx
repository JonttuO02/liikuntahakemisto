'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WizardInner from '../WizardInner'
import AnalysoiSivusto, { LajiPicker } from './AnalysoiSivusto'
import StepPaikka from './StepPaikka'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { type BrandingResult } from '@/lib/branding/brandingResult'
import { type PaikkaBase } from '@/lib/onboardingUtils'

type PagePhase = 'paikka' | 'analyze' | 'laji-skip' | 'wizard'

function PreVaiheSpinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
    </div>
  )
}

// StepPaikkaPrePhase resolves paikka_id (URL param first, then business_paikka_links
// lookup) EXACTLY like PrePhase below, plus fetches paikkaInfo (nimi/osoite/kaupunki) from
// liikuntapaikat for StepPaikka's display. It is the FIRST pre-phase (D-01) — renders before
// AnalysoiSivusto. Must live inside a <Suspense> boundary (calls useSearchParams()).
function StepPaikkaPrePhase({
  onNext,
  onPaikkaIdResolved,
  onPaikkaInfoResolved,
}: {
  onNext: () => void
  onPaikkaIdResolved: (paikkaId: number) => void
  onPaikkaInfoResolved: (info: PaikkaBase) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaBase | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolvePaikkaIdAndInfo() {
      const urlPaikkaId = searchParams.get('paikka_id')
      const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
      let resolved: number | null = parsed !== null && !isNaN(parsed) ? parsed : null

      const supabase = createBusinessBrowserClient()

      if (!resolved) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: link } = await supabase
            .from('business_paikka_links')
            .select('paikka_id')
            .eq('business_account_id', user.id)
            .limit(1)
            .maybeSingle()
          if (link) {
            resolved = link.paikka_id
          }
        }
      }

      if (!cancelled) {
        setPaikkaId(resolved)
        if (resolved !== null) onPaikkaIdResolved(resolved)
      }

      if (resolved !== null) {
        const { data: paikka } = await supabase
          .from('liikuntapaikat')
          .select('nimi, laji, osoite, kaupunki, latitude, longitude')
          .eq('id', resolved)
          .single()
        if (!cancelled && paikka) {
          setPaikkaInfo(paikka as PaikkaBase)
          onPaikkaInfoResolved(paikka as PaikkaBase)
        }
      }
    }

    resolvePaikkaIdAndInfo()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <StepPaikka paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} />
}

// PrePhase resolves paikka_id (URL param first, then business_paikka_links lookup) — this
// component is the Suspense-boundary DESCENDANT that calls useSearchParams(), mirroring
// WizardInner's OnboardingMode pattern exactly. OnboardingWizardPage (the parent that
// instantiates the boundary) must never call useSearchParams() itself.
// `knownPaikkaId` lets the caller pass an already-resolved paikka_id (e.g. from
// StepPaikkaPrePhase, which runs immediately before this phase) to skip the redundant
// resolution fetch/spinner flash. Falls back to its own resolution logic when absent, so it
// still works as a defensive fallback / for direct deep-links into the analyze phase.
function PrePhase({
  paikkaId: knownPaikkaId,
  paikkaInfo,
  onConfirm,
  onSkip,
  onPaikkaIdResolved,
}: {
  paikkaId: number | null
  paikkaInfo: PaikkaBase | null
  onConfirm: (
    result: BrandingResult,
    selections: { logoUrl: string | null; gallery: string[]; laji: string | null }
  ) => void | Promise<void>
  onSkip: () => void
  onPaikkaIdResolved: (paikkaId: number) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(knownPaikkaId)

  useEffect(() => {
    if (knownPaikkaId !== null) return // already resolved by StepPaikkaPrePhase

    let cancelled = false

    async function resolvePaikkaId() {
      const urlPaikkaId = searchParams.get('paikka_id')
      const parsed = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null
      let resolved: number | null = parsed !== null && !isNaN(parsed) ? parsed : null

      if (!resolved) {
        const supabase = createBusinessBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: link } = await supabase
            .from('business_paikka_links')
            .select('paikka_id')
            .eq('business_account_id', user.id)
            .limit(1)
            .maybeSingle()
          if (link) {
            resolved = link.paikka_id
          }
        }
      }

      if (!cancelled) {
        setPaikkaId(resolved)
        if (resolved !== null) onPaikkaIdResolved(resolved)
      }
    }

    resolvePaikkaId()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (paikkaId === null) {
    return <PreVaiheSpinner />
  }

  return <AnalysoiSivusto paikkaId={paikkaId} paikkaInfo={paikkaInfo} onConfirm={onConfirm} onSkip={onSkip} />
}

export default function OnboardingWizardPage() {
  const [pagePhase, setPagePhase] = useState<PagePhase>('paikka')
  const [brandingData, setBrandingData] = useState<BrandingResult | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaBase | null>(null)

  async function handleConfirm(
    result: BrandingResult,
    selections: { logoUrl: string | null; gallery: string[]; laji: string | null }
  ) {
    setBrandingData(result)

    // AWAIT the media_urls save-step write BEFORE navigating into the wizard.
    // WizardInner's OnboardingMode re-fetches the onboarding_draft from Supabase ON MOUNT —
    // if setPagePhase('wizard') ran before this write landed, that on-mount fetch would read
    // the stale (pre-write) draft and StepMediat would silently render without the gallery
    // prefill (no compile error, intermittent). Awaiting here closes that race (T-48-15).
    if (paikkaId !== null) {
      try {
        const supabase = createBusinessBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token ?? ''
        await fetch('/api/business/onboarding/save-step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            paikka_id: paikkaId,
            // step:0 -> save-step sets current_step:1 -> WizardInner's auto-resume
            // (savedStep > 1 && step === 1) lands the user ON Step 1 (StepMediat),
            // where the prefilled gallery/logo render. step:1 would skip Step 1 entirely.
            step: 0,
            field: 'media_urls',
            value: { logo: selections.logoUrl, photos: selections.gallery },
          }),
        })
        // AI-06/D-04: laji is staged via save-step (never an immediate PATCH) and only ever
        // written when explicitly confirmed — never send null/empty (save-step rejects it).
        if (selections.laji) {
          await fetch('/api/business/onboarding/save-step', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({
              paikka_id: paikkaId,
              step: 0,
              field: 'laji',
              value: selections.laji,
            }),
          })
        }
      } catch {
        // Non-blocking: if the write fails, still allow navigation — StepMediat lets the
        // user re-add photos/logo manually in the wizard.
      }
    }

    setPagePhase('wizard')
  }

  // D-06: the skip path ("Ohita") has no AI suggestion to confirm — route through a small
  // intermediate manual-picker phase (reusing the same LajiPicker as Vaihda) before the
  // wizard, so laji doesn't stay permanently stuck at 'Muu' for skip-path users.
  function handleSkip() {
    setBrandingData(null)
    setPagePhase('laji-skip')
  }

  async function handleLajiSkipPick(value: string) {
    if (paikkaId !== null) {
      try {
        const supabase = createBusinessBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token ?? ''
        await fetch('/api/business/onboarding/save-step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ paikka_id: paikkaId, step: 0, field: 'laji', value }),
        })
      } catch {
        // Non-blocking: if the write fails, the venue keeps its create-paikka default —
        // consistent with onboarding's "nothing literally blocks submit" philosophy.
      }
    }
    setPagePhase('wizard')
  }

  function handleLajiSkipCancel() {
    setPagePhase('wizard')
  }

  // Wizard step 1's "back" button returns here from page.tsx (D-02/D-03 follow-up) — paikkaId
  // is already resolved in state, so AnalysoiSivusto re-renders without re-fetching it.
  function handleBackToAnalyze() {
    setPagePhase('analyze')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {pagePhase === 'paikka' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <StepPaikkaPrePhase
              onNext={() => setPagePhase('analyze')}
              onPaikkaIdResolved={setPaikkaId}
              onPaikkaInfoResolved={setPaikkaInfo}
            />
          </Suspense>
        )}
        {pagePhase === 'analyze' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <PrePhase
              paikkaId={paikkaId}
              paikkaInfo={paikkaInfo}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
              onPaikkaIdResolved={setPaikkaId}
            />
          </Suspense>
        )}
        {pagePhase === 'laji-skip' && (
          <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-4">
            <p className="text-sm text-[rgba(17,17,17,0.45)]">
              Valitse paikan lajikategoria ennen jatkamista
            </p>
            <LajiPicker value={null} onPick={handleLajiSkipPick} onCancel={handleLajiSkipCancel} />
          </div>
        )}
        {pagePhase === 'wizard' && (
          <Suspense
            fallback={
              <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
              </div>
            }
          >
            <WizardInner mode="onboarding" brandingData={brandingData} onBackToAnalyze={handleBackToAnalyze} />
          </Suspense>
        )}
      </div>
    </main>
  )
}
