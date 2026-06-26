'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import { useLivePreview } from '@/lib/livePreview/LivePreviewContext'
import { useDebouncedValue } from '@/lib/livePreview/useDebouncedPreviewField'

interface StepYhteystiedotProps {
  paikkaId: number
  onNext: () => void
  onPrev: () => void
  initialYhteystiedot?: {
    puhelin?: string
    email?: string
    website?: string
    kuvaus?: string
  } | null
  editMode?: boolean
  onSaveSuccess?: () => void
  onSaveComplete?: (data: { puhelin: string; email: string; website: string; kuvaus: string }) => void
}

const inputClass =
  'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full [transition:border-color_150ms_var(--ease-out)]'

export default function StepYhteystiedot({
  paikkaId,
  onNext,
  onPrev,
  initialYhteystiedot,
  editMode = false,
  onSaveSuccess,
  onSaveComplete,
}: StepYhteystiedotProps) {
  const t = useTranslations('Business')
  const { dispatch } = useLivePreview()

  const [puhelin, setPuhelin] = useState(initialYhteystiedot?.puhelin ?? '')
  const [email, setEmail] = useState(initialYhteystiedot?.email ?? '')
  const [website, setWebsite] = useState(initialYhteystiedot?.website ?? '')
  const [kuvaus, setKuvaus] = useState(initialYhteystiedot?.kuvaus ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live-preview wiring (LIVEPREV-01/04): debounced SET_YHTEYSTIEDOT dispatch.
  const debouncedYhteystiedot = useDebouncedValue({ puhelin, email, website, kuvaus }, 280)
  useEffect(() => {
    dispatch({ type: 'SET_YHTEYSTIEDOT', payload: debouncedYhteystiedot })
  }, [debouncedYhteystiedot, dispatch])

  // Edit-mode specific state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false)

  const descCount = kuvaus.length
  const isAtLimit = descCount >= 300

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/business/update-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          section: 'yhteystiedot',
          data: {
            puhelin: puhelin.trim(),
            email: email.trim(),
            varauslinkki: website.trim(),
            kuvaus: kuvaus.trim(),
          },
        }),
      })

      if (!res.ok) {
        setSaveError(t('errorGeneric'))
        return
      }

      onSaveComplete?.({ puhelin: puhelin.trim(), email: email.trim(), website: website.trim(), kuvaus: kuvaus.trim() })
      setSaveSuccessVisible(true)
      setTimeout(() => {
        setSaveSuccessVisible(false)
        onSaveSuccess?.()
      }, 2000)
    } catch {
      setSaveError(t('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError(t('errorGeneric'))
        return
      }

      const res = await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 4,
          field: 'yhteystiedot',
          value: {
            puhelin: puhelin.trim(),
            email: email.trim(),
            kuvaus: kuvaus.trim(),
          },
        }),
      })

      if (!res.ok) {
        setError(t('errorGeneric'))
        return
      }

      onNext()
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-[#111111] mb-4">{t('stepContact')}</h2>

      <div className="flex flex-col gap-4">
        {/* Puhelinnumero */}
        <input
          type="tel"
          placeholder={t('contactPhonePlaceholder')}
          value={puhelin}
          onChange={e => setPuhelin(e.target.value)}
          disabled={loading}
          className={inputClass}
        />

        {/* Sähköposti */}
        <input
          type="email"
          placeholder={t('contactEmailPlaceholder')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          className={inputClass}
        />

        {/* Website — visible only in edit mode; collected in StepNimiJaURL during onboarding */}
        {editMode && (
          <input
            type="url"
            placeholder={t('contactWebsitePlaceholder')}
            value={website}
            onChange={e => setWebsite(e.target.value)}
            disabled={loading}
            className={inputClass}
          />
        )}

        {/* Kuvaus + merkkimäärälaskuri */}
        <div className="flex flex-col gap-1">
          <textarea
            id="kuvaus-textarea"
            aria-describedby="kuvaus-counter"
            placeholder={t('contactDescPlaceholder')}
            value={kuvaus}
            onChange={e => setKuvaus(e.target.value)}
            maxLength={300}
            rows={4}
            disabled={loading}
            className="border border-[rgba(0,0,0,0.12)] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] w-full resize-none disabled:opacity-60 [transition:border-color_150ms_var(--ease-out)]"
          />
          <span
            id="kuvaus-counter"
            className={
              isAtLimit
                ? 'text-[10px] font-bold text-red-600'
                : 'text-[10px] font-bold text-[rgba(17,17,17,0.45)]'
            }
          >
            {t('contactDescCount', { n: descCount })}
          </span>
        </div>

        {/* Virheviesti / tallennettu */}
        <AnimatePresence>
          {editMode && saveSuccessVisible && (
            <motion.p
              key="contact-save-success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              role="status"
              aria-live="polite"
              className="text-sm text-green-600"
            >
              {t('saveSuccess')}
            </motion.p>
          )}
          {(editMode ? saveError : error) && (
            <motion.p
              key="contact-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {editMode ? saveError : error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)] mt-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={loading || saving}
          className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
        >
          {t('prevCta')}
        </button>

        {editMode ? (
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {saving ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              t('saveCta')
            )}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={handleNext}
            disabled={loading}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading
              ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
              : t('submitCta')
            }
          </motion.button>
        )}
      </footer>
    </div>
  )
}
