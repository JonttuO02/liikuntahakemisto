'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WizardInner from '../WizardInner'
import AnalysoiSivusto from './AnalysoiSivusto'
import StepPaikka from './StepPaikka'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { type BrandingResult } from '@/lib/branding/brandingResult'

type PagePhase = 'paikka' | 'analyze' | 'wizard'

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
}: {
  onNext: () => void
  onPaikkaIdResolved: (paikkaId: number) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<{
    nimi: string
    osoite: string | null
    kaupunki: string | null
  } | null>(null)

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
          .select('nimi, osoite, kaupunki')
          .eq('id', resolved)
          .single()
        if (!cancelled && paikka) {
          setPaikkaInfo(paikka as { nimi: string; osoite: string | null; kaupunki: string | null })
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
function PrePhase({
  onConfirm,
  onSkip,
  onPaikkaIdResolved,
}: {
  onConfirm: (
    result: BrandingResult,
    selections: { logoUrl: string | null; gallery: string[] }
  ) => void | Promise<void>
  onSkip: () => void
  onPaikkaIdResolved: (paikkaId: number) => void
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)

  useEffect(() => {
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

  return <AnalysoiSivusto paikkaId={paikkaId} onConfirm={onConfirm} onSkip={onSkip} />
}

export default function OnboardingWizardPage() {
  const [pagePhase, setPagePhase] = useState<PagePhase>('paikka')
  const [brandingData, setBrandingData] = useState<BrandingResult | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)

  async function handleConfirm(
    result: BrandingResult,
    selections: { logoUrl: string | null; gallery: string[] }
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
      } catch {
        // Non-blocking: if the write fails, still allow navigation — StepMediat lets the
        // user re-add photos/logo manually in the wizard.
      }
    }

    setPagePhase('wizard')
  }

  function handleSkip() {
    setBrandingData(null)
    setPagePhase('wizard')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {pagePhase === 'paikka' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <StepPaikkaPrePhase
              onNext={() => setPagePhase('analyze')}
              onPaikkaIdResolved={setPaikkaId}
            />
          </Suspense>
        )}
        {pagePhase === 'analyze' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <PrePhase
              onConfirm={handleConfirm}
              onSkip={handleSkip}
              onPaikkaIdResolved={setPaikkaId}
            />
          </Suspense>
        )}
        {pagePhase === 'wizard' && (
          <Suspense
            fallback={
              <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
              </div>
            }
          >
            <WizardInner mode="onboarding" brandingData={brandingData} />
          </Suspense>
        )}
      </div>
    </main>
  )
}
