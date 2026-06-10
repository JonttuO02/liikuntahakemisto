'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'
import { buildDraftAsPaikka, type OnboardingDraft, type PaikkaBase } from '@/lib/onboardingUtils'
import PaikkaKortti from '@/app/components/PaikkaKortti'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'

// NOTE: The full profile sheet component is intentionally NOT imported — it uses position:fixed
// and height:calc(100dvh) which would overlay the entire wizard screen.
// A simplified inline card is rendered instead (see PROFIILISIVU section below).

interface StepEsikatseluProps {
  draft: OnboardingDraft | null
  paikkaInfo: PaikkaBase | null
  onPrev: () => void
}

export default function StepEsikatselu({
  draft,
  paikkaInfo,
  onPrev,
}: StepEsikatseluProps) {
  const t = useTranslations('Business')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build preview object when both draft and paikkaInfo are available
  const draftAsPaikka =
    draft && paikkaInfo ? buildDraftAsPaikka(draft, paikkaInfo) : null

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserSupabase()
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
        body: JSON.stringify({}),
      })

      if (!res.ok) {
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

      {!draftAsPaikka ? (
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

          {/* PROFIILISIVU — simplified inline card (full profile sheet omitted; uses fixed positioning) */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
              {t('previewLabelSheet')}
            </span>
            <div className="glass rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-xl font-bold text-[#111111]">{draftAsPaikka.nimi}</h3>
              {draftAsPaikka.hinta_kuvaus && (
                <p className="text-sm text-[#111111] whitespace-pre-line">
                  {draftAsPaikka.hinta_kuvaus}
                </p>
              )}
              {draftAsPaikka.kuvaus && (
                <p className="text-sm text-[rgba(17,17,17,0.45)] line-clamp-4">
                  {draftAsPaikka.kuvaus}
                </p>
              )}
              {draftAsPaikka.puhelin && (
                <p className="text-sm text-[#111111]">{draftAsPaikka.puhelin}</p>
              )}
            </div>
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
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? t('submitting') : t('submitCta')}
        </motion.button>
      </footer>
    </div>
  )
}
