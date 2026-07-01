'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WizardInner from '../WizardInner'
import { LajiPicker } from './AnalysoiSivusto'
import StepNimiJaURL from './StepNimiJaURL'
import StepSijainti from './StepSijainti'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { type BrandingResult } from '@/lib/branding/brandingResult'
import { type PaikkaBase } from '@/lib/onboardingUtils'

type PagePhase = 'nimi-url' | 'sijainti' | 'laji-skip' | 'waiting' | 'wizard'

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
  skipFastForward = false,
}: {
  onNext: (websiteUrl: string | null, alreadyHasLocation?: boolean, resolvedPaikkaId?: number) => void
  onPaikkaIdResolved: (paikkaId: number) => void
  skipFastForward?: boolean
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaBase | null>(null)
  // Show spinner until resolution is complete so the user never sees a flash of the URL form
  // when navigating here from ClaimSearchForm (auto-skip path) or fast-forward (lat already set).
  const [resolving, setResolving] = useState(true)

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
          // Fast-forward: if location is already set, skip sijainti for resuming users.
          // Re-hydrate websiteUrl from draft so wizard/laji-skip routing is correct (F-02/F-03).
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
            onNext(savedWebsite, true, resolved)
            return
          }
          // Auto-skip nimi-url step when URL was already provided at creation time (ClaimSearchForm)
          const urlParam = searchParams.get('website_url')
          if (urlParam) {
            onNext(urlParam, false, resolved)
            return
          }
        }
      }

      // Resolution done — no auto-skip path taken, show the nimi-url form
      if (!cancelled) setResolving(false)
    }

    resolvePaikkaIdAndInfo()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (resolving) return <PreVaiheSpinner />
  return <StepNimiJaURL paikkaInfo={paikkaInfo} paikkaId={paikkaId} onNext={onNext} />
}

// WaitingForAI — polls analyze-website GET until status==='analyzed', then hands brandingData
// to parent so WizardInner mounts with pre-filled AI data. On failure or timeout it shows a
// distinct failure state with an explicit retry, instead of silently reverting to skip.
function WaitingForAI({
  paikkaId,
  onReady,
  onSkip,
  onRetry,
}: {
  paikkaId: number
  onReady: (data: BrandingResult) => void
  onSkip: () => void
  onRetry: () => void
}) {
  const cancelledRef = useRef(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    cancelledRef.current = false
    setFailed(false)

    async function run() {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      let pollCount = 0
      // 40-second worst-case client-side ceiling (20 polls x 2s). Reduced from 30 — the
      // route's server-side staleness self-heal (STALE_ANALYZING_MS=12s) now resolves most
      // stuck runs well before this ceiling is reached.
      const MAX_POLLS = 20

      while (!cancelledRef.current && pollCount < MAX_POLLS) {
        try {
          const res = await fetch(`/api/business/analyze-website?paikka_id=${paikkaId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = (await res.json()) as BrandingResult
            if (data.status === 'analyzed') {
              if (!cancelledRef.current) onReady(data)
              return
            }
            if (data.status === 'failed') {
              if (!cancelledRef.current) setFailed(true)
              return
            }
          }
        } catch {
          // ignore network errors, keep polling
        }
        pollCount++
        if (!cancelledRef.current && pollCount < MAX_POLLS) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }

      if (!cancelledRef.current) setFailed(true)
    }

    run()
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  function handleRetryClick() {
    onRetry()
    setAttempt(a => a + 1)
  }

  if (failed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-sm text-[rgba(17,17,17,0.45)]">
          Analyysi epäonnistui tai kesti liian kauan.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleRetryClick}
            className="text-sm font-bold text-[#111111] bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.08)] transition-colors rounded-full px-4 py-2"
          >
            Yritä uudelleen
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
          >
            Ohita
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="w-8 h-8 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      <p className="text-sm text-[rgba(17,17,17,0.45)]">Analysoidaan sivustoasi...</p>
      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
      >
        Ohita
      </button>
    </div>
  )
}

export default function OnboardingWizardPage() {
  const [pagePhase, setPagePhase] = useState<PagePhase>('nimi-url')
  const [brandingData, setBrandingData] = useState<BrandingResult | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  // Display-only: the laji confirmed/picked in AnalysoiSivusto (Vahvista/Vaihda) or the D-06
  // skip-path picker, threaded into WizardInner so its live preview / Step 1 card show the
  // just-picked value instead of the stale pre-onboarding liikuntapaikat.laji — the actual DB
  // write still only happens at final submit (D-04), this never feeds any extra persistence.
  const [confirmedLaji, setConfirmedLaji] = useState<string | null>(null)
  // Website URL entered on step 1; persisted to draft + triggers background AI analysis.
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null)
  // Guards against double-triggering the AI analysis on Back+Next cycles (F-07).
  const [aiTriggered, setAiTriggered] = useState(false)
  // Suppresses the fast-forward in StepNimiJaURLPrePhase when the user explicitly navigated
  // back from sijainti — prevents a re-mount loop when lat is already set (F-04).
  const [skipFastForward, setSkipFastForward] = useState(false)

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
  // skip sijainti entirely and route directly to wizard or laji-skip (F-02/F-03).
  // resolvedPaikkaId is passed explicitly from StepNimiJaURLPrePhase to avoid the stale-closure
  // problem: when auto-skip fires (ClaimSearchForm path), the parent paikkaId state hasn't been
  // committed yet, so the closure would capture null. The child resolves the real id first and
  // passes it here so AI triggering + draft persistence work correctly.
  async function handleNimiUrlNext(url: string | null, alreadyHasLocation = false, resolvedPaikkaId?: number) {
    const effectivePaikkaId = resolvedPaikkaId ?? paikkaId
    setWebsiteUrl(url)
    setSkipFastForward(false) // user navigated forward — reset back-navigation guard (F-04)
    if (alreadyHasLocation) {
      // Re-hydrate brandingData on resume/refresh — the React state is lost on page reload
      // but the analysis result lives in the DB. Fetch it now so StepBrandingPick shows.
      if (url && effectivePaikkaId !== null) {
        try {
          const supabase = createBusinessBrowserClient()
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token ?? ''
          const res = await fetch(`/api/business/analyze-website?paikka_id=${effectivePaikkaId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const data = (await res.json()) as BrandingResult
            if (data.status === 'analyzed') setBrandingData(data)
          }
        } catch { /* non-blocking — wizard shows without AI data if fetch fails */ }
      }
      setPagePhase(url ? 'wizard' : 'laji-skip')
    } else {
      setPagePhase('sijainti')
    }
    if (url && effectivePaikkaId !== null) {
      const supabase = createBusinessBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      if (!aiTriggered) {
        // Fire-and-forget: background AI analysis (CORRECT route: analyze-website, not ai-analyze).
        // Guarded by aiTriggered so a Back+Next cycle does not re-fire a duplicate request (F-07).
        // In the ClaimSearchForm path, AI was already fired before redirect — this becomes a no-op
        // because the endpoint is idempotent; the guard still prevents double-fire on Back+Next.
        fetch('/api/business/analyze-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ url, paikka_id: effectivePaikkaId }),
        })
        setAiTriggered(true)
      }
      // Persist website URL to draft so submit route can write it to varauslinkki (Pitfall 2).
      // Not guarded — always re-persist on retry so the URL is saved even when AI is skipped.
      fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paikka_id: effectivePaikkaId,
          step: 0,
          field: 'yhteystiedot',
          value: { website: url },
        }),
      })
    }
  }

  // Wizard step 1's "back" button returns here from page.tsx (Pitfall 8).
  function handleBackToPrePhase() {
    setPagePhase(websiteUrl ? 'sijainti' : 'laji-skip')
  }

  // handleRunAnalysis: invoked by WizardInner's step-1 "Analysoi →" button (and by
  // WaitingForAI's "Yritä uudelleen" retry). Fixes UAT gap 3's first missing item — the old
  // onRunAnalysis prop only flipped pagePhase to 'waiting' without ever starting an analysis,
  // so WaitingForAI polled a resource that was never triggered. Mirrors handleNimiUrlNext's
  // AI-trigger fetch shape exactly (same POST body/headers), just invoked from the wizard's
  // manual (re)trigger path instead of the step-0 auto-trigger path.
  async function handleRunAnalysis() {
    // Defensive — mirrors canRunAnalysis's own gate; not reachable in practice since the
    // button that calls this is only rendered when that gate is already true.
    if (!websiteUrl || paikkaId === null) return
    setPagePhase('waiting')
    const supabase = createBusinessBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    fetch('/api/business/analyze-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ url: websiteUrl, paikka_id: paikkaId }),
    })
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {pagePhase === 'nimi-url' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <StepNimiJaURLPrePhase
              onNext={handleNimiUrlNext}
              onPaikkaIdResolved={setPaikkaId}
              skipFastForward={skipFastForward}
            />
          </Suspense>
        )}
        {pagePhase === 'sijainti' && paikkaId !== null && (
          <StepSijainti
            paikkaId={paikkaId}
            onNext={() => setPagePhase(websiteUrl ? 'waiting' : 'laji-skip')}
            onPrev={() => {
              // Set flag before navigating back so StepNimiJaURLPrePhase suppresses
              // the lat-based fast-forward on re-mount (F-04 back-loop prevention).
              setSkipFastForward(true)
              setPagePhase('nimi-url')
            }}
          />
        )}
        {pagePhase === 'waiting' && paikkaId !== null && (
          <WaitingForAI
            paikkaId={paikkaId}
            onReady={(data) => { setBrandingData(data); setPagePhase('wizard') }}
            onSkip={() => { setBrandingData(null); setPagePhase('wizard') }}
            onRetry={handleRunAnalysis}
          />
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
              canRunAnalysis={!brandingData && !!websiteUrl && paikkaId !== null}
              onRunAnalysis={handleRunAnalysis}
            />
          </Suspense>
        )}
      </div>
    </main>
  )
}
