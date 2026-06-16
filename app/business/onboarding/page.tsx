'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WizardInner from '../WizardInner'
import AnalysoiSivusto from './AnalysoiSivusto'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { type BrandingResult } from '@/lib/branding/brandingResult'

type PagePhase = 'pre' | 'wizard'

function PreVaiheSpinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
    </div>
  )
}

// PrePhase resolves paikka_id (URL param first, then business_paikka_links lookup) — this
// component is the Suspense-boundary DESCENDANT that calls useSearchParams(), mirroring
// WizardInner's OnboardingMode pattern exactly. OnboardingWizardPage (the parent that
// instantiates the boundary) must never call useSearchParams() itself.
function PrePhase({
  onConfirm,
  onSkip,
}: {
  onConfirm: (result: BrandingResult) => void
  onSkip: () => void
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

      if (!cancelled) setPaikkaId(resolved)
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
  const [pagePhase, setPagePhase] = useState<PagePhase>('pre')
  const [brandingData, setBrandingData] = useState<BrandingResult | null>(null)

  function handleConfirm(result: BrandingResult) {
    setBrandingData(result)
    setPagePhase('wizard')
  }

  function handleSkip() {
    setBrandingData(null)
    setPagePhase('wizard')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {pagePhase === 'pre' && (
          <Suspense fallback={<PreVaiheSpinner />}>
            <PrePhase onConfirm={handleConfirm} onSkip={handleSkip} />
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
