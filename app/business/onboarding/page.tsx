import { Suspense } from 'react'
import OnboardingWizardInner from './OnboardingWizardInner'

export default function OnboardingWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
        </div>
      }
    >
      <OnboardingWizardInner />
    </Suspense>
  )
}
