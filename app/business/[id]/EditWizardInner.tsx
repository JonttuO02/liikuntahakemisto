'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Liikuntapaikka } from '@/lib/types'
import StepMediat from '../onboarding/StepMediat'
import StepHinnasto from '../onboarding/StepHinnasto'
import StepAukioloajat from '../onboarding/StepAukioloajat'
import StepYhteystiedot from '../onboarding/StepYhteystiedot'

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
          <StepMediat
            paikkaId={paikkaId}
            initialPaikka={paikka}
            editMode={true}
            onNext={() => router.push('/business/' + paikkaId + '?step=3')}
            onPrev={() => router.push('/business/' + paikkaId + '?step=1')}
            onSaveSuccess={() => {}}
          />
        )}
        {currentStep === '3' && (
          <StepHinnasto
            paikkaId={paikkaId}
            editMode={true}
            initialHinnasto={null}
            onNext={() => router.push('/business/' + paikkaId + '?step=4')}
            onPrev={() => router.push('/business/' + paikkaId + '?step=2')}
          />
        )}
        {currentStep === '4' && (
          <StepAukioloajat
            paikkaId={paikkaId}
            editMode={true}
            existingAukioloajat={(paikka.aukioloajat as Record<string, { open: string; close: string }> | null) ?? null}
            initialDraftAukioloajat={null}
            onNext={() => router.push('/business/' + paikkaId + '?step=5')}
            onPrev={() => router.push('/business/' + paikkaId + '?step=3')}
          />
        )}
        {currentStep === '5' && (
          <StepYhteystiedot
            paikkaId={paikkaId}
            editMode={true}
            initialYhteystiedot={{ puhelin: paikka.puhelin ?? '', website: paikka.varauslinkki ?? '', kuvaus: paikka.kuvaus ?? '' }}
            onNext={() => router.push('/business/' + paikkaId + '?step=1')}
            onPrev={() => router.push('/business/' + paikkaId + '?step=4')}
          />
        )}
      </div>
    </div>
  )
}
