'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WizardInner from '../WizardInner'
import AnalysoiSivusto, { LajiPicker } from './AnalysoiSivusto'
import StepNimiJaURL from './StepNimiJaURL'
import StepSijainti from './StepSijainti'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { type BrandingResult } from '@/lib/branding/brandingResult'
import { type PaikkaBase } from '@/lib/onboardingUtils'

type PagePhase = 'nimi-url' | 'sijainti' | 'analyze' | 'laji-skip' | 'wizard'

function PreVaiheSpinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
    </div>
  )
}

// StepNimiJaURLPrePhase resolves paikka_id (URL param first, then business_paikka_links
// lookup) EXACTLY like the old StepPaikkaPrePhase, plus fetches paikkaInfo (nimi/osoite/kaupunki)
// from liikuntapaikat for StepNimiJaURL's display. It is the FIRST pre-phase — renders before
// AnalysoiSivusto. Fast-forward (Pitfall 10): if paikka.latitude !== null the location step
// is already done — call onNext(null) immediately to skip the nimi-url interaction.
// Must live inside a <Suspense> boundary (calls useSearchParams()).
function StepNimiJaURLPrePhase({
  onNext,
  onPaikkaIdResolved,
  onPaikkaInfoResolved,
  skipFastForward = false,
}: {
  onNext: (websiteUrl: string | null, alreadyHasLocation?: boolean) => void
  onPaikkaIdResolved: (paikkaId: number) => void
  onPaikkaInfoResolved: (info: PaikkaBase) => void
  skipFastForward?: boolean
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
          // Fast-forward: if location is already set, skip sijainti for resuming users.
          // Re-hydrate websiteUrl from draft so analyze/laji-skip routing is correct (F-02/F-03).
          // skipFastForward suppresses this when the user navigated back from sijainti (F-04).
          if (paikka.latitude !== null && !skipFastForward) {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            let savedWebsite: string | null = null
            if (currentUser) {
              const { data: draftRow } = await supabase
                .from('onboarding_draft')
                .select('yhteystiedot')
                .eq('business_account_id', currentUser.id)
                .eq('paikka_id', resolved)
                .maybeSingle()
              savedWebsite = (draftRow?.yhteystiedot as { website?: string } | null)?.website ?? null
            }
            onNext(savedWebsite, true)
            return
          }
        }
      }
    }

    resolvePaikkaIdAndInfo()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <StepNimiJaURL paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} />
}

// PrePhase resolves paikka_id (URL param first, then business_paikka_links lookup) — this
// component is the Suspense-boundary DESCENDANT that calls useSearchParams(), mirroring
// WizardInner's OnboardingMode pattern exactly. OnboardingWizardPage (the parent that
// instantiates the boundary) must never call useSearchParams() itself.
// `knownPaikkaId` lets the caller pass an already-resolved paikka_id (e.g. from
// StepNimiJaURLPrePhase, which runs immediately before this phase) to skip the redundant
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
    if (knownPaikkaId !== null) return // already resolved by StepNimiJaURLPrePhase

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
  const [pagePhase, setPagePhase] = useState<PagePhase>('nimi-url')
  const [brandingData, setBrandingData] = useState<BrandingResult | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaBase | null>(null)
  // Display-only: the laji confirmed/picked in AnalysoiSivusto (Vahvista/Vaihda) or the D-06
  // skip-path picker, threaded into WizardInner so its live preview / Step 1 card show the
  // just-picked value instead of the stale pre-onboarding liikuntapaikat.laji — the actual DB
  // write still only happens at final submit (D-04), this never feeds any extra persistence.
  const [confirmedLaji, setConfirmedLaji] = useState<string | null>(null)
  // Website URL entered on step 1; persisted to draft + triggers background AI analysis.
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null)
  // Guards against double-triggering the AI analysis on re-render.
  const [aiTriggered, setAiTriggered] = useState(false)
  // Suppresses the fast-forward in StepNimiJaURLPrePhase when the user explicitly navigated
  // back from sijainti — prevents a re-mount loop when lat is already set (F-04).
  const [skipFastForward, setSkipFastForward] = useState(false)

  async function handleConfirm(
    result: BrandingResult,
    selections: { logoUrl: string | null; gallery: string[]; laji: string | null }
  ) {
    setBrandingData(result)
    setConfirmedLaji(selections.laji)

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
    setConfirmedLaji(value)
    setPagePhase('wizard')
  }

  function handleLajiSkipCancel() {
    setPagePhase('wizard')
  }

  // handleNimiUrlNext: called when user clicks Next on the nimi-url step (or automatically
  // by the fast-forward when paikka.latitude !== null). Persists the URL and fires the
  // background AI analysis (Pitfall 2: website must survive to submit via onboarding_draft).
  // alreadyHasLocation=true when called from the fast-forward path (lat already saved) —
  // skip sijainti entirely and route directly to analyze or laji-skip (F-02/F-03).
  async function handleNimiUrlNext(url: string | null, alreadyHasLocation = false) {
    setWebsiteUrl(url)
    setSkipFastForward(false) // user navigated forward — reset back-navigation guard (F-04)
    if (alreadyHasLocation) {
      setPagePhase(url ? 'wizard' : 'laji-skip')
    } else {
      setPagePhase('sijainti')
    }
    if (url && paikkaId !== null) {
      const supabase = createBusinessBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      if (!aiTriggered) {
        // Fire-and-forget: background AI analysis (CORRECT route: analyze-website, not ai-analyze).
        // Guarded by aiTriggered so a Back+Next cycle does not re-fire a duplicate request (F-07).
        fetch('/api/business/analyze-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ url, paikka_id: paikkaId }),
        })
        setAiTriggered(true)
      }
      // Persist website URL to draft so submit route can write it to varauslinkki (Pitfall 2).
      // Not guarded — always re-persist on retry so the URL is saved even when AI is skipped.
      fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 0,
          field: 'yhteystiedot',
          value: { website: url },
        }),
      })
    }
  }

  // Wizard step 1's "back" button returns here from page.tsx (Pitfall 8) — routes to the
  // correct pre-phase based on whether a website was provided. With a URL: back to sijainti
  // (analyze is no longer user-visible). Without: back to laji-skip picker.
  function handleBackToPrePhase() {
    setPagePhase(websiteUrl ? 'sijainti' : 'laji-skip')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {pagePhase === 'nimi-url' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <StepNimiJaURLPrePhase
              onNext={handleNimiUrlNext}
              onPaikkaIdResolved={setPaikkaId}
              onPaikkaInfoResolved={setPaikkaInfo}
              skipFastForward={skipFastForward}
            />
          </Suspense>
        )}
        {pagePhase === 'sijainti' && paikkaId !== null && (
          <StepSijainti
            paikkaId={paikkaId}
            onNext={() => (websiteUrl ? setPagePhase('wizard') : handleSkip())}
            onPrev={() => {
              // Set flag before navigating back so StepNimiJaURLPrePhase suppresses
              // the lat-based fast-forward on re-mount (F-04 back-loop prevention).
              setSkipFastForward(true)
              setPagePhase('nimi-url')
            }}
          />
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
            <WizardInner
              mode="onboarding"
              brandingData={brandingData}
              confirmedLaji={confirmedLaji}
              onBackToAnalyze={handleBackToPrePhase}
            />
          </Suspense>
        )}
      </div>
    </main>
  )
}
