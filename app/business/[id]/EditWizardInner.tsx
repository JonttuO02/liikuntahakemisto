'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Liikuntapaikka } from '@/lib/types'

interface EditWizardInnerProps {
  paikka: Liikuntapaikka
  paikkaId: number
}

export default function EditWizardInner({ paikka, paikkaId }: EditWizardInnerProps) {
  const t = useTranslations('Business')
  const searchParams = useSearchParams()
  const router = useRouter()

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
      <div className="flex gap-2 flex-wrap">
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
          <div className="text-sm text-[rgba(17,17,17,0.45)] p-6">{/* TODO: wire StepMediat editMode in 36-05 */}Lataa...</div>
        )}
        {currentStep === '3' && (
          <div className="text-sm text-[rgba(17,17,17,0.45)] p-6">{/* TODO: wire StepHinnasto editMode in 36-06 */}Lataa...</div>
        )}
        {currentStep === '4' && (
          <div className="text-sm text-[rgba(17,17,17,0.45)] p-6">{/* TODO: wire StepAukioloajat editMode in 36-06 */}Lataa...</div>
        )}
        {currentStep === '5' && (
          <div className="text-sm text-[rgba(17,17,17,0.45)] p-6">{/* TODO: wire StepYhteystiedot editMode in 36-06 */}Lataa...</div>
        )}
      </div>
    </div>
  )
}
