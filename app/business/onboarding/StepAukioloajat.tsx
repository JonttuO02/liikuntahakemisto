'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import { ORDERED_DAYS } from '@/lib/onboardingUtils'
import { useLivePreview } from '@/lib/livePreview/LivePreviewContext'
import { useDebouncedValue } from '@/lib/livePreview/useDebouncedPreviewField'

// Display-only mapping: English storage keys → Finnish abbreviations
const EN_TO_FI: Record<string, string> = {
  monday: 'Ma',
  tuesday: 'Ti',
  wednesday: 'Ke',
  thursday: 'To',
  friday: 'Pe',
  saturday: 'La',
  sunday: 'Su',
}

type DayState = {
  isOpen: boolean
  open: string
  close: string
}

type HoursState = Record<string, DayState>

type Props = {
  paikkaId: number
  existingAukioloajat: Record<string, { open: string; close: string }> | null | undefined
  initialDraftAukioloajat?: Record<string, { open: string; close: string }> | null
  initialBrandingAukioloajat?: Record<string, { open: string; close: string }> | null
  onNext: () => void
  onPrev: () => void
  editMode?: boolean
  onSaveSuccess?: () => void
  onSaveComplete?: (aukioloajat: Record<string, { open: string; close: string }>) => void
}

const defaultHours = (): HoursState =>
  Object.fromEntries(
    ORDERED_DAYS.map(day => [day, { isOpen: false, open: '', close: '' }])
  )

export default function StepAukioloajat({
  paikkaId,
  existingAukioloajat,
  initialDraftAukioloajat,
  initialBrandingAukioloajat,
  onNext,
  onPrev,
  editMode = false,
  onSaveSuccess,
  onSaveComplete,
}: Props) {
  const t = useTranslations('Business')
  const { dispatch } = useLivePreview()

  const [hours, setHours] = useState<HoursState>(defaultHours)
  const [wasPreFilled, setWasPreFilled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit-mode specific state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false)

  // Onboarding gate: at least one day must be marked open before advancing
  const hasAnyOpenDay = ORDERED_DAYS.some(d => hours[d]?.isOpen)

  // Pre-fill from draft (priority) → branding → Google Places data
  // CRITICAL: all sources use English day keys (monday, tuesday, ...)
  useEffect(() => {
    const source = initialDraftAukioloajat ?? initialBrandingAukioloajat ?? existingAukioloajat
    if (!source) return
    const keys = Object.keys(source)
    if (keys.length === 0) return

    const filled = defaultHours()
    for (const dayKey of ORDERED_DAYS) {
      if (source[dayKey]) {
        filled[dayKey] = {
          isOpen: true,
          open: source[dayKey].open,
          close: source[dayKey].close,
        }
      }
    }
    setHours(filled)
    setWasPreFilled(true)
  }, [initialDraftAukioloajat, initialBrandingAukioloajat, existingAukioloajat])

  function toggleDay(dayKey: string) {
    setHours(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], isOpen: !prev[dayKey].isOpen },
    }))
  }

  function updateTime(dayKey: string, field: 'open' | 'close', value: string) {
    setHours(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }))
  }

  function buildOpenDaysObject(): Record<string, { open: string; close: string }> {
    const openDaysObject: Record<string, { open: string; close: string }> = {}
    for (const dayKey of ORDERED_DAYS) {
      const day = hours[dayKey]
      if (day?.isOpen && day.open && day.close) {
        openDaysObject[dayKey] = { open: day.open, close: day.close }
      }
    }
    return openDaysObject
  }

  // Live-preview wiring (LIVEPREV-01/04): debounced SET_AUKIOLOAJAT dispatch,
  // mirroring buildOpenDaysObject's serialization of open days.
  const debouncedHours = useDebouncedValue(hours, 280)
  useEffect(() => {
    const openDaysObject: Record<string, { open: string; close: string }> = {}
    for (const dayKey of ORDERED_DAYS) {
      const day = debouncedHours[dayKey]
      if (day?.isOpen && day.open && day.close) {
        openDaysObject[dayKey] = { open: day.open, close: day.close }
      }
    }
    dispatch({ type: 'SET_AUKIOLOAJAT', payload: openDaysObject })
  }, [debouncedHours, dispatch])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const openDaysObject = buildOpenDaysObject()

      const res = await fetch('/api/business/update-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          section: 'aukioloajat',
          data: openDaysObject,
        }),
      })

      if (!res.ok) {
        setSaveError(t('errorGeneric'))
        return
      }

      onSaveComplete?.(openDaysObject)
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
      // Build value: only include open days; ORDERED_DAYS whitelist prevents key injection
      const openDaysObject = buildOpenDaysObject()

      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/business/onboarding/save-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          step: 3,
          field: 'aukioloajat',
          value: openDaysObject,
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

  const timeInputClass =
    'border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-9 px-2 ' +
    'text-sm w-24 outline-none [transition:border-color_150ms_var(--ease-out)]'

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-6">
      <h2 className="text-xl font-bold text-[#111111]">{t('stepHours')}</h2>

      <div className="flex flex-col">
        {wasPreFilled && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)] mb-3">
            {t('hoursPrefilledLabel')}
          </span>
        )}

        {ORDERED_DAYS.map(dayKey => {
          const day = hours[dayKey]
          const isOpen = day?.isOpen ?? false

          return (
            <div
              key={dayKey}
              className="flex items-center gap-3 py-3 border-b border-[rgba(0,0,0,0.07)]"
            >
              {/* Day abbreviation */}
              <span className="text-sm font-bold text-[#111111] w-8">
                {EN_TO_FI[dayKey]}
              </span>

              {/* Auki toggle (role="switch") */}
              <button
                type="button"
                role="switch"
                aria-checked={isOpen}
                aria-label={t('hoursToggleLabel')}
                onClick={() => toggleDay(dayKey)}
                className={`w-10 h-6 rounded-full flex-shrink-0 [transition:background-color_150ms_var(--ease-out)] ${
                  isOpen ? 'bg-[#111111]' : 'bg-[rgba(17,17,17,0.12)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white block transition-transform ${
                    isOpen ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {isOpen ? (
                <>
                  <label className="sr-only" htmlFor={`${dayKey}-open`}>
                    Aloitusaika
                  </label>
                  <input
                    id={`${dayKey}-open`}
                    type="time"
                    className={timeInputClass}
                    value={day.open}
                    onChange={e => updateTime(dayKey, 'open', e.target.value)}
                  />
                  <span className="text-sm text-[rgba(17,17,17,0.45)]">–</span>
                  <label className="sr-only" htmlFor={`${dayKey}-close`}>
                    Lopetusaika
                  </label>
                  <input
                    id={`${dayKey}-close`}
                    type="time"
                    className={timeInputClass}
                    value={day.close}
                    onChange={e => updateTime(dayKey, 'close', e.target.value)}
                  />
                </>
              ) : (
                <span className="text-sm text-[rgba(17,17,17,0.35)]">
                  {t('hoursClosed')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {editMode && saveSuccessVisible && (
          <motion.p
            key="hours-save-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-green-600"
            role="status"
            aria-live="polite"
          >
            {t('saveSuccess')}
          </motion.p>
        )}
        {(editMode ? saveError : error) && (
          <motion.p
            key="hours-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {editMode ? saveError : error}
          </motion.p>
        )}
      </AnimatePresence>

      <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
        <button
          type="button"
          onClick={onPrev}
          className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1"
        >
          {t('prevCta')}
        </button>
        {editMode ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
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
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={loading || !hasAnyOpenDay}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              t('nextCta')
            )}
          </motion.button>
        )}
      </footer>
    </div>
  )
}
