'use client'

import { useState, Suspense } from 'react'
import WizardInner from '../WizardInner'
import AnalysoiSivusto from './AnalysoiSivusto'
import { type BrandingResult } from '@/lib/branding/brandingResult'

type PagePhase = 'pre' | 'wizard'

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
          <AnalysoiSivusto onConfirm={handleConfirm} onSkip={handleSkip} />
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
