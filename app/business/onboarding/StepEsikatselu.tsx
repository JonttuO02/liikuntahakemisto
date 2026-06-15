'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import { buildDraftAsPaikka, type OnboardingDraft, type PaikkaBase } from '@/lib/onboardingUtils'
import PaikkaKortti from '@/app/components/PaikkaKortti'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import { type BrandingResult } from '@/lib/branding/brandingResult'

interface StepEsikatseluProps {
  draft: OnboardingDraft | null
  paikkaInfo: PaikkaBase | null
  brandingData?: BrandingResult | null
  onPrev: () => void
}

export default function StepEsikatselu({
  draft,
  paikkaInfo,
  brandingData: _brandingData,
  onPrev,
}: StepEsikatseluProps) {
  const t = useTranslations('Business')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadTimedOut, setLoadTimedOut] = useState(false)

  // Build preview object when both draft and paikkaInfo are available
  const draftAsPaikka =
    draft && paikkaInfo ? buildDraftAsPaikka(draft, paikkaInfo) : null

  useEffect(() => {
    if (draftAsPaikka) return
    const timer = setTimeout(() => setLoadTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [draftAsPaikka])

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError(t('errorSubmitFailed'))
        return
      }

      const res = await fetch('/api/business/onboarding/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paikka_id: draft?.paikka_id }),
      })

      if (!res.ok) {
        try { console.error('[submit] server error:', await res.clone().json()) } catch {}
        setError(t('errorSubmitFailed'))
        return
      }

      const data = await res.json()
      if (data.ok) {
        router.push('/business')
      } else {
        setError(t('errorSubmitFailed'))
      }
    } catch {
      setError(t('errorSubmitFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-[#111111] mb-4">{t('stepPreview')}</h2>

      {loadTimedOut && !draftAsPaikka ? (
        <p className="text-sm text-red-600 text-center py-8">
          Esikatselu ei latautunut. Palaa takaisin ja yritä uudelleen.
        </p>
      ) : !draftAsPaikka ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* LISTAKORTTI */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
              {t('previewLabelCard')}
            </span>
            <PaikkaKortti paikka={draftAsPaikka} />
          </div>

          {/* DIAGONAALIKORTTI */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
              {t('previewLabelDiag')}
            </span>
            <DiagonaalKortti paikka={draftAsPaikka} />
          </div>

          {/* PROFIILISIVU */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
              {t('previewLabelSheet')}
            </span>
            <PaikkaSheet paikka={draftAsPaikka} preview={true} todo={false} onClose={() => {}} onToggleTodo={() => {}} />
          </div>

          {/* Virheviesti */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="submit-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                role="alert"
                aria-live="polite"
                className="text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)] mt-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={loading}
          className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
        >
          {t('prevCta')}
        </button>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !draftAsPaikka}
          whileTap={{ scale: 0.95 }}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? t('submitting') : t('submitCta')}
        </motion.button>
      </footer>
    </div>
  )
}
