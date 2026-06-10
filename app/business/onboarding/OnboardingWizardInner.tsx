'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'
import type { OnboardingDraft } from '@/lib/onboardingUtils'
import ProgressBar from './ProgressBar'
import StepPaikka from './StepPaikka'
import StepMediat from './StepMediat'
import StepHinnasto from './StepHinnasto'
import StepAukioloajat from './StepAukioloajat'
import StepYhteystiedot from './StepYhteystiedot'
import StepEsikatselu from './StepEsikatselu'

type PaikkaInfo = {
  nimi: string
  osoite: string | null
  kaupunki: string | null
  laji: string
  latitude: number | null
  longitude: number | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
}

export default function OnboardingWizardInner() {
  const t = useTranslations('Business')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<OnboardingDraft | null>(null)
  const [paikkaId, setPaikkaId] = useState<number | null>(null)
  const [paikkaInfo, setPaikkaInfo] = useState<PaikkaInfo | null>(null)

  // URL-based step routing (D-02)
  const step = parseInt(searchParams.get('step') ?? '1', 10)

  function goToStep(n: number) {
    router.push('/business/onboarding?step=' + n)
  }

  // completedSteps: steps 1 through current_step-1
  const completedSteps: number[] = draft?.current_step && draft.current_step > 1
    ? Array.from({ length: draft.current_step - 1 }, (_, i) => i + 1)
    : []

  useEffect(() => {
    async function loadDraft() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Try to get paikka_id from URL param first
      const urlPaikkaId = searchParams.get('paikka_id')
      let resolvedPaikkaId: number | null = urlPaikkaId ? parseInt(urlPaikkaId, 10) : null

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

      // Load existing draft
      const { data: existingDraft } = await supabase
        .from('onboarding_draft')
        .select('*')
        .eq('business_account_id', user.id)
        .maybeSingle()

      if (existingDraft) {
        setDraft(existingDraft as OnboardingDraft)
        // Resume from last saved step if further than current URL step
        if (existingDraft.current_step && existingDraft.current_step > 1 && step === 1) {
          goToStep(existingDraft.current_step)
        }
      }

      // Apply draft fallback: use draft.paikka_id when URL and links both yield nothing
      resolvedPaikkaId = resolvedPaikkaId ?? existingDraft?.paikka_id ?? null
      setPaikkaId(resolvedPaikkaId)

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

  // Step 1 is read-only — no draft save needed
  function saveAndAdvance(stepNum: number) {
    goToStep(stepNum + 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <ProgressBar
          currentStep={step}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <StepPaikka
                paikkaInfo={paikkaInfo}
                paikkaId={paikkaId}
                onNext={() => saveAndAdvance(1)}
              />
            )}
            {step === 2 && paikkaId !== null && (
              <StepMediat
                paikkaId={paikkaId}
                onNext={() => saveAndAdvance(2)}
                onPrev={() => goToStep(1)}
              />
            )}
            {step === 3 && paikkaId !== null && (
              <StepHinnasto
                paikkaId={paikkaId}
                onNext={() => saveAndAdvance(3)}
                onPrev={() => goToStep(2)}
              />
            )}
            {step === 4 && paikkaId !== null && (
              <StepAukioloajat
                paikkaId={paikkaId}
                existingAukioloajat={paikkaInfo?.aukioloajat}
                onNext={() => saveAndAdvance(4)}
                onPrev={() => goToStep(3)}
              />
            )}
            {step === 5 && paikkaId !== null && (
              <StepYhteystiedot
                paikkaId={paikkaId}
                onNext={() => saveAndAdvance(5)}
                onPrev={() => goToStep(4)}
              />
            )}
            {step === 6 && (
              <StepEsikatselu
                draft={draft}
                paikkaInfo={paikkaInfo}
                onPrev={() => goToStep(5)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
